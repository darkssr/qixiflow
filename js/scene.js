/* 七夕 · 鹊桥仙 —— 场景编排与主循环 */
(function (Q) {
  'use strict';

  var TAU = Q.TAU;

  /* ---------------- 时间轴（秒） ---------------- */
  var CUE = {
    titleIn:  0.7,
    titleOut: 5.6,
    starsIn:  2.6,
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

  /* ---------------- 环境 ---------------- */
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  var minSide = Math.min(screen.width, screen.height);
  var isPhone = coarse && minSide <= 820;

  /* ---------------- 画布 ---------------- */
  var cvs = document.getElementById('scene');
  var ctx = cvs.getContext('2d', { alpha: false });
  var W = 0, H = 0, DPR = 1, horizon = 0, figH = 100;

  var sky, bridge, petals, motes, fireworks, lanterns;
  var roses = [];
  var zhinu, niulang, meetPt, meetGap = 0.06;
  var T = 0, last = 0, fired = {}, paused = false;
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
    sound:  document.getElementById('sound'),
    music:  document.getElementById('music'),
    stay:   document.getElementById('stay')
  };

  /* ------------------------------------------------------------------ */
  /* 布局                                                                */
  /* ------------------------------------------------------------------ */

  function layout() {
    DPR = Math.min(window.devicePixelRatio || 1, isPhone ? 1.6 : 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    cvs.width  = Math.round(W * DPR);
    cvs.height = Math.round(H * DPR);
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    horizon = H * 0.745;
    figH = Q.clamp(Math.min(H * 0.20, W * 0.10), 60, 180);

    var spread = W < 760 ? 0.30 : 0.265;
    var ny1 = 0.345, ny2 = 0.405;

    zhinu = zhinu || { who: 'zhinu', dir: 1, rgb: '150,198,255', ph: 0 };
    niulang = niulang || { who: 'niulang', dir: -1, rgb: '255,196,120', ph: 1.7 };

    zhinu.home = {
      x: Q.clamp(Q.riverX(ny1, W) - W * spread, W * 0.13, W * 0.40),
      y: H * ny1
    };
    niulang.home = {
      x: Q.clamp(Q.riverX(ny2, W) + W * spread, W * 0.60, W * 0.80),
      y: H * ny2
    };
    zhinu.x = zhinu.home.x;   zhinu.y = zhinu.home.y;
    niulang.x = niulang.home.x; niulang.y = niulang.home.y;

    sky = (sky || new Q.Sky()).build(W, H, DPR);
    sky._glints = null;

    bridge = new Q.Bridge(zhinu.home, niulang.home, W, H);
    meetPt = bridge.point(0.5, {});
    meetGap = Q.clamp(figH * 0.42 / Math.hypot(
      niulang.home.x - zhinu.home.x, niulang.home.y - zhinu.home.y), 0.03, 0.15);

    if (!petals) {
      petals    = new Q.Petals(W, H);
      motes     = new Q.Motes(W, H);
      fireworks = new Q.Fireworks();
      lanterns  = new Q.Lanterns(W, H);
    } else {
      petals.resize(W, H);
      motes.resize(W, H);
      lanterns.resize(W, H);
      petals.rate = Q.clamp(W / 700, 0.5, 2.2) * 2.6;
    }
    if (isPhone) petals.rate *= 0.65;

    frame._vig = null;
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */

  function buildPoem() {
    var html = '', c, i, chars, d;
    for (c = 0; c < POEM.length; c++) {
      html += '<div class="col">';
      chars = POEM[c].split('');
      for (i = 0; i < chars.length; i++) {
        d = (c * 0.52 + i * 0.10).toFixed(2);
        html += '<span class="ch" style="--d:' + d + 's">' + chars[i] + '</span>';
      }
      html += '</div>';
    }
    var sd = POEM.length * 0.52 + 0.5;
    html += '<div class="col sign">';
    '秦观·鹊桥仙'.split('').forEach(function (ch, k) {
      html += '<span class="ch" style="--d:' + (sd + k * 0.07).toFixed(2) + 's">' + ch + '</span>';
    });
    html += '</div>';
    html += '<div class="seal" style="--d:' + (sd + 0.8).toFixed(2) + 's">' +
            '<span>七</span><span>夕</span></div>';

    el.poem.classList.remove('on');
    el.poem.innerHTML = html;
    void el.poem.offsetWidth;   // 强制重排，保证重播时动画重新触发
  }

  function resetUI() {
    el.title.classList.remove('show', 'hide');
    el.hint.classList.remove('on');
    el.dock.classList.remove('on');
    buildPoem();
  }

  function once(key, time, fn) {
    if (!fired[key] && T >= time) { fired[key] = true; fn(); }
  }

  function restart() {
    T = 0;
    fired = {};
    bridge = new Q.Bridge(zhinu.home, niulang.home, W, H);
    meetPt = bridge.point(0.5, {});
    fireworks.parts.length = 0;
    fireworks.rings.length = 0;
    petals.list.length = 0;
    resetUI();
  }

  /* ------------------------------------------------------------------ */
  /* 主循环                                                              */
  /* ------------------------------------------------------------------ */

  function frame(now) {
    requestAnimationFrame(frame);

    var dt = paused ? 0 : (last ? Math.min((now - last) / 1000, 0.05) : 0.016);
    last = now;
    T += dt;
    var t = T;

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
      var gy = meetPt.y - figH * 0.58;
      fireworks.burstHeart(meetPt.x, gy, Math.max(2.6, W / 380), null);
      fireworks.burstStar(meetPt.x, gy, 90,
        ['255,246,226', '255,214,168', '206,226,255', '255,196,206'], 420);
      fireworks.ring(meetPt.x, gy, Math.max(200, W * 0.30), 1.5);
      fireworks.ring(meetPt.x, gy, Math.max(120, W * 0.17), 1.0);
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
    var reveal    = Q.smoothstep(0.2, 3.4, t);
    var starK     = Q.smoothstep(CUE.starsIn, CUE.starsIn + 2.2, t);
    var bridgeAge = t - CUE.bridge;
    var crossT    = Q.clamp((t - CUE.cross) / CROSS_DUR, 0, 1);
    var afterMeet = Math.max(0, t - CUE.meet);
    var flash     = Math.max(0, 1 - afterMeet / 0.85);

    /* --- 两位主角的位置 --- */
    var walking = crossT > 0 && crossT < 1;
    var stepBob = walking ? Math.abs(Math.sin(t * 5.2)) * figH * 0.022 : 0;

    if (t < CUE.meet) {
      var e = Q.ease.inOutCubic(crossT);
      var pv = bridge.point(Q.lerp(0, 0.5 - meetGap, e), scratch);
      zhinu.x = pv.x; zhinu.y = pv.y - stepBob;
      var pa = bridge.point(Q.lerp(1, 0.5 + meetGap, e), scratch);
      niulang.x = pa.x; niulang.y = pa.y - stepBob;
    } else {
      var settle = Q.smoothstep(0, 2.6, afterMeet);
      var gap = meetGap * Q.lerp(1, 0.72, settle);
      var pv2 = bridge.point(0.5 - gap, scratch);
      zhinu.x = pv2.x; zhinu.y = pv2.y;
      var pa2 = bridge.point(0.5 + gap, scratch);
      niulang.x = pa2.x; niulang.y = pa2.y;
    }
    // 凌空轻浮
    zhinu.y   += Math.sin(t * 0.75 + zhinu.ph) * figH * 0.030;
    niulang.y += Math.sin(t * 0.72 + niulang.ph) * figH * 0.030;

    /* --- 更新 --- */
    if (bridgeAge > 0) bridge.update(bridgeAge, t);
    petals.update(dt, Q.smoothstep(CUE.meet - 1, CUE.meet + 2.5, t) * 0.85 + 0.15);
    motes.update(dt, t);
    fireworks.update(dt);
    lanterns.update(dt, t);
    for (var ri = roses.length - 1; ri >= 0; ri--) {
      if (!roses[ri].update(dt)) roses.splice(ri, 1);
    }

    /* ================= 绘制 ================= */

    sky.background(ctx, W, H, horizon);
    sky.draw(ctx, W, H, t, dt, reveal, px, py);
    sky.mountains(ctx, W, H, horizon, reveal);
    sky.water(ctx, W, H, horizon, t, reveal);

    if (starK > 0.02) {
      sky.reflectLight(ctx, W, H, horizon, zhinu.x, zhinu.rgb, starK * 0.5, t);
      sky.reflectLight(ctx, W, H, horizon, niulang.x, niulang.rgb, starK * 0.5, t + 3);
    }

    if (bridgeAge > 0) bridge.draw(ctx, t);

    // 相会后两人之间的暖晕
    if (afterMeet > 0) {
      ctx.globalCompositeOperation = 'lighter';
      Q.glow(ctx, '255,222,180', meetPt.x, meetPt.y - figH * 0.55,
             Q.lerp(50, 165, Q.smoothstep(0, 2.4, afterMeet)),
             0.30 * Q.smoothstep(0, 1.6, afterMeet) * (0.9 + 0.1 * Math.sin(t * 0.9)));
      ctx.globalCompositeOperation = 'source-over';
    }

    // 牛郎织女
    var aura = starK * (1 + flash * 2.4);
    Q.drawFigure(ctx, 'zhinu', zhinu.x, zhinu.y, figH, t, zhinu.dir, starK, aura, zhinu.rgb);
    Q.drawFigure(ctx, 'niulang', niulang.x, niulang.y, figH, t, niulang.dir, starK, aura, niulang.rgb);

    if (flash > 0.001) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,242,222,' + (flash * flash * 0.5).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    lanterns.draw(ctx, t);
    for (var rj = 0; rj < roses.length; rj++) roses[rj].draw(ctx, t);
    fireworks.draw(ctx);
    motes.draw(ctx, t, Q.smoothstep(1.5, 5, t));
    petals.draw(ctx);

    // 暗角
    if (!frame._vig) {
      var vg = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.32,
                                        W / 2, H * 0.46, Math.max(W, H) * 0.80);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(0.62, 'rgba(2,3,10,0.18)');
      vg.addColorStop(1, 'rgba(1,2,7,0.60)');
      frame._vig = vg;
    }
    ctx.fillStyle = frame._vig;
    ctx.fillRect(0, 0, W, H);
  }

  /* ------------------------------------------------------------------ */
  /* 交互                                                                */
  /* ------------------------------------------------------------------ */

  function bloom(x, y) {
    fireworks.burstHeart(x, y, Q.rand(1.5, 2.6), null);
    fireworks.burstStar(x, y, 16, ['255,236,206', '255,196,214', '214,228,255'], 190);
    Q.sound.pluck(Q.pick([0, 2, 4, 5, 7, 9]), 0.55);
    for (var i = 0; i < 3; i++) petals.spawn(y - Q.rand(0, 40));
  }

  cvs.addEventListener('pointerdown', function (e) { bloom(e.clientX, e.clientY); });

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    pointer.tx = (e.clientX / W) * 2 - 1;
    pointer.ty = (e.clientY / H) * 2 - 1;
  });

  el.replay.addEventListener('click', restart);

  el.sound.addEventListener('click', function () {
    Q.sound.enabled = !Q.sound.enabled;
    el.sound.classList.toggle('off', !Q.sound.enabled);
    el.sound.textContent = Q.sound.enabled ? '♪' : '♪̸';
    if (Q.sound.enabled) Q.sound.pluck(4, 0.5);
  });

  el.music.addEventListener('click', function () {
    var on = Q.bgm.toggle();
    el.music.classList.toggle('off', !on);
    el.music.title = on ? '关闭背景音乐' : '播放背景音乐';
  });

  /* 「碰碰」的彩蛋：每次触发都在随机位置抽出一枝光之玫瑰 */
  function bloomRose() {
    var S = Q.clamp(Math.min(W * 0.058, H * 0.088), 26, 76) * Q.rand(0.82, 1.28);

    // 随机选位，尽量避开右侧诗行，也尽量别和已有的玫瑰挤在一起
    var rx = 0, ry = 0, best = -1, i, j;
    for (i = 0; i < 12; i++) {
      var cx = Q.rand(W * 0.07, W * 0.62);
      var cy = Q.rand(H * 0.30, H * 0.64);
      var near = 1e9;
      for (j = 0; j < roses.length; j++) {
        near = Math.min(near, Math.hypot(cx - roses[j].x, cy - roses[j].y));
      }
      if (near > best) { best = near; rx = cx; ry = cy; }
      if (best > W * 0.20) break;
    }

    if (roses.length >= 5) roses.shift();
    roses.push(new Q.Rose(rx, ry, S));

    // 切到专属曲，放完自动切回默认背景乐
    Q.bgm.interlude('bgm/pp.mp3');

    [0, 4, 7, 9].forEach(function (n, k) {
      setTimeout(function () { Q.sound.pluck(n, 0.5); }, k * 150);
    });
    // 满开的那一下：心形绽开 + 和弦
    setTimeout(function () {
      fireworks.burstHeart(rx, ry, S / 20, ['255,150,176', '255,196,210', '255,240,238']);
      fireworks.ring(rx, ry, S * 5.2, 1.0);
      Q.sound.pluck(12, 0.7);
    }, 1800);
    // 飞散时再撒一把光屑
    setTimeout(function () {
      fireworks.burstStar(rx, ry, 30,
        ['255,168,190', '255,214,224', '255,244,236'], 150);
    }, 6400);
  }

  function release() {
    var v = el.wish.value.trim();
    lanterns.release(v || '心想事成');
    if (v === '碰碰') bloomRose();
    el.wish.value = '';
    el.wish.blur();
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

  /* ------------------------------------------------------------------ */
  /* 移动端：横屏提示                                                    */
  /* ------------------------------------------------------------------ */

  var stayPortrait = false;

  function checkOrientation() {
    var portrait = window.innerHeight > window.innerWidth;
    document.body.classList.toggle('ask-rotate', isPhone && portrait && !stayPortrait);
  }

  if (el.stay) {
    el.stay.addEventListener('click', function () {
      stayPortrait = true;
      checkOrientation();
    });
  }

  /* ------------------------------------------------------------------ */
  /* 尺寸变化                                                            */
  /* ------------------------------------------------------------------ */

  var rTimer = null, lastW = 0, lastH = 0;
  function onResize() {
    checkOrientation();
    clearTimeout(rTimer);
    rTimer = setTimeout(function () {
      // 手机地址栏收放会反复触发 resize，高度小幅变化时不重建星空
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 130) return;
      lastW = window.innerWidth; lastH = window.innerHeight;
      var keep = T;
      layout();
      T = keep;
      if (T > CUE.bridge) bridge.update(T - CUE.bridge, T);
    }, 240);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', function () {
    setTimeout(onResize, 260);
  });

  /* ------------------------------------------------------------------ */
  /* 背景音乐：等首次交互后再起（浏览器自动播放策略）                    */
  /* ------------------------------------------------------------------ */

  Q.bgm.probe('bgm/xingchendahai.mp3').then(function (hasFile) {
    el.music.title = hasFile ? '背景音乐《星辰大海》' : '背景音乐（内置古风环境音）';
  });

  var musicArmed = false;
  function armMusic() {
    if (musicArmed) return;
    musicArmed = true;
    Q.bgm.start();
    el.music.classList.remove('off');
  }
  ['pointerdown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, armMusic, { once: true });
  });

  /* ------------------------------------------------------------------ */

  // 调试用：QX.seek(20) 跳到第 20 秒；QX.hold(9) 跳过去并定格
  window.QX = {
    seek: function (sec) {
      restart();
      T = sec;
      if (T > CUE.bridge) bridge.update(T - CUE.bridge, T);
      return T;
    },
    hold: function (sec) { window.QX.seek(sec); paused = true; return sec; },
    pause: function () { paused = true; },
    play: function () { paused = false; },
    rose: function () { bloomRose(); },
    restart: restart
  };

  lastW = window.innerWidth; lastH = window.innerHeight;
  layout();
  resetUI();
  checkOrientation();
  el.music.classList.add('off');
  requestAnimationFrame(frame);

})(window.Q);
