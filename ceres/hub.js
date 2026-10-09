(function () {
  var grid = document.getElementById("grid");
  var status = document.getElementById("grid-status");
  var dialog = document.getElementById("viewer");
  var photo = document.getElementById("viewer-img");
  var cap = document.getElementById("viewer-cap");
  var closer = document.getElementById("viewer-close");
  var last = null;

  function pad(n) {
    var s = String(n);
    while (s.length < 3) s = "0" + s;
    return s;
  }

  function openPiece(piece, opener) {
    last = opener;
    photo.src = piece.image;
    photo.width = piece.width || 600;
    photo.height = piece.height || 900;
    photo.alt = "";
    cap.textContent = piece.drop ? piece.name + " · " + piece.drop : piece.name;
    dialog.showModal();
  }

  function render(pieces) {
    var frag = document.createDocumentFragment();
    pieces.forEach(function (piece) {
      var li = document.createElement("li");
      var linked = piece.link && String(piece.link).trim();
      var el = document.createElement(linked ? "a" : "button");
      el.className = "tile" + (piece.drop ? " is-drop" : "");
      el.id = "piece-" + piece.number;
      if (linked) el.href = piece.link;
      else el.type = "button";
      if (!linked) el.setAttribute("aria-haspopup", "dialog");

      var frame = document.createElement("span");
      frame.className = "frame";
      if (piece.image) {
        var img = document.createElement("img");
        img.src = piece.image;
        img.alt = "";
        img.width = piece.width || 600;
        img.height = piece.height || 900;
        img.decoding = "async";
        img.loading = piece.number < 8 ? "eager" : "lazy";
        frame.appendChild(img);
      }

      var num = document.createElement("span");
      num.className = "num";
      num.textContent = pad(piece.number);
      var name = document.createElement("span");
      name.className = "name";
      name.textContent = piece.name;
      el.appendChild(frame);
      el.appendChild(num);
      el.appendChild(name);
      if (piece.drop) {
        var drop = document.createElement("span");
        drop.className = "drop";
        drop.textContent = piece.drop;
        el.appendChild(drop);
      }
      if (!linked) {
        el.addEventListener("click", function () { openPiece(piece, el); });
      }
      li.appendChild(el);
      frag.appendChild(li);
    });
    grid.replaceChildren(frag);
    grid.setAttribute("aria-busy", "false");
  }

  grid.setAttribute("aria-busy", "true");
  fetch("pieces.json")
    .then(function (res) {
      if (!res.ok) throw new Error("list");
      return res.json();
    })
    .then(render)
    .catch(function () {
      grid.setAttribute("aria-busy", "false");
      if (status) status.textContent = "The piece list could not be loaded.";
    });

  closer.addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (ev) {
    var rect = dialog.getBoundingClientRect();
    var inside = ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
  dialog.addEventListener("close", function () {
    photo.removeAttribute("src");
    if (last) last.focus();
  });
})();
