/* 七夕 · 鹊桥仙 —— 牛郎与织女
 *
 * 局部坐标系：裙裾/袍角落在 (0,0)，头顶 y = -1，面朝 +x，通身高度 1。
 * 由 ctx.scale(dir * h, h) 控制朝向与尺寸。
 *
 * 造型取古神话「嫦娥奔月 / 敦煌飞天」的意象：
 *   织女 —— 双环望仙髻、步摇、广袖曳地长裙、三重飘带凌空
 *   牛郎 —— 束发冠带、宽肩劲装、革带佩绶、大氅当风
 */
(function (Q) {
  'use strict';

  var TAU = Q.TAU;

  /* ---------- 锥形飘带 ---------- */
  function ribbon(ctx, fn, n, w0, w1, fill, edge) {
    var top = [], bot = [], i, s, p, p2, dx, dy, L, nx, ny, w;
    for (i = 0; i <= n; i++) {
      s = i / n;
      p = fn(s);
      p2 = fn(Math.min(1, s + 0.012));
      dx = p2.x - p.x; dy = p2.y - p.y;
      L = Math.hypot(dx, dy) || 1;
      nx = -dy / L; ny = dx / L;
      w = Q.lerp(w0, w1, s) * 0.5;
      top.push(p.x + nx * w, p.y + ny * w);
      bot.push(p.x - nx * w, p.y - ny * w);
    }
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    for (i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
    for (i = bot.length - 2; i >= 0; i -= 2) ctx.lineTo(bot[i], bot[i + 1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    if (edge) {                       // 迎光的一道亮边，让绸带不像烟
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      for (i = 2; i < top.length; i += 2) ctx.lineTo(top[i], top[i + 1]);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 0.009;
      ctx.stroke();
    }
  }

  /* 一条向后飘的绸：起点在原点，尾端在 -x 方向 */
  function streamer(len, rise, amp, freq, t, phase) {
    return function (s) {
      var k = 0.18 + s * 0.95;
      return {
        x: -s * len + Math.sin(s * 2.4 + t * 0.7 + phase) * amp * 0.30,
        y: -rise * s + Math.sin(s * freq * Math.PI + t * 1.9 + phase) * amp * k
      };
    };
  }

  /* 手臂：从肩到手的一段锥形笔画 */
  function limb(ctx, x0, y0, cx, cy, x1, y1, w, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }

  /* ================================================================== */
  /* 织女                                                                */
  /* ================================================================== */

  function drawZhinu(ctx, t, k) {
    var sway = Math.sin(t * 0.9) * 0.012;
    var breath = Math.sin(t * 1.3) * 0.007;
    var reach = 0.016 * Math.sin(t * 0.7);

    /* --- 身后三重飘带 --- */
    var ribs = [
      { y: -0.775, len: 0.70, rise: 0.20, amp: 0.105, f: 1.9, w: 0.052,
        fill: 'rgba(206,230,255,0.42)', edge: 'rgba(240,250,255,0.55)' },
      { y: -0.715, len: 0.92, rise: 0.03, amp: 0.125, f: 2.3, w: 0.044,
        fill: 'rgba(176,212,255,0.34)', edge: 'rgba(226,242,255,0.42)' },
      { y: -0.640, len: 0.78, rise: -0.10, amp: 0.095, f: 2.7, w: 0.036,
        fill: 'rgba(150,192,248,0.26)', edge: null }
    ];
    for (var r = 0; r < ribs.length; r++) {
      var R = ribs[r];
      ctx.save();
      ctx.translate(-0.035, R.y);
      ribbon(ctx, streamer(R.len, R.rise, R.amp, R.f, t, r * 2.3), 24,
             R.w, 0.006, R.fill, R.edge);
      ctx.restore();
    }

    /* --- 身后垂发 --- */
    ctx.fillStyle = 'rgba(26,32,60,0.90)';
    ctx.beginPath();
    ctx.moveTo(-0.030, -0.880);
    ctx.quadraticCurveTo(-0.105, -0.775, -0.092, -0.600);
    ctx.quadraticCurveTo(-0.066, -0.562, -0.044, -0.612);
    ctx.quadraticCurveTo(-0.046, -0.772, 0.000, -0.858);
    ctx.closePath();
    ctx.fill();

    /* --- 后袖（在身体之后） --- */
    limb(ctx, -0.052, -0.778, -0.112, -0.728, -0.140, -0.640, 0.042,
         'rgba(206,230,255,0.90)');
    ctx.fillStyle = 'rgba(198,226,255,0.80)';
    ctx.beginPath();
    ctx.moveTo(-0.040, -0.762);
    ctx.quadraticCurveTo(-0.126, -0.706, -0.156, -0.632);
    ctx.quadraticCurveTo(-0.196, -0.520, -0.142, -0.492);
    ctx.quadraticCurveTo(-0.104, -0.566, -0.086, -0.640);
    ctx.quadraticCurveTo(-0.070, -0.706, -0.026, -0.736);
    ctx.closePath();
    ctx.fill();

    /* --- 曳地长裙 --- */
    var skirt = ctx.createLinearGradient(0, -0.64, 0, 0.05);
    skirt.addColorStop(0.00, 'rgba(242,250,255,0.97)');
    skirt.addColorStop(0.38, 'rgba(198,226,255,0.94)');
    skirt.addColorStop(1.00, 'rgba(122,166,234,0.74)');
    ctx.fillStyle = skirt;
    ctx.beginPath();
    ctx.moveTo(0.052, -0.640);
    ctx.quadraticCurveTo(0.096, -0.380, 0.112 + sway, -0.055);
    ctx.quadraticCurveTo(0.062, 0.022, -0.044, 0.024);
    ctx.quadraticCurveTo(-0.184, 0.028, -0.312 + sway * 2.2, -0.048);  // 曳出的裙尾
    ctx.quadraticCurveTo(-0.186, -0.118, -0.100, -0.320);
    ctx.quadraticCurveTo(-0.070, -0.480, -0.050, -0.640);
    ctx.closePath();
    ctx.fill();

    // 裙上行云纹
    ctx.strokeStyle = 'rgba(255,255,255,0.26)';
    ctx.lineWidth = 0.010;
    ctx.beginPath();
    ctx.moveTo(-0.072, -0.330);
    ctx.quadraticCurveTo(0.008, -0.276, 0.094, -0.316);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.086, -0.196);
    ctx.quadraticCurveTo(0.004, -0.140, 0.104, -0.182);
    ctx.stroke();

    /* --- 上身 --- */
    var body = ctx.createLinearGradient(0, -0.82, 0, -0.60);
    body.addColorStop(0, 'rgba(250,253,255,0.98)');
    body.addColorStop(1, 'rgba(214,236,255,0.96)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-0.058, -0.788);
    ctx.quadraticCurveTo(0.000, -0.812, 0.058, -0.788);
    ctx.quadraticCurveTo(0.056, -0.706, 0.050, -0.634);
    ctx.lineTo(-0.050, -0.634);
    ctx.quadraticCurveTo(-0.056, -0.706, -0.058, -0.788);
    ctx.closePath();
    ctx.fill();

    // 交领
    ctx.strokeStyle = 'rgba(128,172,228,0.62)';
    ctx.lineWidth = 0.011;
    ctx.beginPath();
    ctx.moveTo(-0.024, -0.790);
    ctx.lineTo(0.006, -0.726);
    ctx.lineTo(0.040, -0.784);
    ctx.stroke();

    // 束腰（鹅黄绦带）
    ctx.fillStyle = 'rgba(255,226,166,0.88)';
    ctx.fillRect(-0.052, -0.660, 0.104, 0.024);
    ctx.strokeStyle = 'rgba(255,226,166,0.60)';
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(-0.010, -0.636);
    ctx.quadraticCurveTo(-0.024, -0.520, -0.014, -0.412);
    ctx.stroke();

    /* --- 前臂：向对岸伸出（斜向下，避免横板感） --- */
    limb(ctx, 0.048, -0.780, 0.120, -0.752, 0.174 + reach, -0.684, 0.038,
         'rgba(240,250,255,0.97)');
    // 广袖垂落
    ctx.fillStyle = 'rgba(226,242,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(0.034, -0.768);
    ctx.quadraticCurveTo(0.118, -0.742, 0.166 + reach, -0.680);
    ctx.quadraticCurveTo(0.176 + reach, -0.644, 0.140, -0.616);
    ctx.quadraticCurveTo(0.118, -0.524, 0.070, -0.514);
    ctx.quadraticCurveTo(0.040, -0.522, 0.048, -0.618);
    ctx.quadraticCurveTo(0.048, -0.712, 0.036, -0.760);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,182,236,0.60)';   // 描边，把袖子从衣身里分出来
    ctx.lineWidth = 0.008;
    ctx.stroke();
    // 手
    ctx.fillStyle = 'rgba(255,250,242,0.96)';
    ctx.beginPath();
    ctx.arc(0.178 + reach, -0.682, 0.016, 0, TAU);
    ctx.fill();

    /* --- 头 --- */
    ctx.fillStyle = 'rgba(255,250,243,0.98)';
    ctx.beginPath();
    ctx.ellipse(0.008, -0.892 + breath, 0.050, 0.062, 0.05, 0, TAU);
    ctx.fill();

    // 后脑与鬓发
    ctx.fillStyle = 'rgba(28,34,62,0.95)';
    ctx.beginPath();
    ctx.moveTo(0.030, -0.944 + breath);
    ctx.quadraticCurveTo(-0.048, -0.968 + breath, -0.052, -0.884 + breath);
    ctx.quadraticCurveTo(-0.054, -0.836 + breath, -0.026, -0.828 + breath);
    ctx.quadraticCurveTo(-0.036, -0.892 + breath, 0.012, -0.918 + breath);
    ctx.closePath();
    ctx.fill();

    // 双环望仙髻
    ctx.beginPath();
    ctx.ellipse(-0.022, -0.988 + breath, 0.042, 0.031, -0.28, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.034, -0.978 + breath, 0.034, 0.027, 0.32, 0, TAU);
    ctx.fill();

    // 步摇
    ctx.fillStyle = 'rgba(255,214,138,0.96)';
    ctx.beginPath();
    ctx.arc(0.058, -0.952 + breath, 0.011, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,138,0.72)';
    ctx.lineWidth = 0.006;
    ctx.beginPath();
    ctx.moveTo(0.060, -0.944 + breath);
    ctx.quadraticCurveTo(0.074, -0.916, 0.064, -0.888 + breath);
    ctx.stroke();

    /* --- 眉眼与朱唇 --- */
    ctx.strokeStyle = 'rgba(46,42,60,0.80)';
    ctx.lineWidth = 0.0055;
    ctx.lineCap = 'round';
    ctx.beginPath();                                   // 远山眉
    ctx.moveTo(0.024, -0.916 + breath);
    ctx.quadraticCurveTo(0.038, -0.924 + breath, 0.050, -0.914 + breath);
    ctx.stroke();
    ctx.beginPath();                                   // 眼
    ctx.moveTo(0.026, -0.898 + breath);
    ctx.quadraticCurveTo(0.038, -0.903 + breath, 0.049, -0.895 + breath);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,72,74,0.72)';            // 朱唇
    ctx.beginPath();
    ctx.ellipse(0.038, -0.862 + breath, 0.0085, 0.005, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,72,74,0.50)';            // 花钿
    ctx.beginPath();
    ctx.arc(0.034, -0.934 + breath, 0.005, 0, TAU);
    ctx.fill();

    /* --- 迎光边缘 --- */
    ctx.strokeStyle = 'rgba(232,246,255,' + (0.66 * k).toFixed(3) + ')';
    ctx.lineWidth = 0.010;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0.058, -0.788);
    ctx.quadraticCurveTo(0.056, -0.706, 0.052, -0.640);
    ctx.quadraticCurveTo(0.096, -0.380, 0.112 + sway, -0.055);
    ctx.stroke();
  }

  /* ================================================================== */
  /* 牛郎                                                                */
  /* ================================================================== */

  function drawNiulang(ctx, t, k) {
    var sway = Math.sin(t * 0.8 + 1.2) * 0.011;
    var breath = Math.sin(t * 1.2 + 0.6) * 0.006;
    var reach = 0.018 * Math.sin(t * 0.7 + 0.9);
    var wind = Math.sin(t * 1.6);

    /* --- 身后大氅当风（半透，尾摆作三折波） --- */
    var cape = ctx.createLinearGradient(-0.32, -0.78, 0.02, -0.02);
    cape.addColorStop(0.00, 'rgba(214,150,86,0.30)');
    cape.addColorStop(0.50, 'rgba(178,116,66,0.26)');
    cape.addColorStop(1.00, 'rgba(96,62,40,0.16)');
    ctx.fillStyle = cape;
    ctx.beginPath();
    ctx.moveTo(-0.072, -0.798);
    ctx.quadraticCurveTo(-0.236, -0.706 + wind * 0.022, -0.292, -0.520 + wind * 0.032);
    ctx.quadraticCurveTo(-0.348, -0.336 + wind * 0.042, -0.262, -0.150 + wind * 0.038);
    ctx.quadraticCurveTo(-0.222, -0.216, -0.196, -0.156 + wind * 0.020);   // 尾摆折角
    ctx.quadraticCurveTo(-0.162, -0.226, -0.140, -0.170 + wind * 0.014);
    ctx.quadraticCurveTo(-0.118, -0.300, -0.098, -0.420);
    ctx.quadraticCurveTo(-0.070, -0.600, -0.038, -0.784);
    ctx.closePath();
    ctx.fill();
    // 大氅迎光的一道边
    ctx.strokeStyle = 'rgba(255,222,166,0.34)';
    ctx.lineWidth = 0.008;
    ctx.beginPath();
    ctx.moveTo(-0.072, -0.798);
    ctx.quadraticCurveTo(-0.236, -0.706 + wind * 0.022, -0.292, -0.520 + wind * 0.032);
    ctx.quadraticCurveTo(-0.348, -0.336 + wind * 0.042, -0.262, -0.150 + wind * 0.038);
    ctx.stroke();

    /* --- 冠带飘带 --- */
    for (var r = 0; r < 2; r++) {
      ctx.save();
      ctx.translate(-0.040, -0.936 + r * 0.026);
      ribbon(ctx, streamer(0.40 + r * 0.14, 0.02 - r * 0.06, 0.062 + r * 0.018,
                           2.3 + r * 0.5, t, 1.1 + r * 2.4), 18,
             0.017, 0.004,
             r ? 'rgba(255,232,182,0.30)' : 'rgba(255,242,206,0.42)',
             r ? null : 'rgba(255,250,232,0.55)');
      ctx.restore();
    }

    /* --- 后臂 --- */
    limb(ctx, -0.086, -0.768, -0.144, -0.708, -0.158, -0.610, 0.046,
         'rgba(244,212,158,0.90)');
    ctx.fillStyle = 'rgba(240,206,150,0.82)';
    ctx.beginPath();
    ctx.moveTo(-0.074, -0.752);
    ctx.quadraticCurveTo(-0.158, -0.694, -0.176, -0.606);
    ctx.quadraticCurveTo(-0.204, -0.516, -0.150, -0.490);
    ctx.quadraticCurveTo(-0.118, -0.552, -0.106, -0.616);
    ctx.quadraticCurveTo(-0.094, -0.684, -0.056, -0.720);
    ctx.closePath();
    ctx.fill();

    /* --- 皂靴 --- */
    ctx.fillStyle = 'rgba(22,26,44,0.94)';
    ctx.beginPath();
    ctx.moveTo(0.020, -0.070);
    ctx.lineTo(0.070, -0.070);
    ctx.quadraticCurveTo(0.082, -0.020, 0.062, 0.004);
    ctx.lineTo(0.014, 0.004);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.066, -0.070);
    ctx.lineTo(-0.016, -0.070);
    ctx.lineTo(-0.020, 0.002);
    ctx.lineTo(-0.078, 0.002);
    ctx.quadraticCurveTo(-0.082, -0.030, -0.066, -0.070);
    ctx.closePath();
    ctx.fill();

    /* --- 下裳（劲挺、前开衩） --- */
    var robe = ctx.createLinearGradient(0, -0.63, 0, 0.03);
    robe.addColorStop(0.00, 'rgba(255,246,224,0.97)');
    robe.addColorStop(0.42, 'rgba(246,204,142,0.94)');
    robe.addColorStop(1.00, 'rgba(178,124,68,0.80)');
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(0.070, -0.630);
    ctx.quadraticCurveTo(0.092, -0.400, 0.096 + sway, -0.140);
    ctx.quadraticCurveTo(0.100, -0.052, 0.062, -0.020);
    ctx.lineTo(0.016, -0.024);
    ctx.quadraticCurveTo(0.030, -0.180, 0.014, -0.330);     // 前开衩
    ctx.quadraticCurveTo(-0.004, -0.180, -0.014, -0.026);
    ctx.lineTo(-0.070, -0.030);
    ctx.quadraticCurveTo(-0.114, -0.070, -0.106 + sway, -0.170);
    ctx.quadraticCurveTo(-0.098, -0.400, -0.070, -0.630);
    ctx.closePath();
    ctx.fill();

    /* --- 上身：宽肩收腰 --- */
    var torso = ctx.createLinearGradient(0, -0.80, 0, -0.62);
    torso.addColorStop(0, 'rgba(255,250,236,0.98)');
    torso.addColorStop(1, 'rgba(250,218,162,0.96)');
    ctx.fillStyle = torso;
    ctx.beginPath();
    ctx.moveTo(-0.098, -0.776);
    ctx.quadraticCurveTo(-0.086, -0.812, 0.000, -0.822);   // 肩线
    ctx.quadraticCurveTo(0.086, -0.812, 0.098, -0.776);
    ctx.quadraticCurveTo(0.084, -0.706, 0.066, -0.634);    // 收腰
    ctx.lineTo(-0.066, -0.634);
    ctx.quadraticCurveTo(-0.084, -0.706, -0.098, -0.776);
    ctx.closePath();
    ctx.fill();

    // 交领右衽
    ctx.strokeStyle = 'rgba(174,116,58,0.66)';
    ctx.lineWidth = 0.013;
    ctx.beginPath();
    ctx.moveTo(-0.040, -0.796);
    ctx.lineTo(0.008, -0.700);
    ctx.lineTo(0.060, -0.788);
    ctx.stroke();

    // 革带 + 佩绶
    ctx.fillStyle = 'rgba(112,68,34,0.92)';
    ctx.fillRect(-0.070, -0.660, 0.140, 0.030);
    ctx.fillStyle = 'rgba(255,222,152,0.96)';
    ctx.fillRect(-0.016, -0.658, 0.032, 0.026);
    ctx.strokeStyle = 'rgba(214,158,88,0.75)';
    ctx.lineWidth = 0.009;
    ctx.beginPath();
    ctx.moveTo(0.040, -0.630);
    ctx.quadraticCurveTo(0.056, -0.520, 0.044, -0.418);
    ctx.stroke();

    /* --- 前臂：迎向织女（斜向下） --- */
    limb(ctx, 0.086, -0.768, 0.158, -0.740, 0.202 + reach, -0.672, 0.042,
         'rgba(255,242,214,0.97)');
    ctx.fillStyle = 'rgba(252,226,176,0.92)';
    ctx.beginPath();
    ctx.moveTo(0.076, -0.752);
    ctx.quadraticCurveTo(0.152, -0.728, 0.194 + reach, -0.668);
    ctx.quadraticCurveTo(0.204 + reach, -0.636, 0.170, -0.610);
    ctx.quadraticCurveTo(0.148, -0.542, 0.104, -0.538);
    ctx.quadraticCurveTo(0.080, -0.550, 0.086, -0.620);
    ctx.quadraticCurveTo(0.086, -0.700, 0.074, -0.744);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,136,74,0.62)';    // 描边，分出手臂
    ctx.lineWidth = 0.009;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,246,228,0.96)';
    ctx.beginPath();
    ctx.arc(0.206 + reach, -0.670, 0.017, 0, TAU);
    ctx.fill();

    /* --- 头 --- */
    ctx.fillStyle = 'rgba(255,246,230,0.98)';
    ctx.beginPath();
    ctx.ellipse(0.010, -0.880 + breath, 0.049, 0.059, 0.04, 0, TAU);
    ctx.fill();

    // 束发
    ctx.fillStyle = 'rgba(24,28,50,0.95)';
    ctx.beginPath();
    ctx.moveTo(0.044, -0.928 + breath);
    ctx.quadraticCurveTo(-0.030, -0.958 + breath, -0.046, -0.882 + breath);
    ctx.quadraticCurveTo(-0.050, -0.842 + breath, -0.026, -0.834 + breath);
    ctx.quadraticCurveTo(-0.030, -0.892 + breath, 0.020, -0.910 + breath);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0.004, -0.956 + breath, 0.028, 0.024, 0, 0, TAU);
    ctx.fill();
    // 玉冠束发
    ctx.fillStyle = 'rgba(208,226,248,0.88)';
    ctx.beginPath();
    ctx.moveTo(-0.026, -0.948 + breath);
    ctx.quadraticCurveTo(0.006, -0.960 + breath, 0.036, -0.944 + breath);
    ctx.lineTo(0.034, -0.934 + breath);
    ctx.quadraticCurveTo(0.006, -0.948 + breath, -0.026, -0.938 + breath);
    ctx.closePath();
    ctx.fill();

    /* --- 剑眉星目 --- */
    ctx.strokeStyle = 'rgba(34,32,48,0.86)';
    ctx.lineWidth = 0.0075;
    ctx.lineCap = 'round';
    ctx.beginPath();                                    // 剑眉
    ctx.moveTo(0.020, -0.906 + breath);
    ctx.quadraticCurveTo(0.038, -0.916 + breath, 0.052, -0.900 + breath);
    ctx.stroke();
    ctx.lineWidth = 0.0055;
    ctx.beginPath();                                    // 眼
    ctx.moveTo(0.024, -0.886 + breath);
    ctx.quadraticCurveTo(0.038, -0.890 + breath, 0.050, -0.881 + breath);
    ctx.stroke();

    /* --- 迎光边缘 --- */
    ctx.strokeStyle = 'rgba(255,236,198,' + (0.70 * k).toFixed(3) + ')';
    ctx.lineWidth = 0.011;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0.098, -0.776);
    ctx.quadraticCurveTo(0.084, -0.706, 0.070, -0.630);
    ctx.quadraticCurveTo(0.092, -0.400, 0.096 + sway, -0.140);
    ctx.stroke();
  }

  /* ================================================================== */

  var DRAW = { zhinu: drawZhinu, niulang: drawNiulang };

  /**
   * @param who   'zhinu' | 'niulang'
   * @param x,y   落脚点
   * @param h     身高（像素）
   * @param dir   1 面朝右，-1 面朝左
   * @param k     显影 0~1
   * @param aura  光晕强度
   */
  Q.drawFigure = function (ctx, who, x, y, h, t, dir, k, aura, rgb) {
    if (k <= 0.01) return;

    // 只留一层很淡的月华，把人物从夜色里托出来（不要像发光球）
    if (aura > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, rgb, x, y - h * 0.58, h * 0.92, 0.085 * aura);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir * h, h);
    ctx.globalAlpha = k;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    DRAW[who](ctx, t, k);
    ctx.restore();
    ctx.globalAlpha = 1;
  };

})(window.Q);
