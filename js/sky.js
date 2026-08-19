/* 七夕 · 鹊桥仙 —— 星空 / 银河 / 水面
 *
 * 银河为程序化生成后烘焙到离屏画布（云气用低分辨率 ImageData 放大，
 * 星点用矢量绘制），逐帧只做一次 drawImage，性能友好。
 */
(function (Q) {
  'use strict';

  var TAU = Q.TAU;

  /* 银河带在归一化高度 ny 处的半宽（占画布宽度比例） */
  function bandHalf(ny) {
    return 0.088 + 0.042 * Math.sin(ny * 3.1 + 1.2) + 0.018 * Math.sin(ny * 7.7);
  }

  /* 某点落在银河带上的密度 0~1（纯解析，不含噪声） */
  function bandDensity(x, y, W, H) {
    var ny = y / H;
    var dx = (x - Q.riverX(ny, W)) / (W * bandHalf(ny));
    return Math.exp(-dx * dx * 1.75);
  }

  function Sky() {
    this.canvas  = null;   // 烘焙好的银河 + 静态星点
    this.flipped = null;   // 垂直翻转副本，用于水面倒影
    this.live    = [];     // 逐帧闪烁的亮星
    this.shooting = [];    // 流星
    this.nextShoot = 6;
  }

  /* ------------------------------------------------------------------ */
  /* 烘焙                                                                */
  /* ------------------------------------------------------------------ */

  Sky.prototype.build = function (W, H, dpr) {
    this.W = W; this.H = H;

    /* --- 1. 云气（半分辨率逐像素） --- */
    var hw = Math.max(2, Math.round(W * 0.5));
    var hh = Math.max(2, Math.round(H * 0.5));
    var haze = document.createElement('canvas');
    haze.width = hw; haze.height = hh;
    var hctx = haze.getContext('2d');
    var img = hctx.createImageData(hw, hh);
    var d = img.data;

    var nCloud = Q.makeNoise2D(11);
    var nRift  = Q.makeNoise2D(57);
    var nTint  = Q.makeNoise2D(29);

    for (var y = 0; y < hh; y++) {
      var ny = y / hh;
      var cx = Q.riverX(ny, hw);
      var half = hw * bandHalf(ny) * 1.05;

      for (var x = 0; x < hw; x++) {
        var t = (x - cx) / half;
        var dens = Math.exp(-t * t * 1.75);
        if (dens < 0.005) continue;

        // 团块结构
        var f = Q.fbm(nCloud, x * 0.016, y * 0.011, 5);
        dens *= 0.16 + 1.05 * f * f;

        // 暗尘带（大尺度低频噪声挖出的裂隙，靠近核心更明显）
        var rift = Q.fbm(nRift, x * 0.0075 + 40, y * 0.0052, 3);
        dens *= 1 - 0.82 * Q.smoothstep(0.44, 0.66, rift) * Math.exp(-t * t * 0.55);

        if (dens <= 0.002) continue;

        // 冷蓝 → 奶白 → 淡玫瑰
        var m = Q.fbm(nTint, x * 0.0055, y * 0.0042, 3);
        var r, g, b, k;
        if (m < 0.5) {
          k = m * 2;
          r = Q.lerp(150, 240, k); g = Q.lerp(184, 226, k); b = Q.lerp(255, 236, k);
        } else {
          k = (m - 0.5) * 2;
          r = Q.lerp(240, 255, k); g = Q.lerp(226, 196, k); b = Q.lerp(236, 216, k);
        }

        var i = (y * hw + x) * 4;
        d[i]     = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = Q.clamp(dens, 0, 1) * 150;
      }
    }
    hctx.putImageData(img, 0, 0);

    /* --- 2. 主画布：云气放大 + 星点 --- */
    var gc = document.createElement('canvas');
    gc.width  = Math.round(W * dpr);
    gc.height = Math.round(H * dpr);
    var g = gc.getContext('2d');
    g.scale(dpr, dpr);

    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.globalCompositeOperation = 'lighter';
    g.drawImage(haze, 0, 0, W, H);
    // 二次叠加 + 轻微偏移，让云气更有层次
    g.globalAlpha = 0.42;
    g.drawImage(haze, -W * 0.012, H * 0.008, W * 1.02, H * 1.0);
    g.globalAlpha = 1;

    /* 星点：河带内聚集 + 全天散布 */
    var area = W * H;
    var clustered = Math.round(Q.clamp(area / 620, 700, 3400));
    var field     = Math.round(Q.clamp(area / 2300, 240, 950));
    var i2, sx, sy, s, a, warm;

    for (i2 = 0; i2 < clustered; i2++) {
      // 拒绝采样：越靠近银河中心越密
      var tries = 0;
      do {
        sx = Math.random() * W;
        sy = Math.random() * H;
        tries++;
      } while (Math.random() > bandDensity(sx, sy, W, H) && tries < 14);

      s = Math.pow(Math.random(), 3.2) * 1.25 + 0.28;
      a = 0.22 + Math.random() * 0.6;
      warm = Math.random();
      g.fillStyle = warm > 0.86
        ? 'rgba(255,224,186,' + a + ')'
        : (warm < 0.16 ? 'rgba(196,216,255,' + a + ')' : 'rgba(248,250,255,' + a + ')');
      g.beginPath();
      g.arc(sx, sy, s, 0, TAU);
      g.fill();
    }

    for (i2 = 0; i2 < field; i2++) {
      sx = Math.random() * W;
      sy = Math.random() * H;
      s = Math.pow(Math.random(), 2.6) * 1.05 + 0.24;
      a = 0.14 + Math.random() * 0.42;
      g.fillStyle = 'rgba(240,246,255,' + a + ')';
      g.beginPath();
      g.arc(sx, sy, s, 0, TAU);
      g.fill();
    }

    /* 少量亮星带十字芒 */
    var bright = Math.round(Q.clamp(area / 26000, 12, 44));
    for (i2 = 0; i2 < bright; i2++) {
      sx = Q.rand(W * 0.02, W * 0.98);
      sy = Q.rand(H * 0.02, H * 0.80);
      var rr = Q.rand(1.4, 2.6);
      Q.glow(g, '215,232,255', sx, sy, rr * 9, 0.42);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath(); g.arc(sx, sy, rr * 0.52, 0, TAU); g.fill();

      var spike = rr * 7;
      var lg = g.createLinearGradient(sx - spike, sy, sx + spike, sy);
      lg.addColorStop(0, 'rgba(210,228,255,0)');
      lg.addColorStop(0.5, 'rgba(230,240,255,0.55)');
      lg.addColorStop(1, 'rgba(210,228,255,0)');
      g.fillStyle = lg;
      g.fillRect(sx - spike, sy - 0.4, spike * 2, 0.8);
      var lg2 = g.createLinearGradient(sx, sy - spike * 0.7, sx, sy + spike * 0.7);
      lg2.addColorStop(0, 'rgba(210,228,255,0)');
      lg2.addColorStop(0.5, 'rgba(230,240,255,0.45)');
      lg2.addColorStop(1, 'rgba(210,228,255,0)');
      g.fillStyle = lg2;
      g.fillRect(sx - 0.4, sy - spike * 0.7, 0.8, spike * 1.4);
    }

    g.globalCompositeOperation = 'source-over';
    this.canvas = gc;

    /* --- 3. 翻转副本（水面倒影用） --- */
    var fc = document.createElement('canvas');
    fc.width = gc.width; fc.height = gc.height;
    var f2 = fc.getContext('2d');
    f2.translate(0, fc.height);
    f2.scale(1, -1);
    f2.drawImage(gc, 0, 0);
    this.flipped = fc;

    /* --- 4. 逐帧闪烁的活星 --- */
    this.live.length = 0;
    var liveN = Math.round(Q.clamp(area / 5200, 90, 300));
    for (i2 = 0; i2 < liveN; i2++) {
      var lx, ly, tr = 0;
      do {
        lx = Math.random() * W;
        ly = Math.random() * H * 0.86;
        tr++;
      } while (Math.random() > bandDensity(lx, ly, W, H) * 0.75 + 0.25 && tr < 10);

      this.live.push({
        x: lx, y: ly,
        r: Q.rand(0.5, 1.7),
        base: Q.rand(0.16, 0.62),
        amp: Q.rand(0.22, 0.6),
        sp: Q.rand(0.5, 2.1),
        ph: Q.rand(0, TAU),
        warm: Math.random() > 0.78
      });
    }

    this.shooting.length = 0;
    this.nextShoot = Q.rand(4, 9);
    return this;
  };

  /* ------------------------------------------------------------------ */
  /* 绘制                                                                */
  /* ------------------------------------------------------------------ */

  /* 夜空底色 */
  Sky.prototype.background = function (ctx, W, H, horizon) {
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0.00, '#03040c');
    bg.addColorStop(0.34, '#070b1e');
    bg.addColorStop(0.66, '#0c1230');
    bg.addColorStop(0.86, '#141a3c');
    bg.addColorStop(1.00, '#070a1c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 地平线附近的暖辉（远处灯火）
    ctx.globalCompositeOperation = 'lighter';
    var hg = ctx.createLinearGradient(0, horizon - H * 0.16, 0, horizon + 2);
    hg.addColorStop(0, 'rgba(120,96,150,0)');
    hg.addColorStop(0.62, 'rgba(126,104,164,0.10)');
    hg.addColorStop(1, 'rgba(206,150,132,0.20)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizon - H * 0.16, W, H * 0.16 + 2);
    ctx.globalCompositeOperation = 'source-over';
  };

  /* 银河 + 闪烁星 + 流星 */
  Sky.prototype.draw = function (ctx, W, H, t, dt, reveal, px, py) {
    if (reveal <= 0) return;

    ctx.globalCompositeOperation = 'lighter';

    ctx.globalAlpha = reveal;
    ctx.drawImage(this.canvas, px, py, W, H);
    ctx.globalAlpha = 1;

    // 闪烁亮星
    var i, s, a;
    for (i = 0; i < this.live.length; i++) {
      s = this.live[i];
      a = (s.base + s.amp * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * reveal;
      if (a <= 0.02) continue;
      ctx.fillStyle = s.warm
        ? 'rgba(255,228,194,' + a.toFixed(3) + ')'
        : 'rgba(236,244,255,' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x + px, s.y + py, s.r, 0, TAU);
      ctx.fill();
      if (s.r > 1.25) Q.glow(ctx, s.warm ? '255,224,180' : '190,214,255', s.x + px, s.y + py, s.r * 7, a * 0.3);
    }

    this._shoot(ctx, W, H, dt, reveal);
    ctx.globalCompositeOperation = 'source-over';
  };

  Sky.prototype._shoot = function (ctx, W, H, dt, reveal) {
    this.nextShoot -= dt;
    if (this.nextShoot <= 0) {
      this.nextShoot = Q.rand(5.5, 13);
      var fromLeft = Math.random() > 0.5;
      var ang = fromLeft ? Q.rand(0.28, 0.55) : Math.PI - Q.rand(0.28, 0.55);
      var sp = Q.rand(680, 1150);
      this.shooting.push({
        x: fromLeft ? Q.rand(-40, W * 0.42) : Q.rand(W * 0.58, W + 40),
        y: Q.rand(-30, H * 0.34),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        max: Q.rand(0.62, 1.05),
        len: Q.rand(90, 210)
      });
    }

    for (var i = this.shooting.length - 1; i >= 0; i--) {
      var m = this.shooting[i];
      m.life += dt;
      if (m.life > m.max) { this.shooting.splice(i, 1); continue; }
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      var p = m.life / m.max;
      var a = Math.sin(p * Math.PI) * 0.9 * reveal;
      var n = Math.hypot(m.vx, m.vy);
      var tx = m.x - m.vx / n * m.len;
      var ty = m.y - m.vy / n * m.len;

      var lg = ctx.createLinearGradient(m.x, m.y, tx, ty);
      lg.addColorStop(0, 'rgba(255,252,240,' + a.toFixed(3) + ')');
      lg.addColorStop(0.28, 'rgba(206,226,255,' + (a * 0.42).toFixed(3) + ')');
      lg.addColorStop(1, 'rgba(160,190,255,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      Q.glow(ctx, '255,246,225', m.x, m.y, 16, a * 0.8);
    }
  };

  /* 远山剪影 */
  Sky.prototype.mountains = function (ctx, W, H, horizon, reveal) {
    if (!this._ridge || this._ridgeW !== W) {
      this._ridgeW = W;
      var mk = function (seed, amp, freq) {
        var n = Q.makeNoise2D(seed), pts = [], steps = 90;
        for (var i = 0; i <= steps; i++) {
          var x = i / steps;
          pts.push(Q.fbm(n, x * freq, 0.5, 4) * amp);
        }
        return pts;
      };
      this._ridge = [mk(7, 1, 3.2), mk(23, 1, 5.4)];
    }

    var layers = [
      { pts: this._ridge[0], h: H * 0.085, col: 'rgba(7,10,26,0.92)',  off: 0 },
      { pts: this._ridge[1], h: H * 0.052, col: 'rgba(3,5,16,0.98)',   off: 0 }
    ];

    for (var L = 0; L < layers.length; L++) {
      var la = layers[L], pts = la.pts, n = pts.length - 1;
      ctx.beginPath();
      ctx.moveTo(0, horizon + 2);
      for (var i = 0; i <= n; i++) {
        ctx.lineTo(i / n * W, horizon + 2 - pts[i] * la.h - la.h * 0.16);
      }
      ctx.lineTo(W, horizon + 2);
      ctx.closePath();
      ctx.fillStyle = la.col;
      ctx.fill();
    }

    // 山脊淡淡的天光边缘
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * reveal;
    var eg = ctx.createLinearGradient(0, horizon - H * 0.09, 0, horizon);
    eg.addColorStop(0, 'rgba(150,140,200,0)');
    eg.addColorStop(1, 'rgba(180,150,190,0.14)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, horizon - H * 0.09, W, H * 0.09);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  /* 水面：底色 + 条带位移倒影 + 波光 */
  Sky.prototype.water = function (ctx, W, H, horizon, t, reveal) {
    var depth = H - horizon;
    if (depth <= 0) return;

    // 底色（不透明，遮住下半部分的星空）
    var wg = ctx.createLinearGradient(0, horizon, 0, H);
    wg.addColorStop(0.00, 'rgba(9,13,32,0.90)');
    wg.addColorStop(0.30, 'rgba(6,9,24,0.97)');
    wg.addColorStop(1.00, 'rgba(2,3,10,1)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, horizon, W, depth);

    if (reveal > 0.01) {
      // 倒影：把翻转后的星空按条带做正弦位移画下来
      var srcOff = H - 2 * horizon;            // 源行 = 目标行 + srcOff
      var step = 3;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizon, W, depth);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';

      var fh = this.flipped.height, fw = this.flipped.width;
      var sy2 = fh / H;                        // 设备像素 ↔ CSS 像素

      for (var y = horizon; y < H; y += step) {
        var dy = (y - horizon) / depth;                 // 0 顶 → 1 底
        var srcY = (y + srcOff) * sy2;
        if (srcY < 0 || srcY >= fh) continue;
        var amp = 2 + dy * 26;
        var dx = Math.sin(y * 0.055 + t * 1.15) * amp * 0.6
               + Math.sin(y * 0.021 - t * 0.72) * amp * 0.4;
        var a = (0.50 - dy * 0.44) * reveal;
        if (a <= 0.01) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(
          this.flipped,
          0, srcY, fw, step * sy2,
          dx, y, W, step + 1
        );
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // 水面波光
    ctx.globalCompositeOperation = 'lighter';
    if (!this._glints) {
      this._glints = [];
      var gn = Math.round(Q.clamp(W / 9, 40, 190));
      for (var i = 0; i < gn; i++) {
        this._glints.push({
          x: Math.random(), d: Math.pow(Math.random(), 1.5),
          w: Q.rand(6, 40), sp: Q.rand(0.4, 1.5), ph: Q.rand(0, TAU)
        });
      }
    }
    for (var j = 0; j < this._glints.length; j++) {
      var gl = this._glints[j];
      var gy = horizon + gl.d * depth;
      var ga = (0.05 + 0.12 * (0.5 + 0.5 * Math.sin(t * gl.sp + gl.ph))) * (1 - gl.d * 0.7);
      ctx.fillStyle = 'rgba(196,214,255,' + ga.toFixed(3) + ')';
      var gw = gl.w * (1 + gl.d * 1.8);
      ctx.fillRect(gl.x * W - gw / 2 + Math.sin(t * 0.5 + gl.ph) * 8, gy, gw, 1.1);
    }

    // 水天交界的一线亮光
    var lg = ctx.createLinearGradient(0, horizon - 2, 0, horizon + 5);
    lg.addColorStop(0, 'rgba(190,170,210,0)');
    lg.addColorStop(0.4, 'rgba(214,196,236,0.20)');
    lg.addColorStop(1, 'rgba(190,170,210,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, horizon - 2, W, 7);
    ctx.globalCompositeOperation = 'source-over';
  };

  /* 某个光源在水面上的竖直倒影（月映水的效果） */
  Sky.prototype.reflectLight = function (ctx, W, H, horizon, x, rgb, intensity, t) {
    var depth = H - horizon;
    if (depth <= 0 || intensity <= 0.01) return;
    ctx.globalCompositeOperation = 'lighter';
    var n = 22;
    for (var i = 0; i < n; i++) {
      var k = i / n;
      var y = horizon + Math.pow(k, 1.25) * depth * 0.92;
      var a = intensity * (1 - k) * (1 - k) * 0.55 * (0.6 + 0.4 * Math.sin(t * 2.2 + i * 1.3));
      if (a <= 0.005) continue;
      var w = (7 + k * 70) * (0.7 + 0.5 * Math.sin(t * 1.4 + i * 0.9));
      var ox = Math.sin(t * 0.9 + i * 0.7) * (2 + k * 16);
      ctx.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(x + ox, y, w / 2, 0.9 + k * 1.3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  Q.Sky = Sky;
  Q.bandDensity = bandDensity;

})(window.Q);
