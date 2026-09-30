(function () {
  'use strict';
  var css = [
    '.hz{position:fixed;left:1rem;bottom:1rem;z-index:10;display:inline-flex;align-items:center;gap:.55rem;padding:.42rem .7rem;background:rgba(7,5,15,.6);border:1px solid rgba(230,184,92,.24);border-radius:999px;color:#E6B85C;font:.72rem ui-monospace,Menlo,monospace;letter-spacing:.04em;cursor:pointer;opacity:.9;text-shadow:0 1px 8px rgba(7,5,15,.9);touch-action:manipulation}',
    '.hz i{width:8px;height:8px;flex:none;border-radius:50%;background:#ff7a2a;box-shadow:0 0 10px #ff7a2a;animation:hzp 1.09s ease-in-out infinite}',
    '.hz.on{color:#F6DFA0}.hz.on i{box-shadow:0 0 14px #ffb070,0 0 30px rgba(204,255,0,.45)}',
    '.hz:focus-visible{outline:1px solid rgba(230,184,92,.6);outline-offset:4px}',
    '@keyframes hzp{0%,100%{transform:scale(.7);opacity:.5}50%{transform:scale(1.25);opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.hz i{animation:none}}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  var b = document.createElement('button');
  b.className = 'hz';
  b.type = 'button';
  b.setAttribute('aria-pressed', 'false');
  b.title = 'Tap to hear the ember tone';
  var dot = document.createElement('i');
  dot.setAttribute('aria-hidden', 'true');
  b.appendChild(dot);
  b.appendChild(document.createTextNode('55 Hz · the thread to signal'));
  document.body.appendChild(b);
  var ac, g, on = false;
  b.addEventListener('click', function () {
    try {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        g = ac.createGain();
        g.gain.value = 0;
        g.connect(ac.destination);
        [[55, .5], [110, .3], [165, .14]].forEach(function (p) {
          var o = ac.createOscillator(), v = ac.createGain();
          o.type = 'sine';
          o.frequency.value = p[0];
          v.gain.value = p[1];
          o.connect(v);
          v.connect(g);
          o.start();
        });
      }
      if (ac.state === 'suspended') ac.resume();
      on = !on;
      var t = ac.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(on ? .06 : 0, t + (on ? 1.5 : .8));
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    } catch (e) {}
  });
})();
