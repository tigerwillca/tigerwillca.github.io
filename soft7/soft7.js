/* Living banner, cursor glow, mute, and the fork sequence. No autoplay. */
(function () {
  "use strict";
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fine = !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);
  var KEY = "s7.fork";

  function loadState() {
    try {
      return JSON.parse(sessionStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function state() {
    var s = loadState();
    s.step = s.step || 0;
    s.run = s.run || 0;
    s.triad = s.triad || 0;
    s.taps = s.taps || 0;
    return s;
  }
  function save(s) {
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }

  function whisper(text) {
    var el = document.querySelector("[data-whisper]");
    if (!el) {
      el = document.createElement("p");
      el.className = "whisper";
      el.setAttribute("data-whisper", "");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.textContent = text || "";
  }

  function blink() {
    document.querySelectorAll("[data-tiger-blink]").forEach(function (el) {
      el.hidden = false;
      el.classList.remove("show", "show-still");
      if (reduce) {
        el.classList.add("show-still");
        setTimeout(function () {
          el.classList.remove("show-still");
          el.hidden = true;
        }, 1400);
        return;
      }
      void el.offsetWidth;
      el.classList.add("show");
      setTimeout(function () {
        el.classList.remove("show");
        el.hidden = true;
      }, 1700);
    });
  }

  function showMars() {
    var el = document.querySelector("[data-mars]");
    if (!el) {
      el = document.createElement("div");
      el.className = "mars-horizon";
      el.setAttribute("data-mars", "");
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", "A distant rust-colored horizon");
      document.body.appendChild(el);
    }
    el.classList.add("is-on");
    document.body.classList.add("mars-open");
  }

  function showClock() {
    document.querySelectorAll("[data-living-banner]").forEach(function (banner) {
      if (banner.querySelector(".hidden-clock")) return;
      var clock = document.createElement("span");
      clock.className = "hidden-clock";
      clock.textContent = "11:11";
      clock.setAttribute("aria-hidden", "true");
      banner.appendChild(clock);
    });
  }

  function paintGlimpse(s) {
    document.querySelectorAll("[data-glimpse]").forEach(function (box) {
      var html = "";
      if (s.step >= 2) {
        html += '<div class="glimpse-pulse"><span class="door"></span><span class="heart"></span><p>Pulse is the heartbeat.</p></div>';
      }
      if (s.step >= 3) {
        html += '<div class="glimpse-bridge"><span class="span"></span><span class="shade"></span><span class="glint"></span><p>Project X is the bridge.</p></div>';
      }
      if (s.step >= 5) {
        html += '<p class="breadcrumb">Enjoy the breadcrumbs, they savor better.</p>';
      }
      box.innerHTML = html;
    });
    document.querySelectorAll("[data-bridge]").forEach(function (btn) { btn.hidden = s.step < 2; });
    document.querySelectorAll("[data-gate-more]").forEach(function (p) { p.hidden = !s.gate; });
  }

  function answer() {
    var ids = [3, 6, 9, 7];
    var bars = document.querySelectorAll(".freq-bars i");
    var lit = [2, 5, 6, 0];
    ids.forEach(function (id, i) {
      setTimeout(function () {
        if (window.Soft7Forks && Soft7Forks.soundOn()) {
          var tone = Soft7Forks.get(id);
          if (tone) Soft7Forks.playHz(tone.hz);
        }
        if (bars[lit[i]]) bars[lit[i]].classList.add("lit");
      }, reduce ? 0 : i * 740);
    });
  }

  function render(s, fresh) {
    paintGlimpse(s);
    if (s.step >= 4) showMars();
    if (s.step >= 5) {
      showClock();
      if (fresh) {
        answer();
        if (!s.logged) {
          s.logged = true;
          save(s);
          console.info("%cFind the code. It finds you back.", "color:#E8C27A;font-size:13px");
        }
      }
    }
  }

  function reach(step, text) {
    var s = state();
    if (s.step >= step) return s;
    s.step = step;
    save(s);
    if (text) whisper(text);
    render(s, true);
    return s;
  }

  function onCounted(id) {
    id = Number(id);
    var s = state();
    if (s.step < 1) {
      if (id === s.run + 1) s.run = id;
      else s.run = id === 1 ? 1 : 0;
      save(s);
      if (s.run === 7) {
        blink();
        reach(1, "Soft7 is the first door.");
      }
      return;
    }
    if (s.step === 1) {
      var seq = [3, 6, 9];
      if (id === seq[s.triad]) s.triad += 1;
      else s.triad = id === 3 ? 1 : 0;
      save(s);
      if (s.triad === 3) reach(2, "Pulse is the heartbeat.");
    }
  }

  function setBatch(tone) {
    if (!tone || !tone.batchRootHz) return;
    var ms = Math.round(12000 * (256 / tone.batchRootHz));
    ms = Math.max(4200, Math.min(12000, ms));
    document.querySelectorAll("[data-living-banner], .hero-stage").forEach(function (el) {
      el.style.setProperty("--fork-ms", ms + "ms");
    });
  }

  function mountBanners() {
    document.querySelectorAll("[data-living-banner]").forEach(function (el) {
      var canvas = document.createElement("canvas");
      canvas.setAttribute("aria-hidden", "true");
      el.insertBefore(canvas, el.firstChild);
      var ctx = canvas.getContext("2d");
      var running = true;
      function size() {
        var r = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, el.clientWidth * r);
        canvas.height = Math.max(1, el.clientHeight * r);
        ctx.setTransform(r, 0, 0, r, 0, 0);
      }
      size();
      window.addEventListener("resize", size);
      function frame(now) {
        var w = el.clientWidth;
        var h = el.clientHeight;
        if (!w || !h) {
          if (running && !reduce) requestAnimationFrame(frame);
          return;
        }
        var t = reduce ? 0.8 : now / 1000;
        var raw = (getComputedStyle(el).getPropertyValue("--fork-ms") || "").trim();
        var ms = 9000;
        if (raw.slice(-2) === "ms") ms = parseFloat(raw);
        else if (raw.slice(-1) === "s") ms = parseFloat(raw) * 1000;
        else if (parseFloat(raw) > 50) ms = parseFloat(raw);
        if (!ms || ms < 1500) ms = 9000;
        var pulse = 0.5 + 0.5 * Math.sin((t * 1000 / ms) * Math.PI * 2);
        ctx.clearRect(0, 0, w, h);
        var g = ctx.createRadialGradient(w * 0.5, h * 0.62, 8, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
        g.addColorStop(0, "rgba(232,194,122," + (0.10 + pulse * 0.16) + ")");
        g.addColorStop(0.45, "rgba(155,123,255,0.10)");
        g.addColorStop(1, "rgba(27,20,51,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(232,194,122," + (0.28 + pulse * 0.28) + ")";
        ctx.lineWidth = 1.25;
        var x;
        for (x = 0; x <= w; x += 5) {
          var y = h * 0.58 + Math.sin(x * 0.02 + t * 0.65) * (h * 0.08) + Math.sin(x * 0.007 - t * 0.35) * 5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        var cx = w * 0.5;
        var cy = h * 0.48;
        var rx = Math.min(w * 0.22, 180);
        var ry = h * 0.28;
        var i;
        for (i = 0; i < 7; i++) {
          var a = t * 0.28 + i * (Math.PI * 2 / 7);
          ctx.beginPath();
          ctx.fillStyle = i % 3 === 0 ? "rgba(204,255,0,0.8)" : "rgba(243,201,107,0.9)";
          ctx.arc(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
        var d;
        for (d = 0; d < 8; d++) {
          var dropX = ((d + 1) / 9) * w;
          var dropY = h - ((t * 22 + d * 37) % (h + 24));
          ctx.fillStyle = "rgba(167,140,255,0.45)";
          ctx.fillRect(dropX, dropY, 1.4, 12);
        }
        if (running && !reduce) requestAnimationFrame(frame);
      }
      if (reduce) {
        frame(800);
        return;
      }
      requestAnimationFrame(frame);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) running = false;
        else if (!running) {
          running = true;
          requestAnimationFrame(frame);
        }
      });
    });
  }

  function mountCursor() {
    var canvas = document.createElement("canvas");
    canvas.className = "cursor-glow";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var pts = [];
    var dpr = 1;
    var running = true;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    }
    size();
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      pts.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (pts.length > 24) pts.shift();
    });
    function draw() {
      if (!running) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var i, p;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        p.life *= 0.9;
        ctx.beginPath();
        ctx.fillStyle = "rgba(243,201,107," + (p.life * 0.35) + ")";
        ctx.arc(p.x, p.y, 14 * p.life + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      if (pts.length) {
        p = pts[pts.length - 1];
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,244,214,0.55)";
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      pts = pts.filter(function (dot) { return dot.life > 0.05; });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) running = false;
      else if (!running) {
        running = true;
        requestAnimationFrame(draw);
      }
    });
  }

  function mountSound() {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sound-toggle";
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = "Sound off";
    btn.addEventListener("click", function () {
      if (!window.Soft7Forks) return;
      var on = !Soft7Forks.soundOn();
      Soft7Forks.setSound(on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "Sound on" : "Sound off";
      if (on) Soft7Forks.playHz(256);
    });
    document.body.appendChild(btn);
  }

  function wirePieces() {
    var visual = document.querySelector("[data-fork-visual]");
    var live = document.querySelector("[data-fork-now]");
    var lastHeard = { id: "", at: 0 };
    document.querySelectorAll("[data-fork-mount]").forEach(function (mount) {
      var i, btn;
      if (mount.childElementCount) return;
      for (i = 1; i <= 7; i++) {
        btn = document.createElement("button");
        btn.type = "button";
        btn.className = "fork";
        btn.textContent = String(i).padStart(3, "0");
        btn.setAttribute("data-token", String(i));
        btn.setAttribute("aria-label", "Play piece " + String(i).padStart(3, "0"));
        mount.appendChild(btn);
      }
    });
    document.addEventListener("pointerenter", function (e) {
      var el = e.target.closest && e.target.closest("[data-token]");
      if (!el || e.pointerType === "touch") return;
      var hid = el.getAttribute("data-token");
      lastHeard.id = hid;
      lastHeard.at = Date.now();
      var tone = Soft7Forks.playToken(hid, { count: false });
      if (tone && visual) visual.textContent = tone.label;
    }, true);
    document.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest("[data-token]");
      if (!el) return;
      var cid = el.getAttribute("data-token");
      var tone = null;
      if (!(lastHeard.id === cid && Date.now() - lastHeard.at < 450)) {
        tone = Soft7Forks.playToken(cid, { count: false });
      } else {
        tone = Soft7Forks.get(cid);
        setBatch(tone);
      }
      if (!tone) return;
      if (visual) visual.textContent = tone.label;
      if (live) live.textContent = "Piece " + String(tone.tokenId).padStart(3, "0") + ", " + tone.label;
      onCounted(tone.tokenId);
    });
    document.querySelectorAll("[data-seven-ring]").forEach(function (ring) {
      var last = 0;
      ring.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "touch") return;
        var tone = Soft7Forks.playToken(1, { count: false });
        if (tone && visual) visual.textContent = tone.label;
      });
      ring.addEventListener("click", function () {
        var now = Date.now();
        var s = state();
        if (now - last > 20000) s.taps = 0;
        last = now;
        s.taps += 1;
        save(s);
        var tone = Soft7Forks.playToken(1, { count: false });
        if (tone && visual) visual.textContent = tone.label;
        if (s.taps >= 7) {
          s = state();
          s.taps = 0;
          save(s);
          blink();
          if (s.step < 1) reach(1, "Soft7 is the first door.");
        }
      });
    });
    document.querySelectorAll("[data-bridge]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (state().step === 2) reach(3, "Project X is the bridge.");
      });
    });
    document.querySelectorAll("[data-gate]").forEach(function (el) {
      var timer = 0;
      function arm() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var s = state();
          if (s.step < 5 || s.gate) return;
          s.gate = true;
          save(s);
          render(s, false);
          whisper("The gate was always open.");
        }, 900);
      }
      el.addEventListener("pointerenter", arm);
      el.addEventListener("focus", arm);
      el.addEventListener("pointerleave", function () { clearTimeout(timer); });
      el.addEventListener("blur", function () { clearTimeout(timer); });
    });
    document.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable)) return;
      var key = e.key;
      if (key === "x" || key === "X") {
        if (state().step === 2) reach(3, "Project X is the bridge.");
        return;
      }
      if ((key === "g" || key === "G") && state().step >= 5) {
        var sg = state();
        if (!sg.gate) {
          sg.gate = true;
          save(sg);
          render(sg, false);
          whisper("The gate was always open.");
        }
        return;
      }
      if (key === "3" || key === "6" || key === "9") {
        var id = Number(key);
        var tone = Soft7Forks.get(id);
        if (tone) {
          setBatch(tone);
          if (Soft7Forks.soundOn()) Soft7Forks.playHz(tone.hz);
          if (visual) visual.textContent = tone.label;
        }
        onCounted(id);
        return;
      }
      if (state().step >= 5 && /^[opal]$/i.test(key)) {
        var buf = (document.body.getAttribute("data-opal") || "") + key.toLowerCase();
        buf = buf.slice(-4);
        document.body.setAttribute("data-opal", buf);
        if (buf === "opal") {
          whisper("within the Metatron cube, they are the cube.");
          document.body.classList.add("opal-wash");
          setTimeout(function () { document.body.classList.remove("opal-wash"); }, 2400);
        }
      }
    });
    window.addEventListener("scroll", function () {
      var s = state();
      if (s.step !== 3) return;
      var doc = document.documentElement;
      if (window.scrollY + window.innerHeight < doc.scrollHeight - 72) return;
      reach(4, "A distant rust-colored horizon.");
      setTimeout(function () {
        if (state().step === 4) reach(5, "Enjoy the breadcrumbs, they savor better.");
      }, reduce ? 0 : 1000);
    }, { passive: true });
    Soft7Forks.onPlay(function (tone) { setBatch(tone); });
    render(state(), false);
  }

  function boot() {
    mountBanners();
    if (fine && !reduce) mountCursor();
    mountSound();
    if (!window.Soft7Forks) return;
    Soft7Forks.load().then(wirePieces).catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
