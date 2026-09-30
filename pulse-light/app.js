/* Connection — a small figure of light. */
(function () {
  'use strict';
  var cfg = window.CONNECTION_CONFIG, canvas = document.getElementById('c'), ctx = canvas.getContext('2d');
  var people = cfg.people, current = people[0], t = 0, pulseAt = 0, ripples = [], sourcePulse = null;
  var sources = [{name:'God', x:.42, y:.15}, {name:'Jesus', x:.58, y:.25}];
  var label = document.getElementById('name'), full = document.getElementById('full'), phrase = document.getElementById('phrase'), nav = document.getElementById('people');
  phrase.textContent = cfg.phrase;
  var arrivalAt = 0, arrivalRing = false, ARRIVE = 7000;
  function still(el) { el.style.opacity = ''; }
  function textIn(aa) { if (aa > 9800) { still(label); still(full); still(phrase); return; } label.style.opacity = ease((aa - 3400) / 2400); full.style.opacity = .55 * ease((aa - 5200) / 2400); phrase.style.opacity = .6 * ease((aa - 6800) / 2600); }
  function select(p, rx, ry, replay) {
    var fresh = p !== current || replay; current = p; pulseAt = performance.now(); label.textContent = p.name;
    full.textContent = p.arrival ? (p.fullName || '') : ''; var mem = [p.line || cfg.phrase].concat(p.memories || []); p._m = fresh ? 0 : ((p._m || 0) + 1) % mem.length; phrase.textContent = mem[p._m];
    if (p.arrival && fresh) { arrivalAt = pulseAt; arrivalRing = false; textIn(0); }
    else if (!p.arrival) { arrivalAt = 0; still(label); still(full); still(phrase); }
    if (rx != null) ripples.push({x:rx, y:ry, at:pulseAt});
    Array.prototype.forEach.call(nav.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === p.id)); });
  }
  function ease(k) { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * (3 - 2 * k); }
  people.forEach(function (p) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = p.name; b.dataset.id = p.id; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('pointerup', function (e) { if (e.isPrimary !== false) select(p, p.arrival ? null : innerWidth/2, innerHeight*.47, true); }); nav.appendChild(b);
  });
  current = null; select(people.filter(function (p) { return p.id === (location.hash.slice(1).split('&').filter(function (s) { return s && s.indexOf('=') < 0; })[0] || cfg.startWith); })[0] || people[0]);
  if (/(^|[#&])d=1(&|$)/.test(location.hash) && cfg.dedication && current.arrival) {
    var dd = document.createElement('div'); dd.textContent = cfg.dedication;
    dd.style.cssText = 'position:fixed;left:0;right:0;top:44%;padding:0 24px;text-align:center;font:italic clamp(20px,5.5vw,30px) Georgia,serif;color:#ffeed6;text-shadow:0 0 18px #ffb464;opacity:0;transition:opacity 1.6s ease;pointer-events:none';
    document.body.appendChild(dd); arrivalAt = performance.now() + 4200; textIn(-1);
    setTimeout(function () { dd.style.opacity = '1'; }, 300); setTimeout(function () { dd.style.opacity = '0'; }, 3000); setTimeout(function () { dd.remove(); }, 5000);
    history.replaceState(null, '', location.pathname + location.search);
  }
  function size() { var d = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * d; canvas.height = innerHeight * d; ctx.setTransform(d,0,0,d,0,0); }
  function drawSource(s, i, now, w, h) {
    var x=w*s.x, y=h*s.y, base=Math.min(w,h)*.045, age=sourcePulse&&sourcePulse.name===s.name?now-sourcePulse.at:9999, swell=age<1000?(1-age/1000):0, breathe=.88+.12*Math.sin(now/2200+i), r=base*(1+swell*.16);
    var halo=ctx.createRadialGradient(x,y,0,x,y,r*4.5); halo.addColorStop(0,'rgba(255,249,218,'+(0.7*breathe+0.2*swell)+')'); halo.addColorStop(.18,'rgba(246,223,160,'+(0.28*breathe+0.15*swell)+')'); halo.addColorStop(1,'transparent'); ctx.fillStyle=halo; ctx.fillRect(x-r*5,y-r*5,r*10,r*10);
    ctx.strokeStyle='#F6DFA0'; ctx.shadowColor='#F6DFA0'; ctx.shadowBlur=10+18*swell; ctx.globalAlpha=.7+.25*breathe+.15*swell; ctx.beginPath(); ctx.arc(x,y,r*(1.7+swell*.35),0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#fff9da'; ctx.globalAlpha=.8+.2*breathe+.1*swell; ctx.beginPath(); ctx.arc(x,y,r*(.62+swell*.12),0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; ctx.shadowBlur=0;
  }
  var embers = []; for (var e0=0;e0<46;e0++) embers.push({o:Math.random(), s:.35+Math.random()*.65, a:Math.random()*6.283, d:.6+Math.random()*.9});
  function drawEmbers(x, y, r, now, w, h, grow) {
    ctx.fillStyle=current.color; ctx.shadowColor=current.color; ctx.shadowBlur=10;
    for (var n=0;n<embers.length;n++) { var e=embers[n], k=(now/9000*e.s + e.o) % 1, ex=x+Math.sin(e.a+now/2600*e.d)*r*(.5+k*.9), ey=y+r*1.1-k*(r*2.9+h*.12);
      ctx.globalAlpha=Math.sin(Math.PI*k)*.55*grow; ctx.beginPath(); ctx.arc(ex,ey,.9+e.s*1.3,0,Math.PI*2); ctx.fill(); }
    var hb=(now%1600)/1600, beat=hb<.12?Math.sin(hb/.12*Math.PI):hb>.2&&hb<.3?.6*Math.sin((hb-.2)/.1*Math.PI):0;
    var hg=ctx.createRadialGradient(x,y-r*.1,0,x,y-r*.1,r*.7); hg.addColorStop(0,'rgba(255,236,200,'+(.22+.3*beat)*grow+')'); hg.addColorStop(1,'transparent'); ctx.globalAlpha=1; ctx.fillStyle=hg; ctx.fillRect(x-r,y-r,r*2,r*2);
    if (current.sea) { ctx.lineWidth=1.2; ctx.shadowColor='#7cc4e0'; ctx.shadowBlur=8;
      for (var v=0;v<4;v++) { var wy=y+r*(1.25+v*.16), amp=r*.035*(1+v*.3), span=r*(1.1+v*.45); ctx.strokeStyle='rgba(124,196,224,'+((.42-v*.08)*grow)+')'; ctx.beginPath();
        for (var px=-span;px<=span;px+=4) { var yy=wy+Math.sin(px/(r*.16)+now/900*(1+v*.2)+v)*amp; if(px===-span)ctx.moveTo(x+px,yy); else ctx.lineTo(x+px,yy); } ctx.stroke(); }
      ctx.lineWidth=1; }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
  }
  function sourceAt(px, py, w, h) { var hit=Math.min(w,h)*.12; for(var i=0;i<sources.length;i++){var s=sources[i],dx=px-w*s.x,dy=py-h*s.y;if(dx*dx+dy*dy<hit*hit)return s;} return null; }
  function frame() {
    t += .016; var now = performance.now(), w = innerWidth, h = innerHeight, age = now - pulseAt, kick = age < 900 ? (1 - age / 900) * (0.5 + 0.5 * Math.sin(age / 145)) : 0;
    ctx.clearRect(0,0,w,h);
    for (var z=0;z<sources.length;z++) drawSource(sources[z],z,now,w,h);
    var aa = arrivalAt ? now - arrivalAt : 1e9, grow = arrivalAt ? ease((aa - 1400) / 4200) : 1;
    var x=w/2, y=h*.47, r=Math.min(w,h)*(.18 + kick*.012)*(.55+.45*grow)*(1+.018*Math.sin(now/1300));
    if (current.embers) drawEmbers(x, y, r, now, w, h, grow);
    if (aa >= 0 && aa < 5200) { var bp = aa / 5200, ba = Math.sin(Math.PI * bp) * .5; for (var b=0;b<sources.length;b++) { var sx=w*sources[b].x, sy=h*sources[b].y, lg=ctx.createLinearGradient(sx,sy,x,y); lg.addColorStop(0,'rgba(255,249,218,'+ba+')'); lg.addColorStop(1,'rgba(255,249,218,0)'); ctx.strokeStyle=lg; ctx.lineWidth=2+3*ba; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+(x-sx)*ease(bp*1.6),sy+(y-sy)*ease(bp*1.6)); ctx.stroke(); } ctx.lineWidth=1; }
    if (aa >= 0 && aa < 5600) { var R0=Math.max(w,h)*.62; ctx.fillStyle=current.color; ctx.shadowColor=current.color; ctx.shadowBlur=8; for (var m=0;m<36;m++) { var k=(aa - m*38)/4600; if (k<=0||k>=1) continue; var ang=m*2.399+.6, rad=R0+(r*.35-R0)*ease(k); ctx.globalAlpha=Math.sin(Math.PI*k)*.85; ctx.beginPath(); ctx.arc(x+Math.cos(ang+k*1.2)*rad, y+Math.sin(ang+k*1.2)*rad*1.3, 1.4+(m%3)*.5, 0, Math.PI*2); ctx.fill(); } ctx.shadowBlur=0; }
    if (arrivalAt) textIn(aa);
    if (arrivalAt && !arrivalRing && aa > 5600) { arrivalRing = true; ripples.push({x:x, y:y, at:now}); }
    var g=ctx.createRadialGradient(x,y,0,x,y,r*2.4); g.addColorStop(0,current.color+'cc'); g.addColorStop(.25,current.color+'66'); g.addColorStop(1,'transparent'); ctx.globalAlpha=grow; ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle=current.color; ctx.globalAlpha=(.65 + kick*.3)*grow; ctx.shadowBlur=18 + kick*12; ctx.shadowColor=current.color; ctx.beginPath(); ctx.ellipse(x,y,r*.42,r*.95,0,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(x,y-r*1.05,r*.3,0,Math.PI*2); ctx.stroke();
    if (kick > 0 && grow > .99) { ctx.fillStyle=current.color; ctx.globalAlpha=kick*.7; for (var i=0;i<8;i++) { var a=t*.8+i*.785; ctx.beginPath(); ctx.arc(x+Math.cos(a)*r*(.8+i%3*.12),y+Math.sin(a)*r*(.8+i%3*.12),1.2+kick,0,Math.PI*2); ctx.fill(); } }
    for (var j=ripples.length-1;j>=0;j--) { var q=ripples[j], ra=(now-q.at)/700; if(ra>=1){ripples.splice(j,1);continue} ctx.globalAlpha=(1-ra)*.45; ctx.strokeStyle=current.color; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(q.x,q.y,18+ra*Math.min(w,h)*.14,0,Math.PI*2); ctx.stroke(); }
    ctx.globalAlpha=1; ctx.shadowBlur=0; requestAnimationFrame(frame);
  }
  function touchLight(e) { if (e.isPrimary === false) return; var s=sourceAt(e.clientX,e.clientY,innerWidth,innerHeight); if(s){sourcePulse={name:s.name,at:performance.now()};return} if(arrivalAt&&performance.now()-arrivalAt<ARRIVE){ripples.push({x:e.clientX,y:e.clientY,at:performance.now()});return} select(current,e.clientX,e.clientY); }
  canvas.addEventListener('pointerup', touchLight); addEventListener('resize', size); addEventListener('orientationchange', function () { setTimeout(size, 60); }); size(); frame();
})();
