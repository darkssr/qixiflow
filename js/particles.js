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
    this.rate = Q.clamp(W / 700, 0.5, 2.2) * 5.5;   // 每秒生成数
  }

  Petals.prototype.resize = function (W, H) { this.W = W; this.H = H; };

  Petals.prototype.spawn = function (above) {
    var W = this.W, H = this.H;
    this.list.push({
      x: Q.rand(-40, W + 40),
      y: above === undefined ? Q.rand(-120, -10) : above,
      vx: Q.rand(-16, 16),
      vy: Q.rand(16, 40),
      s: Q.rand(3.6, 8.4),
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
      ctx.globalAlpha = p.a * 0.9;

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

  Q.Petals = Petals;
  Q.Motes = Motes;
  Q.Fireworks = Fireworks;
  Q.Lanterns = Lanterns;
  Q.heartPoint = heartPoint;

})(window.Q);
