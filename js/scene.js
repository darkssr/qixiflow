/* 七夕 · 鹊桥仙 —— 场景编排与主循环 */
(function (Q) {
  'use strict';

  var TAU = Q.TAU;

  /* ---------------- 时间轴（秒） ---------------- */
  var CUE = {
    titleIn:  0.7,
    starsIn:  2.6,
    titleOut: 5.6,
    bridge:   6.5,
    cross:    13.6,
    meet:     16.4,
    poem:     17.1,
    dock:     18.0
  };
  var CROSS_DUR = CUE.meet - CUE.cross;

  var POEM = [
    '纤云弄巧，飞星传恨',
    '银汉迢迢暗渡',
    '金风玉露一相逢',
    '便胜却人间无数',
    '两情若是久长时',
    '又岂在朝朝暮暮'
  ];

  /* ---------------- 画布 ---------------- */
  var cvs = document.getElementById('scene');
  var ctx = cvs.getContext('2d', { alpha: false });
  var W = 0, H = 0, DPR = 1, horizon = 0;

  var sky, bridge, petals, motes, fireworks, lanterns;
  var vega, altair, meetPt;
  var T = 0, last = 0, fired = {};
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var scratch = {};

  var el = {
    title:  document.getElementById('title'),
    poem:   document.getElementById('poem'),
    hint:   document.getElementById('hint'),
    dock:   document.getElementById('dock'),
    wish:   document.getElementById('wish'),
    send:   document.getElementById('send'),
    replay: document.getElementById('replay'),
    sound:  document.getElementById('sound')
  };

  /* ------------------------------------------------------------------ */
  /* 布局                                                                */
  /* ------------------------------------------------------------------ */

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width  = Math.round(W * DPR);
    cvs.height = Math.round(H * DPR);
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    horizon = H * 0.745;

    var spread = W < 760 ? 0.295 : 0.265;
    var ny1 = 0.335, ny2 = 0.395;

    vega = {
      home: {
        x: Q.clamp(Q.riverX(ny1, W) - W * spread, W * 0.12, W * 0.40),
        y: H * ny1
      },
      rgb: '150,198,255', core: '242,249,255', r: 6.4,
      name: '织女'
    };
    altair = {
      home: {
        x: Q.clamp(Q.riverX(ny2, W) + W * spread, W * 0.60, W * 0.80),
        y: H * ny2
      },
      rgb: '255,196,120', core: '255,248,232', r: 6.1,
      name: '牵牛'
    };
    vega.x = vega.home.x; vega.y = vega.home.y;
    altair.x = altair.home.x; altair.y = altair.home.y;

    sky = (sky || new Q.Sky()).build(W, H, DPR);
    sky._glints = null;

    bridge = new Q.Bridge(vega.home, altair.home, W, H);
    meetPt = bridge.point(0.5, {});

    if (!petals) {
      petals   = new Q.Petals(W, H);
      motes    = new Q.Motes(W, H);
      fireworks = new Q.Fireworks();
      lanterns = new Q.Lanterns(W, H);
    } else {
      petals.resize(W, H);
      motes.resize(W, H);
      lanterns.resize(W, H);
      petals.rate = Q.clamp(W / 700, 0.5, 2.2) * 5.5;
    }
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */

  function buildPoem() {
    var html = '';
    for (var c = 0; c < POEM.length; c++) {
      html += '<div class="col">';
      var chars = POEM[c].split('');
      for (var i = 0; i < chars.length; i++) {
        var d = (c * 0.52 + i * 0.10).toFixed(2);
        html += '<span class="ch" style="--d:' + d + 's">' + chars[i] + '</span>';
      }
      html += '</div>';
    }
    var sd = (POEM.length * 0.52 + 0.5).toFixed(2);
    html += '<div class="col sign">';
    '秦观·鹊桥仙'.split('').forEach(function (ch, i) {
      html += '<span class="ch" style="--d:' + (+sd + i * 0.07).toFixed(2) + 's">' + ch + '</span>';
    });
    html += '</div>';
    html += '<div class="seal" style="--d:' + (+sd + 0.8).toFixed(2) + 's">' +
            '<span>七</span><span>夕</span></div>';

    el.poem.classList.remove('on');
    el.poem.innerHTML = html;
    // 强制重排，确保重播时动画重新触发
    void el.poem.offsetWidth;
  }

  function resetUI() {
    el.title.classList.remove('show', 'hide');
    el.hint.classList.remove('on');
    el.dock.classList.remove('on');
    buildPoem();
  }

  function once(key, time, fn) {
    if (!fired[key] && T >= time) {
      fired[key] = true;
      fn();
    }
  }

  function restart() {
    T = 0;
    fired = {};
    bridge = new Q.Bridge(vega.home, altair.home, W, H);
    meetPt = bridge.point(0.5, {});
    fireworks.parts.length = 0;
    fireworks.rings.length = 0;
    petals.list.length = 0;
    resetUI();
  }

  /* ------------------------------------------------------------------ */
  /* 绘制单颗星                                                          */
  /* ------------------------------------------------------------------ */

  function drawStar(x, y, r, rgb, core, t, k, spin) {
    if (k <= 0.01) return;
    var breathe = 0.88 + 0.12 * Math.sin(t * 1.5 + x * 0.01);
    var R = r * k * breathe;

    Q.glow(ctx, rgb, x, y, R * 15, 0.42 * k);
    Q.glow(ctx, rgb, x, y, R * 6.2, 0.60 * k);
    Q.glow(ctx, core, x, y, R * 2.4, 0.95 * k);

    // 十字光芒
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((spin || 0) * 0.12);
    var spike = R * 13;
    for (var s = 0; s < 2; s++) {
      var len = s === 0 ? spike : spike * 0.52;
      var wdt = s === 0 ? 1.1 : 0.8;
      ctx.rotate(s === 0 ? 0 : Math.PI / 4);
      var g1 = ctx.createLinearGradient(-len, 0, len, 0);
      g1.addColorStop(0, 'rgba(' + rgb + ',0)');
      g1.addColorStop(0.5, 'rgba(' + core + ',' + (0.55 * k).toFixed(3) + ')');
      g1.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g1;
      ctx.fillRect(-len, -wdt / 2, len * 2, wdt);
      var g2 = ctx.createLinearGradient(0, -len * 0.62, 0, len * 0.62);
      g2.addColorStop(0, 'rgba(' + rgb + ',0)');
      g2.addColorStop(0.5, 'rgba(' + core + ',' + (0.45 * k).toFixed(3) + ')');
      g2.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g2;
      ctx.fillRect(-wdt / 2, -len * 0.62, wdt, len * 1.24);
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,' + (0.96 * k).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, R * 0.62, 0, TAU);
    ctx.fill();
  }

  /* ------------------------------------------------------------------ */
  /* 主循环                                                              */
  /* ------------------------------------------------------------------ */

  function frame(now) {
    requestAnimationFrame(frame);

    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    T += dt;
    var t = T;

    /* --- 视差 --- */
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    var px = -pointer.x * 16, py = -pointer.y * 10;

    /* --- 时间轴事件 --- */
    once('titleIn', CUE.titleIn, function () { el.title.classList.add('show'); });
    once('titleOut', CUE.titleOut, function () {
      el.title.classList.remove('show');
      el.title.classList.add('hide');
    });
    once('bridgeSfx', CUE.bridge, function () { Q.sound.pluck(0, 0.5); });
    once('crossSfx', CUE.cross, function () { Q.sound.pluck(4, 0.6); });
    once('meet', CUE.meet, function () {
      fireworks.burstHeart(meetPt.x, meetPt.y, Math.max(2.6, W / 380), null);
      fireworks.burstStar(meetPt.x, meetPt.y, 90,
        ['255,246,226', '255,214,168', '206,226,255', '255,196,206'], 420);
      fireworks.ring(meetPt.x, meetPt.y, Math.max(200, W * 0.30), 1.5);
      fireworks.ring(meetPt.x, meetPt.y, Math.max(120, W * 0.17), 1.0);
      Q.sound.pluck(7, 1);
      setTimeout(function () { Q.sound.pluck(9, 0.7); }, 150);
      setTimeout(function () { Q.sound.pluck(12, 0.5); }, 330);
      for (var i = 0; i < 26; i++) petals.spawn(Q.rand(-H * 0.2, H * 0.1));
    });
    once('poem', CUE.poem, function () { el.poem.classList.add('on'); });
    once('dock', CUE.dock, function () {
      el.dock.classList.add('on');
      el.hint.classList.add('on');
    });

    /* --- 阶段量 --- */
    var reveal   = Q.smoothstep(0.2, 3.4, t);                      // 星空显影
    var starK    = Q.smoothstep(CUE.starsIn, CUE.starsIn + 2.2, t); // 双星亮起
    var bridgeAge = t - CUE.bridge;
    var crossT   = Q.clamp((t - CUE.cross) / CROSS_DUR, 0, 1);
    var afterMeet = Math.max(0, t - CUE.meet);
    var flash    = Math.max(0, 1 - afterMeet / 0.85);

    /* --- 双星位置 --- */
    if (t < CUE.meet) {
      var e = Q.ease.inOutCubic(crossT);
      var pv = bridge.point(Q.lerp(0, 0.5, e), scratch);
      vega.x = pv.x; vega.y = pv.y;
      var pa = bridge.point(Q.lerp(1, 0.5, e), scratch);
      altair.x = pa.x; altair.y = pa.y;
    } else {
      var orbR = Q.lerp(34, 13, Q.smoothstep(0, 4, afterMeet));
      var oa = afterMeet * 0.5;
      vega.x   = meetPt.x + Math.cos(oa) * orbR;
      vega.y   = meetPt.y + Math.sin(oa) * orbR * 0.42;
      altair.x = meetPt.x - Math.cos(oa) * orbR;
      altair.y = meetPt.y - Math.sin(oa) * orbR * 0.42;
    }

    /* --- 更新 --- */
    if (bridgeAge > 0) bridge.update(bridgeAge, t);
    petals.update(dt, Q.smoothstep(CUE.meet - 1, CUE.meet + 2.5, t) * 0.85 + 0.15);
    motes.update(dt, t);
    fireworks.update(dt);
    lanterns.update(dt, t);

    /* ================= 绘制 ================= */

    sky.background(ctx, W, H, horizon);
    sky.draw(ctx, W, H, t, dt, reveal, px, py);
    sky.mountains(ctx, W, H, horizon, reveal);
    sky.water(ctx, W, H, horizon, t, reveal);

    // 双星在水面的倒影
    if (starK > 0.02) {
      sky.reflectLight(ctx, W, H, horizon, vega.x, vega.rgb, starK * 0.55, t);
      sky.reflectLight(ctx, W, H, horizon, altair.x, altair.rgb, starK * 0.55, t + 3);
    }

    // 鹊桥
    if (bridgeAge > 0) bridge.draw(ctx, t);

    // 相会后的暖色晕
    if (afterMeet > 0) {
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, '255,222,180', meetPt.x, meetPt.y,
             Q.lerp(60, 190, Q.smoothstep(0, 2.4, afterMeet)),
             0.30 * Q.smoothstep(0, 1.6, afterMeet) * (0.9 + 0.1 * Math.sin(t * 0.9)));
      ctx.globalCompositeOperation = 'source-over';
    }

    // 双星
    ctx.globalCompositeOperation = 'lighter';
    var boost = 1 + flash * 2.2;
    drawStar(vega.x, vega.y, vega.r * boost, vega.rgb, vega.core, t, starK, t);
    drawStar(altair.x, altair.y, altair.r * boost, altair.rgb, altair.core, t, starK, -t);
    ctx.globalCompositeOperation = 'source-over';

    // 相会闪光
    if (flash > 0.001) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,242,222,' + (flash * flash * 0.52).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    lanterns.draw(ctx, t);
    fireworks.draw(ctx);
    motes.draw(ctx, t, Q.smoothstep(1.5, 5, t));
    petals.draw(ctx);

    // 暗角
    if (!frame._vig || frame._vigW !== W || frame._vigH !== H) {
      frame._vigW = W; frame._vigH = H;
      var vg = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.30,
                                        W / 2, H * 0.46, Math.max(W, H) * 0.78);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.62, 'rgba(2,3,10,0.18)');
      vg.addColorStop(1, 'rgba(1,2,7,0.62)');
      frame._vig = vg;
    }
    ctx.fillStyle = frame._vig;
    ctx.fillRect(0, 0, W, H);
  }

  /* ------------------------------------------------------------------ */
  /* 交互                                                                */
  /* ------------------------------------------------------------------ */

  var noteIdx = 0;

  function bloom(x, y) {
    fireworks.burstHeart(x, y, Q.rand(1.5, 2.6), null);
    fireworks.burstStar(x, y, 16, ['255,236,206', '255,196,214', '214,228,255'], 190);
    Q.sound.pluck(Q.pick([0, 2, 4, 5, 7, 9]), 0.55);
    noteIdx++;
    for (var i = 0; i < 3; i++) petals.spawn(y - Q.rand(0, 40));
  }

  cvs.addEventListener('pointerdown', function (e) {
    bloom(e.clientX, e.clientY);
  });

  window.addEventListener('pointermove', function (e) {
    pointer.tx = (e.clientX / W) * 2 - 1;
    pointer.ty = (e.clientY / H) * 2 - 1;
  });

  el.replay.addEventListener('click', function () { restart(); });

  el.sound.addEventListener('click', function () {
    Q.sound.enabled = !Q.sound.enabled;
    el.sound.classList.toggle('off', !Q.sound.enabled);
    el.sound.textContent = Q.sound.enabled ? '♪' : '♪̸';
    if (Q.sound.enabled) Q.sound.pluck(4, 0.5);
  });

  function release() {
    var v = el.wish.value.trim();
    lanterns.release(v || '心想事成');
    el.wish.value = '';
    Q.sound.pluck(Q.pick([0, 4, 7]), 0.5);
  }
  el.send.addEventListener('click', release);
  el.wish.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); release(); }
  });

  window.addEventListener('keydown', function (e) {
    if (e.target === el.wish) return;
    if (e.key === 'r' || e.key === 'R') restart();
  });

  var rTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(rTimer);
    rTimer = setTimeout(function () {
      var keep = T;
      layout();
      T = keep;
      if (T > CUE.bridge) bridge.update(T - CUE.bridge, T);
    }, 220);
  });

  /* ------------------------------------------------------------------ */

  layout();
  resetUI();
  requestAnimationFrame(frame);

})(window.Q);
