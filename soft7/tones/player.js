/* Soft7 Fork player. Resynthesizes tones.json. Never plays until a gesture opts in. */
(function (global) {
  "use strict";
  var table = null;
  var byId = {};
  var ac = null;
  var soundOn = false;
  var listeners = [];

  function url() {
    var nodes = document.getElementsByTagName("script");
    var i, src;
    for (i = 0; i < nodes.length; i++) {
      src = nodes[i].getAttribute("src") || "";
      if (src.indexOf("tones/player.js") !== -1) return src.replace("player.js", "tones.json");
    }
    return "tones/tones.json";
  }

  function load() {
    if (table) return Promise.resolve(table);
    return fetch(url()).then(function (res) {
      if (!res.ok) throw new Error("tones");
      return res.json();
    }).then(function (data) {
      table = data;
      (data.tones || []).forEach(function (tone) { byId[tone.tokenId] = tone; });
      return data;
    });
  }

  function ctx() {
    var Ctx = global.AudioContext || global.webkitAudioContext;
    if (!Ctx) return null;
    if (!ac) ac = new Ctx();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function playHz(hz) {
    if (!soundOn) return;
    var audio = ctx();
    if (!audio) return;
    var now = audio.currentTime;
    var master = audio.createGain();
    master.connect(audio.destination);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.05, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    var o = audio.createOscillator();
    o.type = "sine";
    o.frequency.value = hz;
    o.connect(master);
    o.start(now);
    o.stop(now + 0.66);
    if (hz * 2 < 6000) {
      var over = audio.createOscillator();
      var g = audio.createGain();
      over.type = "sine";
      over.frequency.value = hz * 2;
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      over.connect(g);
      g.connect(master);
      over.start(now);
      over.stop(now + 0.2);
    }
  }

  function playToken(id, opts) {
    var tone = byId[Number(id)];
    if (!tone) return null;
    playHz(tone.hz);
    listeners.forEach(function (fn) { fn(tone, opts || {}); });
    return tone;
  }

  function setSound(on) {
    soundOn = !!on;
    if (soundOn) ctx();
    return soundOn;
  }

  global.Soft7Forks = {
    load: load,
    playToken: playToken,
    playHz: playHz,
    setSound: setSound,
    soundOn: function () { return soundOn; },
    get: function (id) { return byId[Number(id)]; },
    onPlay: function (fn) { listeners.push(fn); }
  };
})(window);
