/* 七夕 · 鹊桥仙 —— 背景音乐
 *
 * 优先播放 assets/bgm.mp3（推荐放《金风玉露》—— 银临 / 玄觞，
 * 与画面里那句「金风玉露一相逢」正好互文）。
 * 若没有放音频文件，则退回内置的古风环境音：
 * D 宫五声音阶的疏落拨弦 + 低音持续音，纯合成、无版权顾虑。
 */
(function (Q) {
  'use strict';

  var bgm = {
    mode: 'none',        // 'file' | 'synth' | 'none'
    playing: false,
    el: null,
    _ac: null,
    _master: null,
    _timer: null,
    _step: 0
  };

  /* ---------------- 内置古风环境音 ---------------- */

  // D 宫五声：宫 商 角 徵 羽
  var PENTA = [0, 2, 4, 7, 9];
  // 一段循环的旋律骨架（音级索引 + 八度）
  var PHRASE = [
    [4, 0], [2, 0], [0, 0], [2, 0],
    [4, 0], [0, 1], [4, 0], [2, 0],
    [1, 0], [0, 0], [3, -1], [0, 0],
    [2, 0], [4, 0], [3, 0], [2, 0]
  ];

  function freqOf(deg, oct) {
    return 146.83 * Math.pow(2, (PENTA[deg] + oct * 12) / 12 + 1);  // D3 起
  }

  function buildChain(ac) {
    var master = ac.createGain();
    master.gain.value = 0.0;
    master.connect(ac.destination);

    // 简易空间感：反馈延时
    var delay = ac.createDelay(1.2);
    delay.delayTime.value = 0.42;
    var fb = ac.createGain();
    fb.gain.value = 0.34;
    var wet = ac.createGain();
    wet.gain.value = 0.30;
    var damp = ac.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;

    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(wet);
    wet.connect(master);

    bgm._delay = delay;
    return master;
  }

  function pluck(ac, master, freq, gain, dur) {
    var now = ac.currentTime;
    var g = ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    g.connect(master);
    if (bgm._delay) g.connect(bgm._delay);

    var lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2800, now);
    lp.frequency.exponentialRampToValueAtTime(620, now + dur * 0.8);
    lp.connect(g);

    [[1, 1, 0], [2, 0.24, 2.5], [3, 0.10, -3], [4.2, 0.05, 4]].forEach(function (h) {
      var o = ac.createOscillator();
      var og = ac.createGain();
      o.type = h[0] === 1 ? 'triangle' : 'sine';
      o.frequency.value = freq * h[0];
      o.detune.value = h[2];
      og.gain.value = h[1];
      o.connect(og); og.connect(lp);
      o.start(now);
      o.stop(now + dur + 0.1);
    });
  }

  function drone(ac, master) {
    var now = ac.currentTime;
    [73.42, 110.0].forEach(function (f, i) {
      var o = ac.createOscillator();
      var g = ac.createGain();
      var lfo = ac.createOscillator();
      var lg = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.value = 0.055 - i * 0.018;
      lfo.frequency.value = 0.07 + i * 0.03;
      lg.gain.value = 0.022;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(master);
      o.start(now); lfo.start(now);
      bgm._drones.push(o, lfo);
    });
  }

  function startSynth() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!bgm._ac) {
      try { bgm._ac = new AC(); } catch (e) { return false; }
      bgm._master = buildChain(bgm._ac);
      bgm._drones = [];
    }
    var ac = bgm._ac;
    if (ac.state === 'suspended') ac.resume();

    bgm._master.gain.cancelScheduledValues(ac.currentTime);
    bgm._master.gain.setValueAtTime(Math.max(0.0001, bgm._master.gain.value), ac.currentTime);
    bgm._master.gain.linearRampToValueAtTime(0.34, ac.currentTime + 2.4);

    if (!bgm._drones.length) drone(ac, bgm._master);

    if (bgm._timer) clearInterval(bgm._timer);
    bgm._timer = setInterval(function () {
      var n = PHRASE[bgm._step % PHRASE.length];
      bgm._step++;
      // 主音
      pluck(ac, bgm._master, freqOf(n[0], n[1]), 0.16, 2.6);
      // 偶尔加一个高八度的点缀
      if (bgm._step % 4 === 2) {
        setTimeout(function () {
          pluck(ac, bgm._master, freqOf((n[0] + 2) % 5, n[1] + 1), 0.075, 2.0);
        }, 380);
      }
    }, 1350);

    bgm.mode = 'synth';
    bgm.playing = true;
    return true;
  }

  function stopSynth(fade) {
    if (!bgm._ac) return;
    var ac = bgm._ac;
    bgm._master.gain.cancelScheduledValues(ac.currentTime);
    bgm._master.gain.setValueAtTime(bgm._master.gain.value, ac.currentTime);
    bgm._master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + (fade || 0.8));
    if (bgm._timer) { clearInterval(bgm._timer); bgm._timer = null; }
    bgm.playing = false;
  }

  /* ---------------- 对外接口 ---------------- */

  /** 探测是否放了自定义音频文件 */
  bgm.probe = function (url) {
    return fetch(url, { method: 'HEAD' })
      .then(function (r) {
        if (!r.ok) throw 0;
        var el = document.createElement('audio');
        el.src = url;
        el.loop = true;
        el.preload = 'auto';
        el.volume = 0;
        bgm.el = el;
        bgm.mode = 'file';
        return true;
      })
      .catch(function () { bgm.mode = 'synth'; return false; });
  };

  bgm.start = function () {
    if (bgm.playing) return;
    if (bgm.mode === 'file' && bgm.el) {
      var el = bgm.el;
      el.volume = 0;
      var p = el.play();
      var fade = function () {
        var step = function () {
          el.volume = Math.min(0.55, el.volume + 0.02);
          if (el.volume < 0.55) setTimeout(step, 90);
        };
        step();
      };
      if (p && p.then) p.then(fade).catch(function () { startSynth(); });
      else fade();
      bgm.playing = true;
      return;
    }
    startSynth();
  };

  bgm.stop = function () {
    bgm._endInterlude(true);
    if (bgm.mode === 'file' && bgm.el) {
      var el = bgm.el;
      var step = function () {
        el.volume = Math.max(0, el.volume - 0.05);
        if (el.volume > 0) setTimeout(step, 60);
        else el.pause();
      };
      step();
      bgm.playing = false;
      return;
    }
    stopSynth();
  };

  bgm.toggle = function () {
    if (bgm.playing) bgm.stop(); else bgm.start();
    return bgm.playing;
  };

  /* ---------------- 插曲：放一首，放完自动切回 ---------------- */

  bgm._interActive = false;
  bgm._wasPlaying = false;

  /** 打断当前背景乐播放 url，播完（或失败）后回到原曲 */
  bgm.interlude = function (url) {
    if (!window.Audio) return;

    if (!bgm._interEl) {
      bgm._interEl = new Audio();
      bgm._interEl.preload = 'auto';
      bgm._interEl.addEventListener('ended', function () { bgm._endInterlude(); });
      bgm._interEl.addEventListener('error', function () { bgm._endInterlude(); });
    }
    var ie = bgm._interEl;
    if (ie.getAttribute('src') !== url) ie.setAttribute('src', url), ie.load();

    if (!bgm._interActive) {
      bgm._interActive = true;
      bgm._wasPlaying = bgm.playing;
      if (bgm.mode === 'file' && bgm.el) bgm.el.pause();
      else stopSynth(0.4);
    }

    ie.currentTime = 0;
    ie.volume = 0.68;
    var p = ie.play();
    if (p && p.catch) p.catch(function () { bgm._endInterlude(); });
  };

  bgm._endInterlude = function (silent) {
    if (!bgm._interActive) return;
    bgm._interActive = false;
    if (bgm._interEl) { bgm._interEl.pause(); }
    if (silent) return;
    if (bgm._wasPlaying) {
      bgm.playing = false;          // 让 start() 重新接管
      bgm.start();
    }
  };

  Q.bgm = bgm;

})(window.Q);
