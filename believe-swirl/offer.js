// Believe Swirl: "Get your own Swirl" offer. No checkout, no network calls, no tracking.
(function () {
  var own = document.getElementById("own");
  var box = document.getElementById("offer");
  if (!own || !box) return;
  var note = document.getElementById("offer-note");
  var URL_ = "https://tigerwillca.github.io/believe-swirl/";
  function say(t) { note.textContent = t; }
  function open() { box.hidden = false; say(""); document.getElementById("offer-gift").focus(); }
  function close() { box.hidden = true; own.focus(); }
  own.addEventListener("click", function (e) { e.stopPropagation(); open(); });
  box.addEventListener("click", function (e) { e.stopPropagation(); if (e.target === box) close(); });
  document.getElementById("offer-close").addEventListener("click", function (e) { e.stopPropagation(); close(); });
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    e.stopPropagation();
    if (e.key === "Escape") close();
  }, true);
  document.getElementById("offer-soon").addEventListener("click", function (e) {
    e.stopPropagation();
    say("Thank you. It isn\u2019t ready yet. Keep this one, and check back here.");
  });
  document.getElementById("offer-gift").addEventListener("click", function (e) {
    e.stopPropagation();
    var data = { title: "Believe Swirl", text: "A minute of warm light, and one kind line for today. I thought of you.", url: URL_ };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data.text + " " + URL_).then(function () { say("Link copied. Send it to someone you love."); },
        function () { say(URL_); });
    } else { say(URL_); }
  });
})();
