/* Soft7 ember trail · 3 · 6 · 9. Shared by /x/ (and any page without its own #trail). */
(function(){if(window.__hz55L)return;window.__hz55L=1;var s=document.createElement('script');s.src='/assets/hz55.js';s.async=true;(document.head||document.documentElement).appendChild(s);})();
(function(){
  if (window.__soft7Ember) return; window.__soft7Ember = 1;
  var mm = window.matchMedia ? function(q){ return matchMedia(q).matches; } : function(){ return false; };
  if (mm('(prefers-reduced-motion: reduce)')) return;          // respect reduced motion
  if (!mm('(any-pointer: fine)') && !mm('(any-hover: hover)')) return; // touch-only: off
  if (document.getElementById('trail')) return;                // page already has its native 3-6-9 trail (/phoenix/, home)
  var c = document.createElement('canvas'); if (!c.getContext) return;
  c.setAttribute('aria-hidden', 'true');
  c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9990';
  document.body.appendChild(c);
  var x = c.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w, h, parts = [], CAP = 120, LIFE = 900, bursts = [3, 6, 9], bi = 0, last = 0, px = -1, py = -1, lt = 0, idle = true;
  var cols = { gold:[246,223,160,230,184,92], ember:[255,196,120,255,122,42] }, spr = {};
  Object.keys(cols).forEach(function(k){
    var q = cols[k], s = document.createElement('canvas'); s.width = s.height = 64;
    var g = s.getContext('2d'), gr = g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0, 'rgba(255,250,235,1)');
    gr.addColorStop(.18, 'rgba('+q[0]+','+q[1]+','+q[2]+',.95)');
    gr.addColorStop(.42, 'rgba('+q[3]+','+q[4]+','+q[5]+',.55)');
    gr.addColorStop(1, 'rgba('+q[3]+','+q[4]+','+q[5]+',0)');
    g.fillStyle = gr; g.fillRect(0,0,64,64); spr[k] = s;
  });
  function size(){ w = innerWidth; h = innerHeight; c.width = w*dpr; c.height = h*dpr; x.setTransform(dpr,0,0,dpr,0,0); }
  function emit(cx, cy, n){
    for (var i = 0; i < n; i++){
      if (parts.length >= CAP) parts.shift();
      var a = Math.random()*6.283, sp = .35 + Math.random()*1.5;
      parts.push({ x:cx+(Math.random()-.5)*8, y:cy+(Math.random()-.5)*8, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-.22,
        r:1.5+Math.random()*2.5, life:1, ph:Math.random()*6.283, hue: Math.random() < .45 ? 'gold' : 'ember' });
    }
    if (idle){ idle = false; lt = 0; requestAnimationFrame(frame); }
  }
  function move(cx, cy){
    var now = performance.now();
    if (px < 0){ px = cx; py = cy; last = now; emit(cx, cy, bursts[bi++ % 3]); return; }
    var dist = Math.hypot(cx-px, cy-py);
    if (now - last < 40 && dist < 6) return;
    var steps = Math.max(1, Math.min(5, Math.round(dist/22))), n = bursts[bi++ % 3]; // 3 → 6 → 9 → 3 …
    for (var s = 1; s <= steps; s++) emit(px+(cx-px)*s/steps, py+(cy-py)*s/steps, s === steps ? n : 3);
    last = now; px = cx; py = cy;
  }
  function frame(ts){
    var dt = lt ? Math.min(50, ts-lt) : 16.7, f = dt/16.7; lt = ts;
    x.clearRect(0,0,w,h); x.globalCompositeOperation = 'lighter';
    for (var i = parts.length-1; i >= 0; i--){
      var p = parts[i]; p.x += p.vx*f; p.y += p.vy*f; p.vx *= .985; p.vy -= .012*f; p.life -= dt/LIFE; // gentle upward drift
      if (p.life <= 0){ parts.splice(i,1); continue; }
      var d = p.r*6*(.55+.45*p.life);
      x.globalAlpha = Math.min(1, p.life*1.15) * (.72 + .28*Math.sin(ts*.018 + p.ph)); // flicker
      x.drawImage(spr[p.hue], p.x-d/2, p.y-d/2, d, d);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    if (parts.length) requestAnimationFrame(frame); else idle = true;
  }
  addEventListener('pointermove', function(e){ if (e.pointerType === 'touch') return; move(e.clientX, e.clientY); }, { passive:true });
  document.documentElement.addEventListener('mouseout', function(e){ if (!e.relatedTarget) px = -1; });
  addEventListener('resize', size); size();
})();
