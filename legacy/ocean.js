// Tutu's Sphere: the shore. A night sea all the way around her light.
// Move the cursor to turn your head; drag (or swipe, or use the arrow keys) to turn all the way round.
(() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)"), mob = matchMedia("(pointer:coarse)").matches, TAU = Math.PI*2;
  const c = document.createElement("canvas"); c.id = "sea"; c.setAttribute("aria-hidden", "true");
  c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0";
  document.body.insertBefore(c, document.body.firstChild);   // same layer as the stars, drawn first, so the stars, sphere and threads stay on top
  const x = c.getContext("2d");
  let W = 0, H = 0;
  function size(){ const dpr = Math.min(mob ? 1.5 : 2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; c.width = Math.round(W*dpr); c.height = Math.round(H*dpr); x.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener("resize", size); size();

  // ---------- the view ----------
  const FOV = mob ? 1.25 : 1.6;   // horizontal field of view in radians
  const wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  let base = 0, look = 0, lookP = 0, yaw = 0, pitch = 0, drag = null;
  const sphereZone = (px, py) => { const r = Math.min(W*.36, H*.27, 260); return Math.hypot(px - W/2, py - H*.49) <= r + Math.max(60, r*.25); };
  addEventListener("pointerdown", e => { if (e.target.closest("a,button,input,form,#gate,#find") || sphereZone(e.clientX, e.clientY)) return; drag = {x: e.clientX, y: e.clientY, b: base, p: lookP}; });
  addEventListener("pointermove", e => {
    if (drag){ base = drag.b - (e.clientX - drag.x)/W*FOV*1.3; if (mob) lookP = Math.max(-.08, Math.min(.1, drag.p + (e.clientY - drag.y)/H*.25)); }
    if (!mob){ look = (e.clientX/W - .5)*.9; lookP = (e.clientY/H - .5)*.12; } }, {passive: true});
  const up = () => { drag = null; }; addEventListener("pointerup", up); addEventListener("pointercancel", up);
  addEventListener("keydown", e => { if (e.target.closest && e.target.closest("input")) return; if (e.key === "ArrowLeft") base -= .3; if (e.key === "ArrowRight") base += .3; });

  // ---------- the world, by compass angle ----------
  const MOON = {a: .55, e: .15};
  const LIGHT = {a: -1.35};
  const LAND = [{a: -1.38, w: .32, h: .034}, {a: -1.02, w: .22, h: .016}, {a: 2.55, w: .62, h: .05}, {a: 3.12, w: .38, h: .028}, {a: 1.75, w: .16, h: .009}];
  function ridge(a){ let e = 0; for (const L of LAND){ const d = wrap(a - L.a)/L.w; if (Math.abs(d) < 1) e = Math.max(e, L.h*(1 - d*d)*(.86 + .08*Math.sin(a*41 + L.a*7) + .06*Math.sin(a*97))); } return e; }
  const hash = n => { const s = Math.sin(n*127.1)*43758.5453; return s - Math.floor(s); };

  // ---------- hint, once she is open ----------
  const tip = document.createElement("div"); tip.textContent = mob ? "swipe the sky or the sea to look around" : "move or drag to look around the shore";
  tip.style.cssText = "position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top) + 5.5vh + 58px);z-index:4;text-align:center;font:italic 12px Georgia,serif;letter-spacing:.08em;color:rgba(233,200,140,.55);opacity:0;transition:opacity 1.6s;pointer-events:none";
  document.body.appendChild(tip);
  const gate = document.getElementById("gate"); let tipped = false;
  const tipCheck = setInterval(() => { if (gate && gate.classList.contains("on")) return; if (!tipped){ tipped = true; setTimeout(() => tip.style.opacity = 1, 4000); setTimeout(() => tip.style.opacity = 0, 12000); clearInterval(tipCheck); } }, 700);

  // ---------- one loop ----------
  let last = performance.now();
  function frame(now){
    const dt = Math.min(64, now - last)/1000; last = now; const rm = RM.matches, t = now/1000, tw = rm ? t*.25 : t;
    const sway = rm ? 0 : Math.sin(t*.07)*.025;
    yaw += (base + look + sway - yaw)*Math.min(1, dt*2.4); pitch += (lookP - pitch)*Math.min(1, dt*2);
    const K = W/FOV, hy = H*.6 - pitch*K;   // pixels per radian, horizon line
    const sx = a => W/2 + wrap(a - yaw)*K, onScreen = (px, m) => px > -m && px < W + m;

    // sky: deep night overhead, a violet haze at the horizon, warmer toward the moon
    let g = x.createLinearGradient(0, 0, 0, hy); g.addColorStop(0, "#04030a"); g.addColorStop(.55, "#0a0920"); g.addColorStop(.88, "#1a1740"); g.addColorStop(1, "#2a2352");
    x.fillStyle = g; x.fillRect(0, 0, W, hy + 1);
    const mx = sx(MOON.a), my = hy - MOON.e*K, mVis = onScreen(mx, W*.8);
    if (mVis){
      let rg = x.createRadialGradient(mx, my, 0, mx, my, K*.55); rg.addColorStop(0, "rgba(255,226,190,.20)"); rg.addColorStop(.35, "rgba(170,150,230,.07)"); rg.addColorStop(1, "rgba(60,40,120,0)"); x.fillStyle = rg; x.fillRect(0, 0, W, hy + 1);
      rg = x.createRadialGradient(mx, my, 0, mx, my, K*.05); rg.addColorStop(0, "rgba(255,246,228,.95)"); rg.addColorStop(.35, "rgba(255,236,206,.85)"); rg.addColorStop(.4, "rgba(255,226,190,.25)"); rg.addColorStop(1, "rgba(255,220,180,0)"); x.fillStyle = rg; x.beginPath(); x.arc(mx, my, K*.05, 0, TAU); x.fill(); }

    // the sea
    g = x.createLinearGradient(0, hy, 0, H); g.addColorStop(0, "#151433"); g.addColorStop(.25, "#0c0c24"); g.addColorStop(1, "#040410"); x.fillStyle = g; x.fillRect(0, hy, W, H - hy);
    // horizon haze
    g = x.createLinearGradient(0, hy - 18, 0, hy + 14); g.addColorStop(0, "rgba(120,110,200,0)"); g.addColorStop(.55, "rgba(150,135,220,.16)"); g.addColorStop(1, "rgba(120,110,200,0)"); x.fillStyle = g; x.fillRect(0, hy - 18, W, 32);

    // distant land, a headland with a lighthouse and far hills
    x.fillStyle = "#07061a"; x.beginPath(); x.moveTo(0, hy + 1); let any = false;
    for (let px = -4; px <= W + 4; px += 3){ const e = ridge(yaw + (px - W/2)/K); if (e > 0) any = true; x.lineTo(px, hy - e*K); }
    x.lineTo(W + 4, hy + 1); x.closePath(); if (any) x.fill();
    const lx = sx(LIGHT.a);
    const beam = Math.pow(Math.max(0, Math.cos(tw*TAU/9)), 30), blink = .35 + .65*beam;
    if (onScreen(lx, K*.6)){ const ly = hy - ridge(LIGHT.a)*K;
      x.fillStyle = "#0b0a20"; x.fillRect(lx - 2, ly - 11, 4, 11);
      let rg = x.createRadialGradient(lx, ly - 12, 0, lx, ly - 12, 10 + 70*beam); rg.addColorStop(0, `rgba(255,236,190,${(.9*blink).toFixed(3)})`); rg.addColorStop(1, "rgba(255,220,160,0)"); x.fillStyle = rg; x.beginPath(); x.arc(lx, ly - 12, 10 + 70*beam, 0, TAU); x.fill();
      if (beam > .02){ x.fillStyle = `rgba(255,230,180,${(.18*beam).toFixed(3)})`; x.fillRect(lx - 1.5, hy + 2, 3, (H - hy)*.35); } }

    // waves: rows that open toward you, moving slowly, catching the moonlight
    const rows = mob ? 22 : 34, step = mob ? 10 : 7, shift = yaw*K;
    x.lineCap = "round";
    for (let k = 1; k <= rows; k++){
      const u = k/rows, y0 = hy + (H - hy)*.9*Math.pow(u, 2.1) + 2, amp = .4 + 5*u*u, fr = .045/(.25 + u), sp = (.35 + .5*u)*(rm ? .2 : 1);
      x.strokeStyle = `rgba(130,140,230,${(.04 + .17*u).toFixed(3)})`; x.lineWidth = .6 + 1.4*u; x.beginPath();
      for (let px = -step; px <= W + step; px += step){ const wx = px + shift*(.6 + .4*u); const yy = y0 + amp*(Math.sin(wx*fr - tw*sp*2 + k*1.7) + .4*Math.sin(wx*fr*2.3 + tw*sp*1.3 + k)); px === -step ? x.moveTo(px, yy) : x.lineTo(px, yy); }
      x.stroke();
      // moon glitter on this row
      if (mVis){ const ww = 4 + K*.16*u, G = mob ? 5 : 8;
        for (let j = 0; j < G; j++){ const h = hash(k*31 + j*7), fl = Math.sin(tw*(2.2 + 2*h) + j*2.1 + k*1.3);
          if (fl < .2) continue; const gx = mx + (h - .5)*2*ww + Math.sin(tw*.9 + j + k)*ww*.25;
          x.fillStyle = `rgba(255,${(226 + 20*h).toFixed(0)},${(186 + 30*h).toFixed(0)},${((fl - .2)*(.75 - .35*u)).toFixed(3)})`; x.fillRect(gx, y0 - .5, 1.5 + 7*u*h + 2*u, .8 + 1.4*u); } } }

    // the shore: dark sand, and foam that comes and goes
    const sy = hy + (H - hy)*.9 + (rm ? 0 : Math.sin(tw*.42)*7 + Math.sin(tw*.95 + 1)*3);
    g = x.createLinearGradient(0, sy, 0, H); g.addColorStop(0, "#120f1c"); g.addColorStop(1, "#0a0810"); x.fillStyle = g;
    x.beginPath(); x.moveTo(-4, H); for (let px = -4; px <= W + 8; px += 8) x.lineTo(px, sy + 3*Math.sin((px + shift)*.021 + tw*.6) + 2*Math.sin((px + shift)*.057 - tw)); x.lineTo(W + 8, H); x.closePath(); x.fill();
    for (const [off, a, lw] of [[0, .38, 1.6], [-5, .14, 1], [6, .1, 2.5]]){ x.strokeStyle = `rgba(225,228,255,${a})`; x.lineWidth = lw; x.beginPath();
      for (let px = -4; px <= W + 8; px += 8){ const yy = sy + off + 3*Math.sin((px + shift)*.021 + tw*.6) + 2*Math.sin((px + shift)*.057 - tw); px === -4 ? x.moveTo(px, yy) : x.lineTo(px, yy); } x.stroke(); }

    requestAnimationFrame(frame); }
  requestAnimationFrame(frame);
  window.__sea = {yaw: () => +yaw.toFixed(3), turn: a => { base += a; }};
})();
