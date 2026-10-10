(function () {
  "use strict";

  // PASTE JENNIFER'S TIP LINK HERE.
  // Venmo, Ko-fi, PayPal, or similar. Use the full URL, including https://.
  // Leave this as an empty string and the Support button is not shown at all.
  // See README.md in this folder.
  var TIP_URL = "";

  var SHARE_URL = "https://tigerwillca.github.io/believe-swirl/";
  var SHARE_TEXT = "A minute of warm light, and one kind line for today.";
  var LOOK_KEY = "believe-swirl-look";
  var INSTALL_KEY = "believe-swirl-install-hint";
  var BG = "#0b0916";

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

  // arms / twist / spin / jitter / size change the shape, not just the colors.
  var LOOKS = [
    { id: "amber", name: "Amber", arms: 3, twist: 5.2, spin: 0.07, jitter: 1, size: 1,
      c0: "#ffaa5a", c1: "#ffdc82", c2: "#ff8796", hot: "#ffd696", deep: "#f08c6e", core: "#fff4d6", accent: "#ccff00" },
    { id: "dawn", name: "Dawn", arms: 3, twist: 3.6, spin: 0.045, jitter: 1.35, size: 1.28,
      c0: "#ffb39a", c1: "#ffd0c4", c2: "#ffc4d4", hot: "#ffd8cc", deep: "#e09098", core: "#fff1ea", accent: "#ffe08a" },
    { id: "dusk", name: "Dusk", arms: 4, twist: 6.6, spin: 0.055, jitter: 0.72, size: 0.92,
      c0: "#7d6ad4", c1: "#c4b6f2", c2: "#f0b4d4", hot: "#d4c4f4", deep: "#6a58b0", core: "#f6e4f4", accent: "#e4dcff" },
    { id: "grove", name: "Grove", arms: 3, twist: 4.5, spin: 0.048, jitter: 1.05, size: 1.12,
      c0: "#6eae78", c1: "#e2c56a", c2: "#f0e2b0", hot: "#d8e2b4", deep: "#3f8f68", core: "#f3f6e4", accent: "#dff08a" },
    { id: "hearth", name: "Hearth", arms: 2, twist: 3.15, spin: 0.05, jitter: 1.15, size: 1.38,
      c0: "#e15a32", c1: "#ffb066", c2: "#ffd0a4", hot: "#ffb080", deep: "#c44828", core: "#ffe0c4", accent: "#ffcc66" }
  ];

  var TOTAL = 60;
  var INHALE = 4, EXHALE = 6, CYCLE = INHALE + EXHALE;
  var SPECK_COUNT = 220;

  var canvas = document.getElementById("c");
  var cueEl = document.getElementById("cue");
  var lineEl = document.getElementById("line");
  var hintEl = document.getElementById("hint");
  var toneBtn = document.getElementById("tone");
  var lookBtn = document.getElementById("look");
  var swatchEl = document.getElementById("swatch");
  var lookNameEl = document.getElementById("look-name");
  var lookLiveEl = document.getElementById("look-live");
  var actionsEl = document.getElementById("actions");
  var shareBtn = document.getElementById("share");
  var noteEl = document.getElementById("note");

  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var lookIndex = 0;
  var start = 0;
  var begun = false;
  var opened = 0;
  var revealed = false;
  var lastCue = "";
  var lastOpacity = "";
  var dirty = true;
  var rafOn = false;
  var nameTimer = 0;
  var noteTimer = 0;
  var view = { w: 1, h: 1, dpr: 1 };
  var glError = "";

  function hexRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16) / 255,
      parseInt(hex.slice(3, 5), 16) / 255,
      parseInt(hex.slice(5, 7), 16) / 255
    ];
  }
  function hexCss(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + (Math.round(a * 1000) / 1000) + ")";
  }
  function mixHex(c0, c1, c2, h) {
    var from = hexRgb(h < 0.5 ? c0 : c1);
    var to = hexRgb(h < 0.5 ? c1 : c2);
    var k = h < 0.5 ? h * 2 : (h - 0.5) * 2;
    function ch(i) {
      var n = Math.round((from[i] + (to[i] - from[i]) * k) * 255);
      var s = n.toString(16);
      return s.length < 2 ? "0" + s : s;
    }
    return "#" + ch(0) + ch(1) + ch(2);
  }
  for (var li = 0; li < LOOKS.length; li++) {
    var L = LOOKS[li];
    L.bgV = hexRgb(BG);
    L.c0V = hexRgb(L.c0);
    L.c1V = hexRgb(L.c1);
    L.c2V = hexRgb(L.c2);
    L.hotV = hexRgb(L.hot);
    L.deepV = hexRgb(L.deep);
    L.coreV = hexRgb(L.core);
    L.accentV = hexRgb(L.accent);
  }

  function todaysLine() {
    var d = new Date();
    var dayNum = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return LINES[((dayNum * 37) % LINES.length + LINES.length) % LINES.length];
  }
  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function breathAt(t) {
    var p = t % CYCLE;
    return p < INHALE ? ease(p / INHALE) : 1 - ease((p - INHALE) / EXHALE);
  }
  function wantsStill() { return !!(reduce && reduce.matches); }

  var SPECKS = new Float32Array(SPECK_COUNT * 6);
  (function () {
    var s = 7;
    function rnd() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    for (var i = 0; i < SPECK_COUNT; i++) {
      var t = rnd();
      var o = i * 6;
      SPECKS[o] = i;
      SPECKS[o + 1] = t;
      SPECKS[o + 2] = (rnd() - 0.5) * 0.35;
      SPECKS[o + 3] = 1.2 + rnd() * 2.6 * (1 - t * 0.6);
      SPECKS[o + 4] = rnd();
      SPECKS[o + 5] = rnd() * 6.28;
    }
  })();

  function tipHref() {
    var raw = String(TIP_URL || "").replace(/^\s+|\s+$/g, "");
    if (!raw) return "";
    try {
      var u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "";
      if (!u.hostname) return "";
      return u.href;
    } catch (e) {
      return "";
    }
  }

  var BG_FRAG = [
    "precision mediump float;",
    "uniform vec2 uRes;",
    "uniform float uBase;",
    "uniform float uBreath;",
    "uniform float uDim;",
    "uniform float uSpin;",
    "uniform float uDpr;",
    "uniform vec3 uBg;",
    "uniform vec3 uHot;",
    "uniform vec3 uDeep;",
    "uniform vec3 uCore;",
    "uniform vec3 uAccent;",
    "void main() {",
    "  vec2 p = gl_FragCoord.xy - 0.5 * uRes;",
    "  float r = length(p);",
    "  float R = uBase * (0.9 + 0.5 * uBreath);",
    "  float glow = (0.18 + 0.32 * uBreath) * uDim;",
    "  vec3 col = uBg;",
    "  col += uHot * smoothstep(R * 1.55, R * 0.18, r) * glow;",
    "  col += uDeep * smoothstep(R * 1.1, R * 0.32, r) * glow * 0.55;",
    "  float cr = uBase * (0.18 + 0.12 * uBreath);",
    "  col += uCore * smoothstep(cr, 0.0, r) * (0.8 * uDim);",
    "  float ang = 0.6 + uSpin * 1.4;",
    "  float mr = uBase * (0.62 + 0.38 * uBreath) * 0.92;",
    "  vec2 m = vec2(cos(ang), sin(ang)) * mr;",
    "  float md = length(p - m);",
    "  col += uAccent * smoothstep(7.0 * uDpr, 0.0, md) * (0.7 * uDim);",
    "  float vig = smoothstep(1.45, 0.35, length(p / max(uBase, 1.0)));",
    "  col = mix(uBg, col, vig);",
    "  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);",
    "}"
  ].join("\n");

  var PT_VERT = [
    "precision highp float;",
    "attribute float aIndex;",
    "attribute float aT;",
    "attribute float aJitter;",
    "attribute float aSize;",
    "attribute float aHue;",
    "attribute float aTw;",
    "uniform vec2 uRes;",
    "uniform float uBase;",
    "uniform float uBreath;",
    "uniform float uDim;",
    "uniform float uTime;",
    "uniform float uSpin;",
    "uniform float uStill;",
    "uniform float uArms;",
    "uniform float uTwist;",
    "uniform float uJitter;",
    "uniform float uSize;",
    "uniform float uDpr;",
    "uniform float uMaxPoint;",
    "varying float vHue;",
    "varying float vAlpha;",
    "void main() {",
    "  float arm = mod(aIndex, uArms);",
    "  float ang = arm * (6.2831853 / uArms) + aT * uTwist + aJitter * uJitter + uSpin;",
    "  float rad = uBase * (0.62 + 0.38 * uBreath) * (0.08 + aT * 0.92);",
    "  vec2 pos = vec2(cos(ang), sin(ang)) * rad;",
    "  gl_Position = vec4(pos.x / (uRes.x * 0.5), pos.y / (uRes.y * 0.5), 0.0, 1.0);",
    "  float tw = uStill > 0.5 ? 1.0 : 0.75 + 0.25 * sin(uTime * 1.3 + aTw);",
    "  vAlpha = (0.25 + 0.6 * (1.0 - aT)) * tw * (0.55 + 0.45 * uBreath) * uDim;",
    "  vHue = aHue;",
    "  float radius = aSize * (0.8 + 0.5 * uBreath) * 3.2 * uSize * uDpr;",
    "  gl_PointSize = clamp(radius * 2.2, 2.0, uMaxPoint);",
    "}"
  ].join("\n");

  var PT_FRAG = [
    "precision mediump float;",
    "varying float vHue;",
    "varying float vAlpha;",
    "uniform vec3 uC0;",
    "uniform vec3 uC1;",
    "uniform vec3 uC2;",
    "void main() {",
    "  float d = length(gl_PointCoord - vec2(0.5)) * 2.0;",
    "  float fall = clamp(1.0 - d, 0.0, 1.0);",
    "  if (fall > 0.0) fall = pow(fall, 0.75);",
    "  vec3 col = vHue < 0.5 ? mix(uC0, uC1, vHue * 2.0) : mix(uC1, uC2, (vHue - 0.5) * 2.0);",
    "  float a = fall * vAlpha;",
    "  gl_FragColor = vec4(col * a, a);",
    "}"
  ].join("\n");

  var QUAD_VERT = [
    "attribute vec2 aPos;",
    "void main() { gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  function glAttrs() {
    return {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false
    };
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      glError = gl.getShaderInfoLog(sh) || "shader";
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function makeProgram(gl, vsSrc, fsSrc, attribs) {
    var vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
    var fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    for (var i = 0; i < attribs.length; i++) gl.bindAttribLocation(prog, i, attribs[i]);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      glError = gl.getProgramInfoLog(prog) || "link";
      gl.deleteProgram(prog);
      return null;
    }
    return prog;
  }

  function canUseGL() {
    var gl = null;
    try {
      var probe = document.createElement("canvas");
      gl = probe.getContext("webgl", glAttrs()) || probe.getContext("experimental-webgl", glAttrs());
      if (!gl) return false;
      var bg = makeProgram(gl, QUAD_VERT, BG_FRAG, ["aPos"]);
      var pt = makeProgram(gl, PT_VERT, PT_FRAG, ["aIndex", "aT", "aJitter", "aSize", "aHue", "aTw"]);
      if (bg) gl.deleteProgram(bg);
      if (pt) gl.deleteProgram(pt);
      return !!(bg && pt);
    } catch (e) {
      glError = String(e && e.message ? e.message : e);
      return false;
    } finally {
      if (gl) {
        var lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      }
    }
  }

  function createGL(target) {
    var gl = target.getContext("webgl", glAttrs()) || target.getContext("experimental-webgl", glAttrs());
    if (!gl) return null;
    var bgProg = makeProgram(gl, QUAD_VERT, BG_FRAG, ["aPos"]);
    var ptProg = makeProgram(gl, PT_VERT, PT_FRAG, ["aIndex", "aT", "aJitter", "aSize", "aHue", "aTw"]);
    if (!bgProg || !ptProg) return null;

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    var points = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, points);
    gl.bufferData(gl.ARRAY_BUFFER, SPECKS, gl.STATIC_DRAW);

    function loc(prog, name) { return gl.getUniformLocation(prog, name); }
    var bg = {
      uRes: loc(bgProg, "uRes"), uBase: loc(bgProg, "uBase"), uBreath: loc(bgProg, "uBreath"),
      uDim: loc(bgProg, "uDim"), uSpin: loc(bgProg, "uSpin"), uDpr: loc(bgProg, "uDpr"),
      uBg: loc(bgProg, "uBg"), uHot: loc(bgProg, "uHot"), uDeep: loc(bgProg, "uDeep"),
      uCore: loc(bgProg, "uCore"), uAccent: loc(bgProg, "uAccent")
    };
    var pt = {
      uRes: loc(ptProg, "uRes"), uBase: loc(ptProg, "uBase"), uBreath: loc(ptProg, "uBreath"),
      uDim: loc(ptProg, "uDim"), uTime: loc(ptProg, "uTime"), uSpin: loc(ptProg, "uSpin"),
      uStill: loc(ptProg, "uStill"), uArms: loc(ptProg, "uArms"), uTwist: loc(ptProg, "uTwist"),
      uJitter: loc(ptProg, "uJitter"), uSize: loc(ptProg, "uSize"), uDpr: loc(ptProg, "uDpr"),
      uMaxPoint: loc(ptProg, "uMaxPoint"), uC0: loc(ptProg, "uC0"), uC1: loc(ptProg, "uC1"),
      uC2: loc(ptProg, "uC2")
    };
    var maxPoint = 64;
    try {
      var range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
      if (range && range[1]) maxPoint = range[1];
    } catch (e) {}
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);

    function u3(location, v) { gl.uniform3f(location, v[0], v[1], v[2]); }

    return {
      kind: "gl",
      paint: function (s) {
        if (gl.isContextLost()) return;
        var look = s.look;
        var w = target.width, h = target.height;
        var base = Math.min(w, h) * 0.36;
        gl.viewport(0, 0, w, h);
        gl.disable(gl.BLEND);
        gl.useProgram(bgProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        for (var i = 1; i < 6; i++) gl.disableVertexAttribArray(i);
        gl.uniform2f(bg.uRes, w, h);
        gl.uniform1f(bg.uBase, base);
        gl.uniform1f(bg.uBreath, s.breath);
        gl.uniform1f(bg.uDim, s.dim);
        gl.uniform1f(bg.uSpin, s.spin);
        gl.uniform1f(bg.uDpr, s.dpr);
        u3(bg.uBg, look.bgV);
        u3(bg.uHot, look.hotV);
        u3(bg.uDeep, look.deepV);
        u3(bg.uCore, look.coreV);
        u3(bg.uAccent, look.accentV);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(ptProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, points);
        var stride = 24;
        var names = ["aIndex", "aT", "aJitter", "aSize", "aHue", "aTw"];
        for (var a = 0; a < names.length; a++) {
          gl.enableVertexAttribArray(a);
          gl.vertexAttribPointer(a, 1, gl.FLOAT, false, stride, a * 4);
        }
        gl.uniform2f(pt.uRes, w, h);
        gl.uniform1f(pt.uBase, base);
        gl.uniform1f(pt.uBreath, s.breath);
        gl.uniform1f(pt.uDim, s.dim);
        gl.uniform1f(pt.uTime, s.time);
        gl.uniform1f(pt.uSpin, s.spin);
        gl.uniform1f(pt.uStill, s.still);
        gl.uniform1f(pt.uArms, look.arms);
        gl.uniform1f(pt.uTwist, look.twist);
        gl.uniform1f(pt.uJitter, look.jitter);
        gl.uniform1f(pt.uSize, look.size);
        gl.uniform1f(pt.uDpr, s.dpr);
        gl.uniform1f(pt.uMaxPoint, maxPoint);
        u3(pt.uC0, look.c0V);
        u3(pt.uC1, look.c1V);
        u3(pt.uC2, look.c2V);
        gl.drawArrays(gl.POINTS, 0, SPECK_COUNT);
      }
    };
  }

  function softSprite(hex, size) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var r = parseInt(hex.slice(1, 3), 16);
    var gg = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, "rgba(" + r + "," + gg + "," + b + ",1)");
    grd.addColorStop(1, "rgba(" + r + "," + gg + "," + b + ",0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2, 0, 6.2831853);
    g.fill();
    return c;
  }

  function create2D(target) {
    var ctx = target.getContext("2d", { alpha: false });
    var sprites = { id: "", list: [], accent: null };
    function ensure(look) {
      if (sprites.id === look.id) return;
      sprites.id = look.id;
      sprites.list = [];
      for (var i = 0; i < 8; i++) sprites.list.push(softSprite(mixHex(look.c0, look.c1, look.c2, i / 7), 96));
      sprites.accent = softSprite(look.accent, 64);
    }
    return {
      kind: "2d",
      paint: function (s) {
        var look = s.look;
        var dpr = s.dpr;
        var w = view.w, h = view.h;
        ensure(look);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, w, h);
        var b = s.breath, dim = s.dim;
        var cx = w / 2, cy = h / 2;
        var base = Math.min(w, h) * 0.36;
        var R = base * (0.9 + 0.5 * b);
        var glow = (0.18 + 0.32 * b) * dim;
        ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, R * 1.55));
        g.addColorStop(0, hexCss(look.hot, glow));
        g.addColorStop(0.4, hexCss(look.deep, glow * 0.5));
        g.addColorStop(1, "rgba(11,9,22,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        var scale = 0.62 + 0.38 * b;
        for (var i = 0; i < SPECK_COUNT; i++) {
          var o = i * 6;
          var t = SPECKS[o + 1];
          var arm = SPECKS[o] % look.arms;
          var ang = arm * (6.2831853 / look.arms) + t * look.twist + SPECKS[o + 2] * look.jitter + s.spin;
          var rad = base * scale * (0.08 + t * 0.92);
          var x = cx + Math.cos(ang) * rad;
          var y = cy - Math.sin(ang) * rad;
          var tw = s.still ? 1 : 0.75 + 0.25 * Math.sin(s.time * 1.3 + SPECKS[o + 5]);
          var alpha = (0.25 + 0.6 * (1 - t)) * tw * (0.55 + 0.45 * b) * dim;
          var radius = SPECKS[o + 3] * (0.8 + 0.5 * b) * 3.2 * look.size;
          var bucket = Math.round(SPECKS[o + 4] * 7);
          if (bucket < 0) bucket = 0;
          if (bucket > 7) bucket = 7;
          ctx.globalAlpha = alpha;
          ctx.drawImage(sprites.list[bucket], x - radius, y - radius, radius * 2, radius * 2);
        }
        var cr = base * (0.18 + 0.12 * b);
        var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, cr));
        cg.addColorStop(0, hexCss(look.core, 0.8 * dim));
        cg.addColorStop(1, hexCss(look.core, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, 6.2831853);
        ctx.fill();
        var ma = 0.6 + s.spin * 1.4;
        var mr = base * scale * 0.92;
        var mx = cx + Math.cos(ma) * mr;
        var my = cy - Math.sin(ma) * mr;
        ctx.globalAlpha = 0.7 * dim;
        ctx.drawImage(sprites.accent, mx - 7, my - 7, 14, 14);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        var vg = ctx.createRadialGradient(cx, cy, base * 0.35, cx, cy, Math.max(w, h) * 0.72);
        vg.addColorStop(0, "rgba(11,9,22,0)");
        vg.addColorStop(1, "rgba(11,9,22,0.72)");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, w, h);
      }
    };
  }

  var renderer = (canUseGL() && createGL(canvas)) || create2D(canvas);

  function fit() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, window.innerWidth);
    var h = Math.max(1, window.innerHeight);
    view.w = w;
    view.h = h;
    view.dpr = dpr;
    var bw = Math.max(1, Math.round(w * dpr));
    var bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      dirty = true;
    }
  }

  function readLook() {
    var id = "";
    try { id = localStorage.getItem(LOOK_KEY) || ""; } catch (e) {}
    for (var i = 0; i < LOOKS.length; i++) if (LOOKS[i].id === id) return i;
    return 0;
  }
  function saveLook() {
    try { localStorage.setItem(LOOK_KEY, LOOKS[lookIndex].id); } catch (e) {}
  }
  function applyLook(announce) {
    var look = LOOKS[lookIndex];
    swatchEl.style.background = look.c1;
    swatchEl.style.boxShadow = "0 0 8px " + look.c1;
    var label = "Swirl style: " + look.name + ". Tap to change.";
    lookBtn.setAttribute("aria-label", label);
    lookBtn.title = look.name;
    if (announce) {
      lookLiveEl.textContent = look.name;
      lookNameEl.textContent = look.name;
      lookNameEl.classList.add("show");
      if (nameTimer) clearTimeout(nameTimer);
      nameTimer = setTimeout(function () { lookNameEl.classList.remove("show"); }, 1700);
    }
    dirty = true;
  }

  function setCueOpacity(v) {
    var s = (Math.round(v * 100) / 100).toFixed(2);
    if (s === lastOpacity) return;
    lastOpacity = s;
    cueEl.style.opacity = s;
  }
  function showEnd() {
    lineEl.removeAttribute("aria-hidden");
    lineEl.textContent = todaysLine();
    lineEl.classList.add("show");
    hintEl.classList.add("show");
    actionsEl.classList.add("show");
    actionsEl.setAttribute("aria-hidden", "false");
    if ("inert" in actionsEl) actionsEl.inert = false;
  }
  function hideEnd() {
    lineEl.classList.remove("show");
    lineEl.setAttribute("aria-hidden", "true");
    hintEl.classList.remove("show");
    actionsEl.classList.remove("show");
    actionsEl.setAttribute("aria-hidden", "true");
    if ("inert" in actionsEl) actionsEl.inert = true;
    noteEl.textContent = "";
    noteEl.classList.remove("show");
  }

  function update(now) {
    var still = wantsStill();
    if (!begun) {
      var idle = (now - opened) / 1000;
      if (!still || dirty) {
        renderer.paint({
          time: still ? 8 : idle,
          breath: still ? 0.55 : (0.42 + 0.12 * Math.sin(idle * 0.8)),
          dim: 1,
          spin: still ? 0.35 : idle * LOOKS[lookIndex].spin * 0.7,
          still: still ? 1 : 0,
          dpr: view.dpr,
          look: LOOKS[lookIndex]
        });
        if (still) dirty = false;
      }
      if (lastCue !== "tap anywhere") {
        cueEl.textContent = "tap anywhere";
        lastCue = "tap anywhere";
      }
      if (cueEl.getAttribute("aria-hidden")) cueEl.removeAttribute("aria-hidden");
      setCueOpacity(1);
      return;
    }
    var t = (now - start) / 1000;
    var done = t >= TOTAL;
    var breath = still ? 0.62 : (done ? 0.55 + 0.08 * Math.sin(t * 0.5) : breathAt(t));
    var dim = 1;
    if (done) dim = still ? 0.36 : Math.max(0.32, 1 - Math.min(1, (t - TOTAL) / 4.5) * 0.68);
    if (done && !revealed) {
      revealed = true;
      dirty = true;
      showEnd();
    }
    if (!still || dirty) {
      renderer.paint({
        time: still ? 8 : t,
        breath: breath,
        dim: dim,
        spin: still ? 0.35 : t * LOOKS[lookIndex].spin,
        still: still ? 1 : 0,
        dpr: view.dpr,
        look: LOOKS[lookIndex]
      });
      if (still) dirty = false;
    }
    if (!done) {
      var inPhase = (t % CYCLE) < INHALE;
      var word = inPhase ? "breathe in" : "breathe out";
      if (word !== lastCue) { cueEl.textContent = word; lastCue = word; }
      if (cueEl.getAttribute("aria-hidden")) cueEl.removeAttribute("aria-hidden");
      if (still) setCueOpacity(0.92);
      else {
        var p = t % CYCLE;
        var edge = inPhase ? Math.min(p, INHALE - p) : Math.min(p - INHALE, CYCLE - p);
        var fadeOverall = Math.max(0, 1 - t / (TOTAL * 0.75));
        setCueOpacity(Math.min(1, edge / 0.6) * 0.95 * fadeOverall);
      }
    } else {
      setCueOpacity(0);
      if (!cueEl.getAttribute("aria-hidden")) cueEl.setAttribute("aria-hidden", "true");
    }
    tone.update(t, breath, done, still);
  }

  function loop(now) {
    update(now);
    if (wantsStill()) { rafOn = false; return; }
    requestAnimationFrame(loop);
  }
  function ensureLoop() {
    if (rafOn || wantsStill()) return;
    rafOn = true;
    requestAnimationFrame(loop);
  }

  var tone = {
    on: false, ac: null, gain: null, last: 0, lastTarget: -1,
    enable: function () {
      try {
        if (!this.ac) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          this.ac = new AC();
          this.gain = this.ac.createGain();
          this.gain.gain.value = 0;
          var lp = this.ac.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = 700;
          var levels = [0.6, 0.3, 0.15];
          var freqs = [196, 293.66, 392.0];
          for (var i = 0; i < freqs.length; i++) {
            var o = this.ac.createOscillator();
            o.type = "sine";
            o.frequency.value = freqs[i];
            var g = this.ac.createGain();
            g.gain.value = levels[i];
            o.connect(g);
            g.connect(lp);
            o.start();
          }
          lp.connect(this.gain);
          this.gain.connect(this.ac.destination);
        }
        if (this.ac.state === "suspended") this.ac.resume();
        this.on = true;
      } catch (e) { this.on = false; }
    },
    disable: function () {
      this.on = false;
      if (this.gain && this.ac) this.gain.gain.setTargetAtTime(0, this.ac.currentTime, 0.3);
    },
    update: function (t, b, done, still) {
      if (!this.on || !this.gain || !this.ac) return;
      var target = still ? 0.012 : (done ? 0.012 : 0.008 + 0.03 * b);
      var now = this.ac.currentTime;
      if (now - this.last < 0.1 && Math.abs(target - this.lastTarget) < 0.003) return;
      this.last = now;
      this.lastTarget = target;
      this.gain.gain.setTargetAtTime(target, now, still ? 0.5 : 0.25);
    }
  };

  function flashNote(text) {
    noteEl.textContent = text;
    noteEl.classList.add("show");
    if (noteTimer) clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      noteEl.classList.remove("show");
    }, 2400);
  }
  function legacyCopy(url, ok, fail) {
    var ta = document.createElement("textarea");
    ta.value = url;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var copied = false;
    try { copied = document.execCommand("copy"); } catch (e) { copied = false; }
    document.body.removeChild(ta);
    if (copied) ok(); else fail();
  }
  function copyLink() {
    function ok() { flashNote("Link copied"); }
    function fail() { flashNote("Couldn’t copy the link"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SHARE_URL).then(ok, function () { legacyCopy(SHARE_URL, ok, fail); });
      return;
    }
    legacyCopy(SHARE_URL, ok, fail);
  }
  function sharePage() {
    var payload = { title: "Believe Swirl", text: SHARE_TEXT, url: SHARE_URL };
    if (navigator.share) {
      navigator.share(payload).then(function () {}, function (err) {
        if (err && err.name === "AbortError") return;
        copyLink();
      });
      return;
    }
    copyLink();
  }

  function replay() {
    begun = true;
    document.body.classList.remove("waiting");
    start = performance.now();
    revealed = false;
    lastCue = "";
    lastOpacity = "";
    hideEnd();
    dirty = true;
    ensureLoop();
    update(start);
  }
  function beginIfNeeded() {
    if (!begun) replay();
  }
  function isControl(node) {
    return !!(node && node.closest && node.closest("button, a"));
  }

  lookBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    e.preventDefault();
    beginIfNeeded();
    lookIndex = (lookIndex + 1) % LOOKS.length;
    saveLook();
    applyLook(true);
    update(performance.now());
  });
  toneBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    beginIfNeeded();
    if (tone.on) tone.disable(); else tone.enable();
    toneBtn.setAttribute("aria-pressed", tone.on ? "true" : "false");
    toneBtn.setAttribute("aria-label", "Soft tone (" + (tone.on ? "on" : "off") + ")");
  });
  shareBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    sharePage();
  });

  var supportHref = tipHref();
  if (supportHref) {
    var support = document.createElement("a");
    support.id = "support";
    support.href = supportHref;
    support.target = "_blank";
    support.rel = "noopener noreferrer";
    support.textContent = "\u2661 Support Jennifer";
    actionsEl.appendChild(support);
    support.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  document.addEventListener("click", function (e) {
    if (isControl(e.target)) return;
    if (!begun) beginIfNeeded();
    else replay();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== " " && e.key !== "Enter") return;
    if (isControl(e.target)) return;
    e.preventDefault();
    if (!begun) beginIfNeeded();
    else replay();
  });

  window.addEventListener("resize", function () { fit(); dirty = true; update(performance.now()); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () { fit(); dirty = true; update(performance.now()); });
  }
  if (reduce && reduce.addEventListener) {
    reduce.addEventListener("change", function () {
      dirty = true;
      ensureLoop();
      update(performance.now());
    });
  } else if (reduce && reduce.addListener) {
    reduce.addListener(function () { dirty = true; ensureLoop(); update(performance.now()); });
  }

  lookIndex = readLook();
  applyLook(false);
  if ("inert" in actionsEl) actionsEl.inert = true;
  fit();
  opened = performance.now();
  ensureLoop();
  if (wantsStill()) update(opened);
  setInterval(function () {
    if (wantsStill()) update(performance.now());
  }, 250);

  (function setupInstall() {
    var installEl = document.getElementById("install");
    var installCopy = document.getElementById("install-copy");
    var installAndroid = document.getElementById("install-android");
    var installDismiss = document.getElementById("install-dismiss");
    var deferredInstall = null;
    if (!installEl) return;

    function installDismissed() {
      try { return localStorage.getItem(INSTALL_KEY) === "1"; } catch (e) { return false; }
    }
    function rememberInstall() {
      try { localStorage.setItem(INSTALL_KEY, "1"); } catch (e) {}
    }
    function standalone() {
      if (window.navigator.standalone === true) return true;
      try {
        if (window.matchMedia("(display-mode: standalone)").matches) return true;
        if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
      } catch (e) {}
      return false;
    }
    function iosDevice() {
      var ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/.test(ua)) return true;
      return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    }
    function iosSafari() {
      if (!iosDevice()) return false;
      var ua = navigator.userAgent || "";
      if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\/|FBAN|FBAV/.test(ua)) return false;
      return /Safari/.test(ua);
    }
    function android() {
      return /Android/i.test(navigator.userAgent || "");
    }
    function placeInstall() {
      if (installEl.hidden) return;
      var h = installEl.offsetHeight || 0;
      document.documentElement.style.setProperty("--install-space", (h + 18) + "px");
    }
    function hideInstall(remember) {
      if (remember) rememberInstall();
      installEl.hidden = true;
      installEl.setAttribute("aria-hidden", "true");
      document.body.classList.remove("install-open");
      deferredInstall = null;
    }
    function showInstall(mode) {
      if (standalone() || installDismissed()) return;
      installEl.hidden = false;
      installEl.setAttribute("aria-hidden", "false");
      document.body.classList.add("install-open");
      var ios = mode === "ios";
      installCopy.hidden = !ios;
      installDismiss.hidden = !ios;
      installAndroid.hidden = ios;
      placeInstall();
    }
    window.addEventListener("resize", placeInstall);

    installEl.addEventListener("click", function (e) { e.stopPropagation(); });
    installDismiss.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      hideInstall(true);
    });
    installAndroid.addEventListener("click", function (e) {
      e.stopPropagation();
      e.preventDefault();
      if (!deferredInstall || !deferredInstall.prompt) return;
      var promptEvent = deferredInstall;
      deferredInstall = null;
      try { promptEvent.prompt(); } catch (err) { hideInstall(true); return; }
      var choice = promptEvent.userChoice;
      if (choice && choice.then) {
        choice.then(function () { hideInstall(true); }, function () { hideInstall(true); });
      } else hideInstall(true);
    });

    if (iosSafari()) showInstall("ios");
    window.addEventListener("beforeinstallprompt", function (e) {
      if (!android() || standalone() || installDismissed()) return;
      e.preventDefault();
      deferredInstall = e;
      showInstall("android");
    });
    window.addEventListener("appinstalled", function () { hideInstall(true); });
  })();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      var opts = { scope: "/believe-swirl/" };
      opts.updateViaCache = "none";
      navigator.serviceWorker.register("/believe-swirl/sw.js", opts).catch(function () {});
    });
  }

  window.__believe = {
    line: todaysLine,
    count: LINES.length,
    skip: function () {
      if (!begun) replay();
      start -= TOTAL * 1000;
    },
    engine: renderer.kind,
    looks: LOOKS.length,
    tip: supportHref,
    glError: glError
  };
})();
