/* 七夕 · 鹊桥仙 —— 通用工具
 * 数学 / 缓动 / 噪声 / 辉光精灵缓存 / 极简音效
 */
(function (global) {
  'use strict';

  var Q = global.Q || (global.Q = {});

  Q.TAU = Math.PI * 2;

  /* ---------- 随机与数学 ---------- */

  Q.rand = function (min, max) {
    if (max === undefined) { max = min; min = 0; }
    return min + Math.random() * (max - min);
  };

  Q.randInt = function (min, max) {
    return Math.floor(Q.rand(min, max + 1));
  };

  Q.pick = function (arr) {
    return arr[(Math.random() * arr.length) | 0];
  };

  Q.clamp = function (v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  };

  Q.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  Q.smoothstep = function (e0, e1, x) {
    var t = Q.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ---------- 缓动 ---------- */

  Q.ease = {
    linear:     function (t) { return t; },
    inQuad:     function (t) { return t * t; },
    outQuad:    function (t) { return 1 - (1 - t) * (1 - t); },
    outCubic:   function (t) { return 1 - Math.pow(1 - t, 3); },
    outQuint:   function (t) { return 1 - Math.pow(1 - t, 5); },
    inOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    inOutSine:  function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outBack:    function (t) {
      var c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  };

  /* ---------- 值噪声 / fbm ---------- */

  Q.makeNoise2D = function (seed) {
    var s = Math.imul(seed | 0, 2654435761) | 0;

    function h(x, y) {
      var n = (Math.imul(x | 0, 1597334677) ^ Math.imul(y | 0, 3812015801) ^ s) | 0;
      n = Math.imul(n ^ (n >>> 15), 2246822519);
      n = Math.imul(n ^ (n >>> 13), 3266489917);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
    }

    return function (x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf);
      var v = yf * yf * (3 - 2 * yf);
      var a = h(xi, yi),     b = h(xi + 1, yi);
      var c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
      return Q.lerp(Q.lerp(a, b, u), Q.lerp(c, d, u), v);
    };
  };

  Q.fbm = function (noise, x, y, octaves) {
    var amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (var i = 0; i < (octaves || 4); i++) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };

  /* ---------- 银河「河道」中心线 ----------
   * ny: 归一化纵坐标 0~1；返回该高度上银河中心的横坐标
   */
  Q.riverX = function (ny, W) {
    return W * (0.5
      + 0.075 * Math.sin(ny * 2.1 + 0.7)
      + 0.022 * Math.sin(ny * 5.3 + 2.1));
  };

  /* ---------- 辉光精灵（避免昂贵的 shadowBlur） ---------- */

  var glowCache = Object.create(null);

  Q.glowSprite = function (rgb) {
    var spr = glowCache[rgb];
    if (spr) return spr;

    var size = 128, r = size / 2;
    spr = document.createElement('canvas');
    spr.width = spr.height = size;
    var g = spr.getContext('2d');
    var grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0.00, 'rgba(' + rgb + ',1)');
    grd.addColorStop(0.10, 'rgba(' + rgb + ',0.72)');
    grd.addColorStop(0.24, 'rgba(' + rgb + ',0.30)');
    grd.addColorStop(0.50, 'rgba(' + rgb + ',0.075)');
    grd.addColorStop(1.00, 'rgba(' + rgb + ',0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    glowCache[rgb] = spr;
    return spr;
  };

  /* 以 (x,y) 为中心、radius 为半径叠加一团辉光 */
  Q.glow = function (ctx, rgb, x, y, radius, alpha) {
    if (alpha <= 0 || radius <= 0) return;
    var spr = Q.glowSprite(rgb);
    var prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * Q.clamp(alpha, 0, 1);
    ctx.drawImage(spr, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = prev;
  };

  /* ---------- 二次贝塞尔 ---------- */

  Q.qbez = function (p0, cp, p1, t, out) {
    var mt = 1 - t;
    var a = mt * mt, b = 2 * mt * t, c = t * t;
    out = out || {};
    out.x = a * p0.x + b * cp.x + c * p1.x;
    out.y = a * p0.y + b * cp.y + c * p1.y;
    return out;
  };

  Q.qbezAngle = function (p0, cp, p1, t) {
    var mt = 1 - t;
    var dx = 2 * mt * (cp.x - p0.x) + 2 * t * (p1.x - cp.x);
    var dy = 2 * mt * (cp.y - p0.y) + 2 * t * (p1.y - cp.y);
    return Math.atan2(dy, dx);
  };

  /* ---------- 极简音效：五声音阶拨弦 ---------- */

  Q.sound = {
    enabled: true,
    ctx: null,
    _last: 0,

    init: function () {
      if (this.ctx) return this.ctx;
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { this.ctx = new AC(); } catch (e) { return null; }
      return this.ctx;
    },

    // 宫商角徵羽 + 八度
    scale: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21],

    pluck: function (degree, gainScale) {
      if (!this.enabled) return;
      var ac = this.init();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume();

      var now = ac.currentTime;
      if (now - this._last < 0.035) return;   // 防止同帧堆叠爆音
      this._last = now;

      var semi = this.scale[Q.clamp(degree | 0, 0, this.scale.length - 1)];
      var freq = 293.66 * Math.pow(2, semi / 12);   // D4 起
      var g = gainScale === undefined ? 1 : gainScale;

      var out = ac.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.16 * g, now + 0.012);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      out.connect(ac.destination);

      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2600, now);
      lp.frequency.exponentialRampToValueAtTime(700, now + 1.4);
      lp.connect(out);

      [[1, 1, 0], [2, 0.28, 1.6], [3, 0.11, -2.4]].forEach(function (h) {
        var o = ac.createOscillator();
        var og = ac.createGain();
        o.type = h[0] === 1 ? 'triangle' : 'sine';
        o.frequency.value = freq * h[0];
        o.detune.value = h[2];
        og.gain.value = h[1];
        o.connect(og); og.connect(lp);
        o.start(now);
        o.stop(now + 2.0);
      });
    }
  };

})(window);
