/* 七夕 · 鹊桥仙 —— 粒子系统
 * 花瓣 / 萤火 / 心形烟花 / 相会光爆 / 孔明灯
 */
(function (Q) {
  'use strict';

  var TAU = Q.TAU;

  /* ------------------------------------------------------------------ */
  /* 心形参数曲线                                                        */
  /* ------------------------------------------------------------------ */
  function heartPoint(a, out) {
    var s = Math.sin(a), c = Math.cos(a);
    out.x = 16 * s * s * s;
    out.y = -(13 * c - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 花瓣                                                                */
  /* ------------------------------------------------------------------ */

  function Petals(W, H) {
    this.W = W; this.H = H;
    this.list = [];
    this.spawnAcc = 0;
    this.rate = Q.clamp(W / 700, 0.5, 2.2) * 2.6;   // 每秒生成数
  }

  Petals.prototype.resize = function (W, H) { this.W = W; this.H = H; };

  Petals.prototype.spawn = function (above) {
    var W = this.W, H = this.H;
    this.list.push({
      x: Q.rand(-40, W + 40),
      y: above === undefined ? Q.rand(-120, -10) : above,
      vx: Q.rand(-16, 16),
      vy: Q.rand(16, 40),
      s: Q.rand(2.2, 5.0),
      rot: Q.rand(0, TAU),
      vr: Q.rand(-1.5, 1.5),
      sway: Q.rand(0.5, 1.6),
      ph: Q.rand(0, TAU),
      tone: Math.random(),
      a: 0,
      life: 0,
      max: Q.rand(11, 20),
      flip: Q.rand(0.6, 2.0)
    });
  };

  Petals.prototype.update = function (dt, intensity) {
    this.spawnAcc += dt * this.rate * intensity;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.list.length < 240) this.spawn();
    }
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.life += dt;
      if (p.life > p.max || p.y > this.H + 60) { this.list.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(p.life * p.sway + p.ph) * 26) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.a = Q.smoothstep(0, 1.2, p.life) * (1 - Q.smoothstep(p.max - 2.4, p.max, p.life));
    }
  };

  Petals.prototype.draw = function (ctx) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i];
      if (p.a <= 0.02) continue;
      var squash = Math.abs(Math.cos(p.life * p.flip + p.ph)) * 0.75 + 0.25;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, squash);
      ctx.globalAlpha = p.a * 0.62;

      var col = p.tone > 0.62
        ? '255,214,228'
        : (p.tone > 0.28 ? '255,236,240' : '250,224,206');
      ctx.fillStyle = 'rgba(' + col + ',0.92)';

      for (var k = 0; k < 5; k++) {
        ctx.save();
        ctx.rotate(k * TAU / 5);
        ctx.beginPath();
        ctx.ellipse(0, -p.s * 0.62, p.s * 0.34, p.s * 0.62, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(255,206,140,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, p.s * 0.19, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------------------ */
  /* 萤火（缓缓上浮的光点）                                              */
  /* ------------------------------------------------------------------ */

  function Motes(W, H) {
    this.W = W; this.H = H;
    this.list = [];
    var n = Math.round(Q.clamp(W * H / 22000, 26, 90));
    for (var i = 0; i < n; i++) this.list.push(this._make(true));
  }

  Motes.prototype._make = function (anywhere) {
    return {
      x: Q.rand(0, this.W),
      y: anywhere ? Q.rand(this.H * 0.2, this.H) : this.H + Q.rand(4, 60),
      vy: -Q.rand(6, 26),
      r: Q.rand(0.7, 2.2),
      sway: Q.rand(0.3, 1.1),
      ph: Q.rand(0, TAU),
      base: Q.rand(0.25, 0.8),
      warm: Math.random() > 0.32
    };
  };

  Motes.prototype.resize = function (W, H) { this.W = W; this.H = H; };

  Motes.prototype.update = function (dt, t) {
    for (var i = 0; i < this.list.length; i++) {
      var m = this.list[i];
      m.y += m.vy * dt;
      m.x += Math.sin(t * m.sway + m.ph) * 9 * dt;
      if (m.y < -30) this.list[i] = this._make(false);
    }
  };

  Motes.prototype.draw = function (ctx, t, intensity) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < this.list.length; i++) {
      var m = this.list[i];
      var a = m.base * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + m.ph))) * intensity;
      if (a <= 0.02) continue;
      var rgb = m.warm ? '255,216,152' : '178,210,255';
      Q.glow(ctx, rgb, m.x, m.y, m.r * 11, a * 0.6);
      ctx.fillStyle = 'rgba(' + rgb + ',' + (a * 0.9).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ------------------------------------------------------------------ */
  /* 心形烟花                                                            */
  /* ------------------------------------------------------------------ */

  function Fireworks() {
    this.parts = [];
    this.rings = [];
  }

  Fireworks.prototype.burstHeart = function (x, y, scale, hue) {
    var n = 74;
    var pt = {};
    var palette = hue || [
      '255,182,204', '255,214,226', '255,236,214', '255,160,170', '255,246,238'
    ];
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU;
      heartPoint(a, pt);
      var tx = pt.x * scale, ty = pt.y * scale;
      var d = Math.hypot(tx, ty) || 1;
      this.parts.push({
        x: x, y: y,
        tx: tx, ty: ty,
        vx: tx / d * Q.rand(150, 230),
        vy: ty / d * Q.rand(150, 230),
        life: 0,
        max: Q.rand(1.5, 2.6),
        r: Q.rand(1.1, 2.5),
        col: Q.pick(palette),
        drift: Q.rand(-9, 9),
        settle: Q.rand(0.42, 0.62)
      });
    }
    // 中央若干碎光
    for (var j = 0; j < 22; j++) {
      var ang = Q.rand(0, TAU), sp = Q.rand(30, 210);
      this.parts.push({
        x: x, y: y, tx: 0, ty: 0,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, max: Q.rand(0.7, 1.6),
        r: Q.rand(0.8, 1.8),
        col: Q.pick(palette),
        drift: Q.rand(-14, 14),
        settle: 0
      });
    }
    this.rings.push({ x: x, y: y, life: 0, max: 0.85, r: 6, R: 96 * (scale / 3.2) });
  };

  Fireworks.prototype.burstStar = function (x, y, count, palette, speed) {
    for (var i = 0; i < count; i++) {
      var ang = Q.rand(0, TAU);
      var sp = Q.rand(speed * 0.25, speed);
      this.parts.push({
        x: x, y: y, tx: 0, ty: 0,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, max: Q.rand(0.9, 2.4),
        r: Q.rand(0.9, 2.6),
        col: Q.pick(palette),
        drift: Q.rand(-16, 16),
        settle: 0
      });
    }
  };

  Fireworks.prototype.ring = function (x, y, R, dur) {
    this.rings.push({ x: x, y: y, life: 0, max: dur || 1.1, r: 4, R: R });
  };

  Fireworks.prototype.update = function (dt) {
    var i, p;
    for (i = this.parts.length - 1; i >= 0; i--) {
      p = this.parts[i];
      p.life += dt;
      if (p.life > p.max) { this.parts.splice(i, 1); continue; }

      if (p.settle > 0 && !p.done) {
        // 第一阶段：冲向心形轮廓上的目标点
        var k = p.life / (p.max * p.settle);
        if (k < 1) {
          var e = Q.ease.outQuint(k);
          p.cx = p.tx * e;
          p.cy = p.ty * e;
          continue;
        }
        // 到位后把偏移并入本体，之后转为自由飘散，避免位置突跳
        p.x += p.tx;
        p.y += p.ty;
        p.cx = 0; p.cy = 0;
        p.done = true;
        p.vx *= 0.10;
        p.vy *= 0.10;
      }

      p.vx += p.drift * dt;
      p.vy += 24 * dt;                        // 轻微重力
      p.vx *= (1 - 1.5 * dt);
      p.vy *= (1 - 1.5 * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (i = this.rings.length - 1; i >= 0; i--) {
      var r = this.rings[i];
      r.life += dt;
      if (r.life > r.max) this.rings.splice(i, 1);
    }
  };

  Fireworks.prototype.draw = function (ctx) {
    ctx.globalCompositeOperation = 'lighter';
    var i, p;
    for (i = 0; i < this.parts.length; i++) {
      p = this.parts[i];
      var k = p.life / p.max;
      var x = p.x, y = p.y, a;
      if (p.settle > 0 && !p.done) {
        x += p.cx || 0;
        y += p.cy || 0;
        a = Math.min(1, p.life / (p.max * p.settle) * 2.6) * 0.95;
      } else {
        a = (1 - k) * (1 - k) * 0.95;
      }
      Q.glow(ctx, p.col, x, y, p.r * 9, a * 0.55);
      ctx.fillStyle = 'rgba(' + p.col + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, p.r * (1 - k * 0.45), 0, TAU);
      ctx.fill();
    }
    for (i = 0; i < this.rings.length; i++) {
      var r = this.rings[i];
      var kk = r.life / r.max;
      var rad = Q.lerp(r.r, r.R, Q.ease.outQuint(kk));
      var ra = (1 - kk) * (1 - kk) * 0.6;
      ctx.strokeStyle = 'rgba(255,238,214,' + ra.toFixed(3) + ')';
      ctx.lineWidth = Q.lerp(3.2, 0.5, kk);
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, TAU);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ------------------------------------------------------------------ */
  /* 孔明灯（承载心愿）                                                  */
  /* ------------------------------------------------------------------ */

  function Lanterns(W, H) {
    this.W = W; this.H = H;
    this.list = [];
  }

  Lanterns.prototype.resize = function (W, H) { this.W = W; this.H = H; };

  Lanterns.prototype.release = function (text, x) {
    if (this.list.length > 24) this.list.shift();
    this.list.push({
      x: x === undefined ? Q.rand(this.W * 0.2, this.W * 0.8) : x,
      y: this.H + Q.rand(20, 70),
      vy: -Q.rand(20, 32),
      s: Q.rand(0.85, 1.25),
      sway: Q.rand(0.25, 0.55),
      ph: Q.rand(0, TAU),
      text: (text || '').slice(0, 14),
      flick: Q.rand(0, TAU),
      a: 0
    });
  };

  Lanterns.prototype.update = function (dt, t) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var L = this.list[i];
      L.y += L.vy * dt;
      L.vy *= (1 - 0.06 * dt);
      L.x += Math.sin(t * L.sway + L.ph) * 11 * dt;
      L.a = Q.smoothstep(this.H + 80, this.H - 60, L.y) *
            Q.smoothstep(-this.H * 0.06, this.H * 0.14, L.y);
      if (L.y < -140) this.list.splice(i, 1);
    }
  };

  Lanterns.prototype.draw = function (ctx, t) {
    for (var i = 0; i < this.list.length; i++) {
      var L = this.list[i];
      if (L.a <= 0.02) continue;
      var w = 26 * L.s, h = 34 * L.s;
      var flick = 0.85 + 0.15 * Math.sin(t * 9 + L.flick);

      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.rotate(Math.sin(t * L.sway * 1.3 + L.ph) * 0.06);
      ctx.globalAlpha = L.a;

      // 外辉
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, '255,186,102', 0, 0, w * 2.6, 0.42 * flick);
      ctx.globalCompositeOperation = 'source-over';

      // 灯体
      var lg = ctx.createLinearGradient(0, -h * 0.55, 0, h * 0.6);
      lg.addColorStop(0, 'rgba(255,214,150,' + (0.80 * flick).toFixed(3) + ')');
      lg.addColorStop(0.55, 'rgba(255,168,96,' + (0.90 * flick).toFixed(3) + ')');
      lg.addColorStop(1, 'rgba(226,110,64,' + (0.82 * flick).toFixed(3) + ')');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(-w * 0.36, -h * 0.5);
      ctx.quadraticCurveTo(-w * 0.62, -h * 0.05, -w * 0.42, h * 0.44);
      ctx.lineTo(w * 0.42, h * 0.44);
      ctx.quadraticCurveTo(w * 0.62, -h * 0.05, w * 0.36, -h * 0.5);
      ctx.closePath();
      ctx.fill();

      // 顶口与底口
      ctx.fillStyle = 'rgba(120,58,32,0.7)';
      ctx.fillRect(-w * 0.36, -h * 0.54, w * 0.72, h * 0.055);
      ctx.fillStyle = 'rgba(70,32,18,0.75)';
      ctx.fillRect(-w * 0.42, h * 0.42, w * 0.84, h * 0.05);

      // 灯芯
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, '255,236,180', 0, h * 0.3, w * 0.5, 0.9 * flick);
      ctx.globalCompositeOperation = 'source-over';

      // 心愿文字（竖排）
      if (L.text) {
        var fs = Math.max(8, 9.5 * L.s);
        ctx.fillStyle = 'rgba(84,32,18,0.88)';
        ctx.font = fs + 'px "Kaiti SC","STKaiti","Songti SC",serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var chars = L.text.split('');
        var maxShow = Math.min(chars.length, 4);
        var startY = -((maxShow - 1) * fs * 1.12) / 2 - h * 0.02;
        for (var c = 0; c < maxShow; c++) {
          ctx.fillText(chars[c], 0, startY + c * fs * 1.12);
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 光之玫瑰 —— 光粒汇聚、自旋绽放、环轨流转、化屑飞散                  */
  /* ------------------------------------------------------------------ */

  // 由外到内的五层花瓣
  var RINGS = [
    { n: 7, r: 0.86, s: 0.66 },
    { n: 6, r: 0.64, s: 0.55 },
    { n: 6, r: 0.45, s: 0.44 },
    { n: 5, r: 0.28, s: 0.33 },
    { n: 3, r: 0.11, s: 0.23 }
  ];

  var T_VORTEX = 1.10;   // 光粒螺旋汇聚
  var T_BLOOM0 = 0.78;   // 第一片花瓣开始张开
  var T_PETAL  = 0.95;   // 单片花瓣耗时
  var T_FLASH  = 1.80;   // 满开的那一下白光
  var T_HOLD   = 6.40;   // 常态维持到此
  var T_FADE   = 2.90;   // 化屑飞散

  function Rose(x, y, size) {
    this.x = x; this.y = y; this.size = size;
    this.life = 0;
    this.max = T_HOLD + T_FADE;
    this.spin = Q.rand(-1, 1) > 0 ? 1 : -1;
    this.seed = Q.rand(0, TAU);
    this.petals = [];
    this.motes = [];

    var ri, i, R;
    for (ri = 0; ri < RINGS.length; ri++) {
      R = RINGS[ri];
      for (i = 0; i < R.n; i++) {
        this.petals.push({
          ring: ri,
          a: ri * 0.44 + i * TAU / R.n + Q.rand(-0.07, 0.07),
          r: R.r * Q.rand(0.94, 1.06),
          s: R.s * Q.rand(0.92, 1.08),
          curl: Q.rand(-0.16, 0.16),
          delay: T_BLOOM0 + ri * 0.17 + Q.rand(0, 0.09),
          swirl: Q.rand(1.6, 3.0) * (Math.random() > 0.5 ? 1 : -1),
          // 飞散
          dvr: Q.rand(1.2, 3.4) * (Math.random() > 0.5 ? 1 : -1),
          dvy: Q.rand(90, 240),
          dvx: Q.rand(-70, 70),
          dd: Q.rand(0, 0.55)
        });
      }
    }

    // 汇聚的光粒
    for (i = 0; i < 54; i++) {
      this.motes.push({
        a0: Q.rand(0, TAU),
        r0: Q.rand(2.4, 6.2),
        spin: Q.rand(2.2, 4.6) * (Math.random() > 0.5 ? 1 : -1),
        delay: Q.rand(0, 0.34),
        sz: Q.rand(0.9, 2.6),
        warm: Math.random() > 0.55
      });
    }
  }

  Rose.prototype.update = function (dt) {
    this.life += dt;
    return this.life < this.max;
  };

  /* 一片玫瑰花瓣：自原点向 +y 生长，瓣宽近方，顶缘翻卷带双波 */
  function petalShape(ctx, w, h, curl) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-w * 1.00, h * 0.16, -w * (1.14 + curl), h * 0.62, -w * 0.66, h * 0.92);
    ctx.quadraticCurveTo(-w * 0.34, h * (1.07 + curl * 0.4), -w * 0.10, h * 0.95);
    ctx.quadraticCurveTo(0, h * 0.88, w * 0.10, h * 0.95);
    ctx.quadraticCurveTo(w * 0.34, h * (1.07 - curl * 0.4), w * 0.66, h * 0.92);
    ctx.bezierCurveTo(w * (1.14 - curl), h * 0.62, w * 1.00, h * 0.16, 0, 0);
    ctx.closePath();
  }

  Rose.prototype.draw = function (ctx, t) {
    var L = this.life, S = this.size;
    var fade = L > T_HOLD ? Q.clamp((L - T_HOLD) / T_FADE, 0, 1) : 0;
    var alive = 1 - fade;
    var sway = Math.sin(t * 1.1 + this.seed) * 0.045;
    var i, p;

    ctx.save();
    ctx.translate(this.x, this.y);

    /* ---------- 光粒螺旋汇聚 ---------- */
    if (L < T_VORTEX + 0.35) {
      ctx.globalCompositeOperation = 'lighter';
      for (i = 0; i < this.motes.length; i++) {
        var m = this.motes[i];
        var s = Q.clamp((L - m.delay) / (T_VORTEX - m.delay), 0, 1);
        if (s <= 0) continue;
        var fadeIn = Math.sin(Math.min(1, s) * Math.PI);
        // 拖影
        for (var g = 0; g < 3; g++) {
          var sg = Math.max(0, s - g * 0.055);
          var rr = S * m.r0 * (1 - Q.ease.inQuad(sg));
          var aa = m.a0 + m.spin * sg * 2.6;
          Q.glow(ctx, m.warm ? '255,206,168' : '255,150,180',
                 Math.cos(aa) * rr, Math.sin(aa) * rr * 0.72,
                 S * 0.10 * m.sz * (1 - g * 0.26),
                 fadeIn * 0.55 * (1 - g * 0.3));
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ---------- 花茎与叶 ---------- */
    var stemK = Q.ease.outCubic(Q.clamp(L / T_VORTEX, 0, 1));
    if (stemK > 0.02 && alive > 0.01) {
      ctx.save();
      ctx.globalAlpha = alive * 0.95;
      ctx.lineCap = 'round';
      ctx.setLineDash([S * 2.6, S * 2.6]);
      ctx.lineDashOffset = S * 2.6 * (1 - stemK);

      ctx.strokeStyle = 'rgba(34,74,52,0.95)';
      ctx.lineWidth = Math.max(1.6, S * 0.050);
      ctx.beginPath();
      ctx.moveTo(0, S * 2.25);
      ctx.quadraticCurveTo(S * sway * 0.7, S * 1.15, 0, 0);
      ctx.stroke();
      // 茎上的一道迎光边
      ctx.strokeStyle = 'rgba(150,232,178,0.55)';
      ctx.lineWidth = Math.max(0.8, S * 0.016);
      ctx.beginPath();
      ctx.moveTo(-S * 0.016, S * 2.25);
      ctx.quadraticCurveTo(S * sway * 0.7 - S * 0.016, S * 1.15, -S * 0.014, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      var leafK = Q.smoothstep(0.42, 1, stemK);
      if (leafK > 0.01) {
        [[1, 1.32, 0.60], [-1, 1.74, 0.50]].forEach(function (Lf) {
          ctx.save();
          ctx.translate(0, S * Lf[1]);
          ctx.rotate(Lf[0] * (0.72 + sway));
          ctx.scale(leafK, leafK);
          var lg = ctx.createLinearGradient(0, 0, S * Lf[2], 0);
          lg.addColorStop(0, 'rgba(30,72,50,0.95)');
          lg.addColorStop(1, 'rgba(96,178,124,0.85)');
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(S * Lf[2] * 0.55, -S * 0.21, S * Lf[2], 0);
          ctx.quadraticCurveTo(S * Lf[2] * 0.55, S * 0.21, 0, 0);
          ctx.fill();
          ctx.strokeStyle = 'rgba(170,244,196,0.42)';
          ctx.lineWidth = S * 0.012;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(S * Lf[2] * 0.92, 0);
          ctx.stroke();
          ctx.restore();
        });
      }
      ctx.restore();
    }

    var bloomK = Q.smoothstep(T_BLOOM0, T_BLOOM0 + 1.3, L);

    /* ---------- 花冠背后的旋转光芒 ---------- */
    if (bloomK > 0.02 && alive > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, '255,96,140', 0, 0, S * 3.8, 0.20 * bloomK * alive);
      Q.glow(ctx, '255,190,206', 0, 0, S * 1.7, 0.22 * bloomK * alive);

      ctx.rotate(t * 0.24 * this.spin + this.seed);
      var rays = 12;
      for (i = 0; i < rays; i++) {
        var ra = i * TAU / rays;
        var rl = S * (2.5 + 1.1 * Math.sin(t * 1.3 + i * 1.7));
        ctx.save();
        ctx.rotate(ra);
        var rg = ctx.createLinearGradient(0, 0, 0, rl);
        rg.addColorStop(0, 'rgba(255,178,200,' + (0.16 * bloomK * alive).toFixed(3) + ')');
        rg.addColorStop(1, 'rgba(255,120,160,0)');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.moveTo(-S * 0.10, 0);
        ctx.lineTo(0, rl);
        ctx.lineTo(S * 0.10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    /* ---------- 满开的一记白光 ---------- */
    var fl = 1 - Q.clamp(Math.abs(L - T_FLASH) / 0.55, 0, 1);
    if (fl > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, '255,244,246', 0, 0, S * (1.4 + 3.6 * (1 - fl)), fl * 0.75);
      ctx.strokeStyle = 'rgba(255,214,226,' + (fl * 0.6).toFixed(3) + ')';
      ctx.lineWidth = Math.max(1, S * 0.05 * fl);
      ctx.beginPath();
      ctx.arc(0, 0, S * (0.5 + 3.2 * (1 - fl)), 0, TAU);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }

    /* ---------- 花瓣 ---------- */
    ctx.save();
    ctx.rotate(sway * 0.3 + t * 0.09 * this.spin);
    for (i = 0; i < this.petals.length; i++) {
      p = this.petals[i];
      var open = Q.clamp((L - p.delay) / T_PETAL, 0, 1);
      if (open <= 0) continue;
      var e = Q.ease.outBack(open);

      var df = fade > 0 ? Q.clamp((fade - p.dd * 0.4) / (1 - p.dd * 0.4), 0, 1) : 0;
      var a = (1 - df) * Math.min(1, open * 1.8);
      if (a <= 0.01) continue;

      var k = p.ring / (RINGS.length - 1);
      // 内层收拢：越靠花心，花瓣越短越窄，形成杯状包裹
      var cup = Q.lerp(1.0, 0.66, k);
      var h = S * p.s * Math.max(0.02, e) * cup;
      var w = S * p.s * Q.lerp(0.94, 0.80, k) * Math.max(0.02, e);

      // 飞散：螺旋上升
      var ang = p.a + (1 - e) * p.swirl + p.dvr * df * 1.7;
      var rad = S * p.r * e * 0.30 + df * df * S * 2.4;
      var ox = Math.cos(p.a * 1.7) * p.dvx * df * (S / 60) * 0.6;
      var oy = -p.dvy * df * (S / 60) * 0.85;

      // 拖影（飞散阶段）
      var ghosts = df > 0.02 ? 3 : 1;
      for (var gi = ghosts - 1; gi >= 0; gi--) {
        var gd = Math.max(0, df - gi * 0.05);
        var gAng = p.a + (1 - e) * p.swirl + p.dvr * gd * 1.7;
        var gRad = S * p.r * e * 0.30 + gd * gd * S * 2.4;
        var gOx = Math.cos(p.a * 1.7) * p.dvx * gd * (S / 60) * 0.6;
        var gOy = -p.dvy * gd * (S / 60) * 0.85;
        var gA = a * (gi === 0 ? 1 : 0.28 / gi);

        ctx.save();
        ctx.translate(gOx, gOy);
        ctx.rotate(gAng);
        ctx.translate(0, gRad);
        ctx.globalAlpha = gA;

        var base = 'rgba(' + Math.round(Q.lerp(132, 44, k)) + ',' +
                             Math.round(Q.lerp(12, 4, k)) + ',' +
                             Math.round(Q.lerp(38, 18, k)) + ',1)';
        var tip  = 'rgba(' + Math.round(Q.lerp(255, 214, k)) + ',' +
                             Math.round(Q.lerp(122, 46, k)) + ',' +
                             Math.round(Q.lerp(154, 82, k)) + ',1)';
        var pg = ctx.createLinearGradient(0, 0, 0, h);
        pg.addColorStop(0, base);
        pg.addColorStop(0.55, 'rgba(' +
          Math.round(Q.lerp(216, 140, k)) + ',' +
          Math.round(Q.lerp(46, 20, k)) + ',' +
          Math.round(Q.lerp(84, 48, k)) + ',1)');
        pg.addColorStop(1, tip);
        ctx.fillStyle = pg;
        petalShape(ctx, w, h, p.curl);
        ctx.fill();

        // 瓣缘迎光
        ctx.strokeStyle = 'rgba(255,196,212,' + (0.42 * (1 - k * 0.6)).toFixed(3) + ')';
        ctx.lineWidth = Math.max(0.6, S * 0.011);
        ctx.stroke();

        // 瓣尖的一层辉光（叠加模式）
        ctx.globalCompositeOperation = 'lighter';
        var hg = ctx.createLinearGradient(0, h * 0.45, 0, h * 1.02);
        hg.addColorStop(0, 'rgba(255,120,160,0)');
        hg.addColorStop(1, 'rgba(255,186,206,' + (0.40 * (1 - k * 0.5)).toFixed(3) + ')');
        ctx.fillStyle = hg;
        petalShape(ctx, w, h, p.curl);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.restore();
      }
    }
    ctx.restore();

    /* ---------- 花心金蕊 ---------- */
    if (bloomK > 0.35 && fade < 0.55) {
      ctx.save();
      ctx.globalAlpha = alive * Q.smoothstep(0.35, 0.7, bloomK);
      ctx.rotate(t * 0.07 * this.spin + this.seed);

      // 先垫一层很淡的暖光，再压上花苞 —— 光是从花心「透」出来的
      ctx.globalCompositeOperation = 'lighter';
      var pulse = 0.78 + 0.22 * Math.sin(t * 2.4 + this.seed);
      Q.glow(ctx, '255,150,158', 0, 0, S * 0.44 * pulse, 0.20 * bloomK);
      ctx.globalCompositeOperation = 'source-over';

      // 紧卷的花苞：六片小瓣呈螺旋包裹
      for (i = 0; i < 6; i++) {
        var ba = i * 1.06;
        var br = S * (0.050 + i * 0.017);
        var bh = S * (0.215 - i * 0.014);
        var bw = bh * 0.80;
        ctx.save();
        ctx.rotate(ba);
        ctx.translate(0, br);
        var bg = ctx.createLinearGradient(0, 0, 0, bh);
        bg.addColorStop(0, 'rgba(48,3,16,1)');
        bg.addColorStop(0.6, 'rgba(146,18,50,1)');
        bg.addColorStop(1, 'rgba(226,72,106,1)');
        ctx.fillStyle = bg;
        petalShape(ctx, bw, bh, 0.20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,178,196,0.34)';
        ctx.lineWidth = Math.max(0.5, S * 0.009);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    /* ---------- 环绕光轨 ---------- */
    if (bloomK > 0.2 && alive > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var N = 26, RR = S * (1.95 + 0.12 * Math.sin(t * 0.9));
      for (i = 0; i < N; i++) {
        var oa = t * 0.85 * this.spin + i * TAU / N + this.seed;
        var depth = (Math.sin(oa) + 1) / 2;              // 0 后 → 1 前
        var oxx = Math.cos(oa) * RR;
        var oyy = Math.sin(oa) * RR * 0.28 - S * 0.05;
        var oaA = (0.18 + 0.62 * depth) * bloomK * alive;
        Q.glow(ctx, i % 3 === 0 ? '255,214,168' : '255,158,190',
               oxx, oyy, S * (0.06 + 0.09 * depth), oaA);
      }
      ctx.restore();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  Q.Rose = Rose;
  Q.Petals = Petals;
  Q.Motes = Motes;
  Q.Fireworks = Fireworks;
  Q.Lanterns = Lanterns;
  Q.heartPoint = heartPoint;

})(window.Q);
