/* 七夕 · 鹊桥仙 —— 喜鹊
 *
 * 全矢量绘制，本体长度归一化为 1，通过 scale 控制大小。
 * flap ∈ ℝ，用 sin(flap) 驱动翅膀开合。
 */
(function (Q) {
  'use strict';

  var TAU = Q.TAU;

  /* 翅膀：lift ∈ [-1, 1]，-1 完全下压，1 完全上扬 */
  function wing(ctx, lift, span) {
    var ty = -0.66 * lift * span;
    var tx = -0.26 - 0.16 * Math.abs(lift);
    ctx.beginPath();
    ctx.moveTo(0.13, -0.03);
    ctx.quadraticCurveTo(0.04 + tx * 0.35, ty * 0.62, tx, ty);
    ctx.quadraticCurveTo(tx * 0.52, ty * 0.30 + 0.08, -0.14, 0.05);
    ctx.closePath();
    ctx.fill();
  }

  function body(ctx) {
    ctx.beginPath();
    ctx.moveTo(0.50, -0.015);                        // 喙尖
    ctx.quadraticCurveTo(0.36, -0.16, 0.16, -0.135); // 头顶
    ctx.quadraticCurveTo(-0.07, -0.125, -0.27, -0.060);
    ctx.lineTo(-0.66, -0.125);                       // 尾上缘
    ctx.lineTo(-0.63, 0.020);                        // 尾尖
    ctx.lineTo(-0.25, 0.062);                        // 尾下缘回到身体
    ctx.quadraticCurveTo(-0.03, 0.175, 0.17, 0.115); // 腹部
    ctx.quadraticCurveTo(0.34, 0.060, 0.50, -0.015); // 喉部→喙
    ctx.closePath();
    ctx.fill();
  }

  /**
   * @param ctx
   * @param x,y    位置
   * @param size   本体长度（像素）
   * @param angle  朝向弧度
   * @param flap   振翅相位
   * @param alpha  透明度
   * @param rim    翅羽反光色 'r,g,b'
   */
  Q.drawMagpie = function (ctx, x, y, size, angle, flap, alpha, rim) {
    if (alpha <= 0.01) return;
    var lift = Math.sin(flap);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(size, size);
    ctx.globalAlpha = alpha;

    // 远翅（在身体之后）
    ctx.fillStyle = 'rgba(8,10,24,0.80)';
    wing(ctx, -lift * 0.72, 0.86);

    // 身体
    ctx.fillStyle = 'rgba(10,12,26,0.96)';
    body(ctx);

    // 腹部白斑 —— 喜鹊的标志
    ctx.fillStyle = 'rgba(238,244,255,0.86)';
    ctx.beginPath();
    ctx.ellipse(0.11, 0.070, 0.150, 0.058, -0.10, 0, TAU);
    ctx.fill();

    // 肩羽白斑，把黑块打散，小尺寸下更认得出是鸟
    ctx.fillStyle = 'rgba(226,236,255,0.72)';
    ctx.beginPath();
    ctx.ellipse(-0.05, -0.045, 0.115, 0.040, -0.16, 0, TAU);
    ctx.fill();

    // 近翅
    ctx.fillStyle = 'rgba(13,16,34,1)';
    wing(ctx, lift, 1);

    // 翅羽边缘的幽蓝反光
    if (rim) {
      ctx.strokeStyle = 'rgba(' + rim + ',' + (0.46 * Math.abs(lift) + 0.20).toFixed(3) + ')';
      ctx.lineWidth = 0.035;
      ctx.lineJoin = 'round';
      var ty = -0.66 * lift;
      var tx = -0.26 - 0.16 * Math.abs(lift);
      ctx.beginPath();
      ctx.moveTo(0.13, -0.03);
      ctx.quadraticCurveTo(0.04 + tx * 0.35, ty * 0.62, tx, ty);
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------------------ */
  /* 鹊桥                                                                */
  /* ------------------------------------------------------------------ */

  function Bridge(p0, p1, W, H) {
    this.p0 = { x: p0.x, y: p0.y };
    this.p1 = { x: p1.x, y: p1.y };
    this.cp = {
      x: (p0.x + p1.x) / 2,
      y: Math.min(p0.y, p1.y) - H * 0.17
    };
    this.W = W; this.H = H;
    this.birds = [];
    this.progress = 0;   // 0~1 桥的成形度

    var n = Math.round(Q.clamp(W / 21, 24, 62));
    var tmp = {};
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0.5 : i / (n - 1);
      Q.qbez(this.p0, this.cp, this.p1, t, tmp);

      var fromLeft = t < 0.5;
      var side = fromLeft ? -1 : 1;
      var depth = Q.rand(-1, 1);                 // 前后错落

      // 由两端向中心依次抵达 —— 桥从两岸「长」向中央
      var delay = (0.5 - Math.abs(t - 0.5)) * 3.4 + Q.rand(0, 0.5);

      this.birds.push({
        t: t,
        tx: tmp.x + Q.rand(-6, 6),
        ty: tmp.y + depth * 7 - 4,
        size: Q.rand(19, 27) * (1 + depth * 0.14),
        depth: depth,
        delay: delay,
        dur: Q.rand(2.0, 2.9),
        sx: fromLeft ? -Q.rand(60, W * 0.28) : W + Q.rand(60, W * 0.28),
        sy: Q.rand(-H * 0.12, H * 0.62),
        ccx: tmp.x + side * Q.rand(W * 0.10, W * 0.26),
        ccy: Q.rand(-H * 0.16, H * 0.30),
        ph: Q.rand(0, TAU),
        flapFast: Q.rand(13, 17),
        flapSlow: Q.rand(1.4, 2.6),
        bob: Q.rand(1.6, 4.2),
        landed: false
      });
    }
    this.duration = 0;
    for (var j = 0; j < this.birds.length; j++) {
      this.duration = Math.max(this.duration, this.birds[j].delay + this.birds[j].dur);
    }
  }

  Bridge.prototype.point = function (t, out) {
    return Q.qbez(this.p0, this.cp, this.p1, t, out);
  };

  /** @param age 自开始搭桥起经过的秒数 */
  Bridge.prototype.update = function (age, t) {
    var settled = 0;
    for (var i = 0; i < this.birds.length; i++) {
      var b = this.birds[i];
      var lt = (age - b.delay) / b.dur;

      if (lt <= 0) {
        b.vis = 0;
        continue;
      }
      if (lt >= 1) {
        b.vis = 1;
        b.x = b.tx;
        b.y = b.ty + Math.sin(t * b.flapSlow + b.ph) * b.bob;
        b.a = Math.sin(t * b.flapSlow * 2.1 + b.ph);
        b.flap = t * b.flapSlow * 2.1 + b.ph;
        b.angle = Math.sin(t * 0.8 + b.ph) * 0.06 + (b.t < 0.5 ? 0.06 : -0.06);
        b.dir = b.t < 0.5 ? 1 : -1;
        if (!b.landed) b.landed = true;
        settled++;
        continue;
      }

      var e = Q.ease.inOutCubic(lt);
      var p = Q.qbez({ x: b.sx, y: b.sy }, { x: b.ccx, y: b.ccy }, { x: b.tx, y: b.ty }, e);
      var ang = Q.qbezAngle({ x: b.sx, y: b.sy }, { x: b.ccx, y: b.ccy }, { x: b.tx, y: b.ty }, e);

      b.x = p.x;
      b.y = p.y;
      b.vis = Q.smoothstep(0, 0.10, lt);
      b.flap = t * b.flapFast + b.ph;
      // 接近落位时收翅
      b.flap = t * Q.lerp(b.flapFast, b.flapSlow * 2.1, Q.smoothstep(0.72, 1, lt)) + b.ph;
      b.dir = Math.cos(ang) >= 0 ? 1 : -1;
      b.angle = b.dir > 0 ? ang : ang - Math.PI;
    }
    this.progress = settled / this.birds.length;
  };

  Bridge.prototype.draw = function (ctx, t) {
    // 桥体光带
    if (this.progress > 0.02) {
      var a = Q.smoothstep(0.05, 0.85, this.progress);
      ctx.globalCompositeOperation = 'lighter';

      var pulse = 0.82 + 0.18 * Math.sin(t * 1.1);
      var lg = ctx.createLinearGradient(this.p0.x, this.p0.y, this.p1.x, this.p1.y);
      lg.addColorStop(0.00, 'rgba(168,206,255,0)');
      lg.addColorStop(0.16, 'rgba(186,214,255,' + (0.20 * a * pulse).toFixed(3) + ')');
      lg.addColorStop(0.50, 'rgba(255,235,206,' + (0.34 * a * pulse).toFixed(3) + ')');
      lg.addColorStop(0.84, 'rgba(255,214,196,' + (0.20 * a * pulse).toFixed(3) + ')');
      lg.addColorStop(1.00, 'rgba(255,196,180,0)');

      ctx.strokeStyle = lg;
      ctx.lineCap = 'round';

      ctx.lineWidth = 26;
      ctx.globalAlpha = 0.32;
      this._stroke(ctx);
      ctx.lineWidth = 9;
      ctx.globalAlpha = 0.55;
      this._stroke(ctx);
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = 0.9;
      this._stroke(ctx);
      ctx.globalAlpha = 1;

      // 沿桥流动的光粒
      var flow = 16;
      for (var i = 0; i < flow; i++) {
        var ft = ((t * 0.09 + i / flow) % 1);
        var pp = this.point(ft);
        var fa = Math.sin(ft * Math.PI) * a * 0.75;
        Q.glow(ctx, '255,238,206', pp.x, pp.y, 13, fa * 0.7);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // 喜鹊
    for (var j = 0; j < this.birds.length; j++) {
      var b = this.birds[j];
      if (!b.vis) continue;
      var sc = b.dir > 0 ? b.size : b.size;
      ctx.save();
      if (b.dir < 0) {
        ctx.translate(b.x, b.y);
        ctx.scale(-1, 1);
        Q.drawMagpie(ctx, 0, 0, sc, -b.angle, b.flap, b.vis, '128,168,224');
      } else {
        Q.drawMagpie(ctx, b.x, b.y, sc, b.angle, b.flap, b.vis, '128,168,224');
      }
      ctx.restore();
    }
  };

  Bridge.prototype._stroke = function (ctx) {
    ctx.beginPath();
    ctx.moveTo(this.p0.x, this.p0.y);
    ctx.quadraticCurveTo(this.cp.x, this.cp.y, this.p1.x, this.p1.y);
    ctx.stroke();
  };

  Q.Bridge = Bridge;

})(window.Q);
