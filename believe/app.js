(function () {
  "use strict";

  // One warm line per day. Plain, kind words. No questions, nothing to do.
  var LINES = [
    "You are allowed to rest.",
    "Something good is on its way to you.",
    "You hold this family together, and it shows.",
    "You are loved more than you know.",
    "Today does not have to be perfect to be good.",
    "Your kindness lands softly, and it stays.",
    "You are doing better than you think.",
    "There is light in you, even on the quiet days.",
    "It is okay to go slowly.",
    "You make home feel like home.",
    "You are seen, and you are cherished.",
    "Little by little, things are getting lighter.",
    "Your heart is a good place for people to land.",
    "You deserve the same gentleness you give.",
    "Breathe. You have time.",
    "Good things grow in quiet places.",
    "You are someone's favorite person.",
    "The hard parts are not the whole story.",
    "Your laugh changes the room.",
    "You have already carried so much so well.",
    "You don't have to hold everything today.",
    "There is more good ahead than behind.",
    "Your love is felt, even when no one says it.",
    "You are enough, just as you are this morning.",
    "Soft is strong, too.",
    "You are a safe place for the people you love.",
    "Today, let something be easy.",
    "The way you care is a gift.",
    "You are not alone in this.",
    "Peace can be small and still be real.",
    "You bring warmth wherever you go.",
    "Your patience is a quiet kind of magic.",
    "Rest is not something you have to earn.",
    "You are becoming more yourself every day.",
    "Somewhere today, a small joy is waiting for you.",
    "You are worth slowing down for.",
    "The light you give comes back to you.",
    "You make ordinary days feel special.",
    "Hope looks good on you.",
    "You are held, even when you feel tired.",
    "What you do for this family matters.",
    "Let today be gentle with you.",
    "You are the steady heartbeat of this home.",
    "Your strength is beautiful and real.",
    "It is safe to believe that good things can happen.",
    "You have a way of making people feel at peace.",
    "Even your quiet presence is a comfort.",
    "You have come so far.",
    "This moment is enough.",
    "You are loved on your best days and every other day.",
    "There is still so much wonder left for you.",
    "Your heart knows the way.",
    "You are allowed to take up space.",
    "The people who love you are grateful for you.",
    "One soft breath at a time is plenty.",
    "You are a blessing to the people around you.",
    "It is okay to let joy in.",
    "Tomorrow can start fresh, and so can tonight.",
    "You shine, even when you can't see it.",
    "Believe a little. Something beautiful is coming."
  ];

  var TOTAL = 60;            // seconds of breathing
  var INHALE = 4, EXHALE = 6, CYCLE = INHALE + EXHALE;

  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var cueEl = document.getElementById("cue");
  var lineEl = document.getElementById("line");
  var hintEl = document.getElementById("hint");
  var toneBtn = document.getElementById("tone");

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var W = 0, H = 0, DPR = 1;
  var start = 0, revealed = false, lastCue = "";

  function todaysLine() {
    var d = new Date();
    var dayNum = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    // 37 is coprime with 60, so this walks every line once before repeating.
    return LINES[((dayNum * 37) % LINES.length + LINES.length) % LINES.length];
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }

  // breath: 0 = fully out, 1 = fully in
  function breathAt(t) {
    var p = t % CYCLE;
    return p < INHALE ? ease(p / INHALE) : 1 - ease((p - INHALE) / EXHALE);
  }

  // Swirl particles along three soft spiral arms
  var specks = [];
  (function seed() {
    var s = 7;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < 220; i++) {
      var arm = i % 3, t = rnd();
      specks.push({
        arm: arm, t: t,
        jitter: (rnd() - 0.5) * 0.35,
        size: 1.2 + rnd() * 2.6 * (1 - t * 0.6),
        hue: rnd(),
        tw: rnd() * 6.28
      });
    }
  })();

  function color(h, a) {
    // amber -> soft gold -> rose
    var r, g, b;
    if (h < 0.5) { var k = h / 0.5; r = 255; g = 170 + 50 * k; b = 90 + 40 * k; }
    else { var k2 = (h - 0.5) / 0.5; r = 255; g = 220 - 85 * k2; b = 130 + 20 * k2; }
    return "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + a.toFixed(3) + ")";
  }

  function draw(now) {
    var t = (now - start) / 1000;
    var still = reduce && reduce.matches;
    var done = t >= TOTAL;
    var b = done ? 0.55 + 0.08 * Math.sin(t * 0.5) : breathAt(t);
    var cx = W / 2, cy = H / 2;
    var base = Math.min(W, H) * 0.36;
    var scale = still ? 0.85 : 0.62 + 0.38 * b;
    var spin = still ? 0 : t * 0.07;
    var dim = done ? Math.max(0.35, 1 - (t - TOTAL) / 5 * 0.65) : 1; // soften behind the line

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0b0916";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    // big soft halo
    var R = base * (still ? 1.1 : 0.9 + 0.5 * b);
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
    var glowA = (0.18 + 0.32 * b) * dim;
    g.addColorStop(0, "rgba(255,214,150," + glowA.toFixed(3) + ")");
    g.addColorStop(0.35, "rgba(240,140,110," + (glowA * 0.45).toFixed(3) + ")");
    g.addColorStop(1, "rgba(40,10,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // spiral specks
    for (var i = 0; i < specks.length; i++) {
      var s = specks[i];
      var a = s.arm * 2.094 + s.t * 5.2 + s.jitter + spin;
      var r = base * scale * (0.08 + s.t * 0.92);
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      var tw = still ? 1 : 0.75 + 0.25 * Math.sin(t * 1.3 + s.tw);
      var alpha = (0.25 + 0.6 * (1 - s.t)) * tw * (0.55 + 0.45 * b) * dim;
      var sz = s.size * (0.8 + 0.5 * b) * 3.2;
      var pg = ctx.createRadialGradient(x, y, 0, x, y, sz);
      pg.addColorStop(0, color(s.hue, alpha));
      pg.addColorStop(1, color(s.hue, 0));
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(x, y, sz, 0, 6.2832); ctx.fill();
    }

    // warm core
    var cr = base * (0.18 + 0.12 * b);
    var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    cg.addColorStop(0, "rgba(255,244,214," + (0.75 * dim).toFixed(3) + ")");
    cg.addColorStop(1, "rgba(255,190,120,0)");
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 6.2832); ctx.fill();

    // one tiny neon-lime speck drifting on the outer arm
    var la = 0.6 + spin * 1.4, lr = base * scale * 0.92;
    var lx = cx + Math.cos(la) * lr, ly = cy + Math.sin(la) * lr;
    var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 6);
    lg.addColorStop(0, "rgba(204,255,0," + (0.55 * dim).toFixed(3) + ")");
    lg.addColorStop(1, "rgba(204,255,0,0)");
    ctx.fillStyle = lg;
    ctx.beginPath(); ctx.arc(lx, ly, 6, 0, 6.2832); ctx.fill();

    // cues: clear at first, fading away over the minute
    if (!done) {
      var inPhase = (t % CYCLE) < INHALE;
      var word = inPhase ? "breathe in" : "breathe out";
      if (word !== lastCue) { cueEl.textContent = word; lastCue = word; }
      var p = t % CYCLE, edge = inPhase ? Math.min(p, INHALE - p) : Math.min(p - INHALE, CYCLE - p);
      var fadeOverall = Math.max(0, 1 - t / (TOTAL * 0.75));
      cueEl.style.opacity = (Math.min(1, edge / 0.8) * 0.75 * fadeOverall).toFixed(3);
    } else if (!revealed) {
      revealed = true;
      cueEl.style.opacity = "0";
      lineEl.textContent = todaysLine();
      lineEl.classList.add("show");
      hintEl.classList.add("show");
    }

    tone.update(t, b, done);
    requestAnimationFrame(draw);
  }

  // Very soft optional tone (off by default)
  var tone = {
    on: false, ac: null, gain: null,
    enable: function () {
      try {
        if (!this.ac) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ac = new AC();
          this.gain = this.ac.createGain(); this.gain.gain.value = 0;
          var lp = this.ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700;
          [196, 293.66, 392.0].forEach(function (f, i) {
            var o = this.ac.createOscillator(); o.type = "sine"; o.frequency.value = f;
            var g = this.ac.createGain(); g.gain.value = [0.6, 0.3, 0.15][i];
            o.connect(g); g.connect(lp); o.start();
          }, this);
          lp.connect(this.gain); this.gain.connect(this.ac.destination);
        }
        if (this.ac.state === "suspended") this.ac.resume();
        this.on = true;
      } catch (e) { this.on = false; }
    },
    disable: function () {
      this.on = false;
      if (this.gain) this.gain.gain.setTargetAtTime(0, this.ac.currentTime, 0.3);
    },
    update: function (t, b, done) {
      if (!this.on || !this.gain) return;
      var target = done ? 0.012 : 0.008 + 0.03 * b; // quiet
      this.gain.gain.setTargetAtTime(target, this.ac.currentTime, 0.25);
    }
  };

  toneBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (tone.on) tone.disable(); else tone.enable();
    toneBtn.setAttribute("aria-pressed", tone.on ? "true" : "false");
    toneBtn.setAttribute("aria-label", "Soft tone (" + (tone.on ? "on" : "off") + ")");
  });

  function replay() {
    start = performance.now();
    revealed = false; lastCue = "";
    lineEl.classList.remove("show");
    hintEl.classList.remove("show");
  }
  document.addEventListener("click", replay);
  document.addEventListener("keydown", function (e) {
    if (e.key === " " || e.key === "Enter") { if (e.target !== toneBtn) replay(); }
  });

  window.addEventListener("resize", resize);
  resize();
  start = performance.now();
  requestAnimationFrame(draw);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
    });
  }

  // tiny test hook (no tracking): lets a checker skip ahead
  window.__believe = { line: todaysLine, count: LINES.length, skip: function () { start -= TOTAL * 1000; } };
})();
