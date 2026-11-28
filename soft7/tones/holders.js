/* Holders page: seven forks, no autoplay, motif pulse follows the batch root. */
(function () {
  "use strict";
  var mount = document.querySelector("[data-fork-mount]");
  var visual = document.querySelector("[data-fork-visual]");
  var live = document.querySelector("[data-fork-now]");
  var motif = document.querySelector(".motif");
  var toggle = document.querySelector("[data-sound-toggle]");
  if (!mount || !window.Soft7Forks) return;

  function pulse(tone) {
    if (!motif || !tone) return;
    var ms = Math.round(12000 * (256 / tone.batchRootHz));
    ms = Math.max(4200, Math.min(12000, ms));
    motif.style.setProperty("--fork-ms", ms + "ms");
    motif.classList.add("live");
  }

  function label(tone) {
    return String(tone.tokenId).padStart(3, "0") + " · " + tone.batchName + " · " + tone.label.split(" · ")[0];
  }

  Soft7Forks.onPlay(function (tone, opts) {
    pulse(tone);
    if (visual) visual.textContent = label(tone);
    if (live && opts && opts.count) live.textContent = label(tone);
  });

  if (toggle) {
    toggle.addEventListener("click", function () {
      var on = !Soft7Forks.soundOn();
      Soft7Forks.setSound(on);
      toggle.setAttribute("aria-pressed", on ? "true" : "false");
      toggle.textContent = on ? "Sound on" : "Sound off";
      if (on) Soft7Forks.playHz(256);
    });
  }

  function buttonFor(token, text) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    btn.setAttribute("data-token", String(token.tokenId));
    btn.setAttribute("aria-label", "Play Soft7 77 piece " + String(token.tokenId).padStart(3, "0") + ", " + token.label);
    btn.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      Soft7Forks.playToken(this.getAttribute("data-token"), { count: false });
    });
    btn.addEventListener("click", function () {
      Soft7Forks.playToken(this.getAttribute("data-token"), { count: true });
    });
    return btn;
  }

  Soft7Forks.load().then(function () {
    var i, token, batchMount;
    for (i = 1; i <= 7; i++) {
      token = Soft7Forks.get(i);
      if (token) mount.appendChild(buttonFor(token, String(i).padStart(3, "0")));
    }
    batchMount = document.querySelector("[data-batch-mount]");
    if (!batchMount) return;
    [1, 12, 23, 34, 45, 56, 67].forEach(function (id) {
      token = Soft7Forks.get(id);
      if (token) batchMount.appendChild(buttonFor(token, token.batchName));
    });
  }).catch(function () {
    mount.textContent = "The fork table could not be loaded.";
  });
})();
