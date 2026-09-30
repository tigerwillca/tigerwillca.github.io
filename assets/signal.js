/* Soft7 signal: trail, drone, and the door. No names on screen. */
(function(){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var globe = document.getElementById('globe');
  if (globe) {
    globe.addEventListener('click', function(ev){
      if (reduce) return;
      ev.preventDefault();
      globe.classList.add('zoom');
      setTimeout(function(){ location.href = '/phoenix'; }, 520);
    });
  }

  var tune = document.getElementById('tune');
  var viz = document.getElementById('viz');
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx, master, filter, analyser, started = false, bend;

  function setTune(mode){
    if (!tune) return;
    tune.dataset.mode = mode;
    tune.setAttribute('aria-pressed', mode === 'live' ? 'true' : 'false');
    var label = tune.querySelector('span');
    if (label) label.textContent = mode === 'live' ? 'Signal on' : (mode === 'muted' ? 'Muted' : 'Tune in');
  }

  function noise(seconds){
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function burstLayer(buf, freq, q, gain, dur){
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(bp); bp.connect(g); g.connect(filter);
    src.start();
    src.stop(ctx.currentTime + dur + 0.05);
  }

  function startAudio(){
    if (!AC || ctx) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 880;
    filter.Q.value = 0.35;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    filter.connect(analyser);
    analyser.connect(master);
    master.connect(ctx.destination);

    var base = 123;
    var partials = [1, 3, 6, 9];
    var oscs = partials.map(function(m, i){
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = base * m;
      g.gain.value = i === 0 ? 0.16 : 0.045 / i;
      o.connect(g); g.connect(filter); o.start();
      return o;
    });
    bend = oscs[1];

    var swirlA = ctx.createOscillator();
    var swirlB = ctx.createOscillator();
    var swirlG = ctx.createGain();
    var pan = ctx.createStereoPanner();
    swirlA.frequency.value = 466;
    swirlB.frequency.value = 472;
    swirlG.gain.value = 0.02;
    swirlA.connect(swirlG); swirlB.connect(swirlG); swirlG.connect(pan); pan.connect(filter);
    swirlA.start(); swirlB.start();

    var sub = ctx.createOscillator();
    var subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = 55;
    subG.gain.value = 0.04;
    sub.connect(subG); subG.connect(filter); sub.start();

    var seaBuf = noise(2);
    var sea = ctx.createBufferSource();
    sea.buffer = seaBuf; sea.loop = true;
    var seaF = ctx.createBiquadFilter();
    seaF.type = 'lowpass'; seaF.frequency.value = 280;
    var seaG = ctx.createGain();
    seaG.gain.value = 0.015;
    sea.connect(seaF); seaF.connect(seaG); seaG.connect(filter); sea.start();

    var crack = noise(1.2);
    var coil = noise(0.4);
    var chimeT = 0;

    setInterval(function(){
      if (!ctx || master.gain.value === 0) return;
      var t = ctx.currentTime;
      bend.frequency.setTargetAtTime(369 + Math.sin(t / 8) * 6, t, 0.6);
      pan.pan.setTargetAtTime(Math.sin(t / 5.5), t, 0.4);
      swirlA.frequency.setTargetAtTime(460 + Math.sin(t / 4) * 8, t, 0.5);
      seaG.gain.setTargetAtTime(0.01 + (0.5 + 0.5 * Math.sin(t / 7)) * 0.03, t, 0.8);
      subG.gain.setTargetAtTime(0.02 + (0.5 + 0.5 * Math.sin(t / 9)) * 0.04, t, 0.8);
      var sec = Math.floor(t);
      if (sec % 3 === 0) {
        var tick = ctx.createOscillator();
        var tg = ctx.createGain();
        tick.frequency.value = 246;
        tg.gain.setValueAtTime(0.03, t);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        tick.connect(tg); tg.connect(filter); tick.start(); tick.stop(t + 0.2);
      }
      if (sec % 6 === 0) burstLayer(crack, 1800, 0.6, 0.02, 0.25);
      if (sec % 9 === 0) {
        burstLayer(coil, 4200, 4, 0.015, 0.35);
        if (t - chimeT > 8) {
          chimeT = t;
          var c = ctx.createOscillator();
          var cg = ctx.createGain();
          c.type = 'sine'; c.frequency.value = 988;
          cg.gain.setValueAtTime(0.02, t);
          cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
          c.connect(cg); cg.connect(filter); c.start(); c.stop(t + 0.75);
        }
      }
    }, 250);

    if (!reduce && viz) {
      var bins = new Uint8Array(analyser.frequencyBinCount);
      var bars = viz.querySelectorAll('i');
      (function draw(){
        analyser.getByteFrequencyData(bins);
        for (var i = 0; i < bars.length; i++) {
          var v = bins[i * 2] || 0;
          bars[i].style.transform = 'scaleY(' + (0.2 + v / 180) + ')';
        }
        requestAnimationFrame(draw);
      })();
    }
  }

  if (tune) {
    var remembered = '';
    try { remembered = localStorage.getItem('soft7-signal') || ''; } catch (e) {}
    if (remembered === 'muted') setTune('muted');
    tune.addEventListener('click', function(){
      startAudio();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (!started) {
        started = true;
        var mode = remembered === 'muted' ? 'muted' : 'live';
        master.gain.value = mode === 'live' ? 0.25 : 0;
        setTune(mode);
        try { localStorage.setItem('soft7-signal', mode); } catch (e) {}
        return;
      }
      var live = master.gain.value > 0;
      master.gain.value = live ? 0 : 0.25;
      var next = live ? 'muted' : 'live';
      setTune(next);
      try { localStorage.setItem('soft7-signal', next); } catch (e) {}
    });
  }

  if (reduce) return;

  var c = document.getElementById('signalTrail');
  var dot = document.getElementById('signalDot');
  if (!c || !c.getContext) return;
  var x = c.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var parts = [], cap = coarse ? 90 : 160, idle = true, px = -1, py = -1;
  function size(){
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function emit(cx, cy, n){
    for (var i = 0; i < n; i++) {
      if (parts.length >= cap) parts.shift();
      var ang = Math.random() * 6.283, sp = 0.35 + Math.random() * 1.6;
      parts.push({
        x: cx + (Math.random() - 0.5) * 6, y: cy + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.25,
        life: 1, r: 1 + Math.random() * 1.8, star: Math.random() < 0.38,
        hue: Math.random() < 0.45 ? '#ff7a2a' : (Math.random() < 0.5 ? '#E6B85C' : '#d9c8ff')
      });
    }
    if (idle) { idle = false; requestAnimationFrame(frame); }
  }
  function place(cx, cy){
    if (dot) {
      dot.hidden = false;
      dot.style.transform = 'translate3d(' + (cx - 7) + 'px,' + (cy - 7) + 'px,0)';
    }
    if (px >= 0) {
      var dist = Math.hypot(cx - px, cy - py);
      if (dist > 8) emit(cx, cy, coarse ? 2 : 3);
    }
    px = cx; py = cy;
    if (ctx && master && master.gain.value > 0 && filter) {
      var f = 420 + (cx / Math.max(1, innerWidth)) * 2200;
      filter.frequency.setTargetAtTime(f, ctx.currentTime, 0.08);
      if (bend) bend.frequency.setTargetAtTime(369 + ((cy / Math.max(1, innerHeight)) - 0.5) * 14, ctx.currentTime, 0.1);
    }
  }
  function burst(cx, cy){
    [3, 6, 9].forEach(function(n, i){ setTimeout(function(){ emit(cx, cy, n); }, i * 90); });
  }
  function frame(){
    x.clearRect(0, 0, innerWidth, innerHeight);
    x.globalCompositeOperation = 'lighter';
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy -= 0.01; p.life -= 0.018;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      x.globalAlpha = Math.max(0, p.life);
      x.strokeStyle = x.fillStyle = p.hue;
      if (p.star) {
        x.beginPath();
        x.moveTo(p.x - p.r * 2, p.y); x.lineTo(p.x + p.r * 2, p.y);
        x.moveTo(p.x, p.y - p.r * 2); x.lineTo(p.x, p.y + p.r * 2);
        x.stroke();
      } else {
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.283); x.fill();
      }
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    if (parts.length) requestAnimationFrame(frame); else idle = true;
  }
  addEventListener('pointermove', function(ev){
    if (ev.pointerType === 'touch') return;
    place(ev.clientX, ev.clientY);
  }, { passive: true });
  addEventListener('pointerdown', function(ev){
    if (ev.pointerType === 'touch') return;
    place(ev.clientX, ev.clientY);
    burst(ev.clientX, ev.clientY);
  }, { passive: true });
  addEventListener('touchstart', function(ev){
    var t = ev.changedTouches && ev.changedTouches[0];
    if (!t) return;
    place(t.clientX, t.clientY);
    burst(t.clientX, t.clientY);
  }, { passive: true });
  addEventListener('touchmove', function(ev){
    var t = ev.touches && ev.touches[0];
    if (t) place(t.clientX, t.clientY);
  }, { passive: true });
  addEventListener('resize', size);
  size();
})();
