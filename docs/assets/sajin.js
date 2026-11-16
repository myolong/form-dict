/* 영수증·사진 A4 붙이기 (사진은 이 브라우저 안에서만 처리, 저장하지 않음) */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var MAX = 2000;            // 긴 변 최대 픽셀 (인쇄에 충분, 메모리 절약)
  var items = [];            // {src, w, h, cap}
  var GRID = { 1: [1, 1], 2: [1, 2], 3: [3, 1], 4: [2, 2], 6: [2, 3], 8: [2, 4], 9: [3, 3] };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function err(msg) { var e = $("sj-error"); e.textContent = msg; e.hidden = !msg; }

  function load(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ src: c.toDataURL("image/jpeg", 0.88), w: c.width, h: c.height, cap: file.name.replace(/\.[^.]+$/, "") });
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  function addFiles(list) {
    var files = Array.prototype.filter.call(list, function (f) { return /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp|gif|bmp)$/i.test(f.name); });
    if (!files.length) return err("사진 파일(JPG·PNG·WEBP)을 골라 주세요.");
    err(""); $("sj-count").textContent = "사진을 여는 중…";
    files.sort(function (a, b) { return a.name.localeCompare(b.name, "ko", { numeric: true }); });
    var bad = 0, chain = Promise.resolve();
    files.forEach(function (f) { chain = chain.then(function () { return load(f).then(function (it) { if (it) items.push(it); else bad++; }); }); });
    chain.then(function () {
      if (bad) err(bad + "장은 열지 못했어요. 아이폰 사진(HEIC)이면 JPG로 바꿔서 넣어 주세요.");
      draw();
    });
  }
  function rotate(i) {
    var it = items[i], img = new Image();
    img.onload = function () {
      var c = document.createElement("canvas"); c.width = img.height; c.height = img.width;
      var g = c.getContext("2d"); g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(img, 0, 0);
      it.src = c.toDataURL("image/jpeg", 0.9); it.w = c.width; it.h = c.height; draw();
    };
    img.src = it.src;
  }

  function drawList() {
    $("sj-list").innerHTML = items.map(function (it, i) {
      return '<div class="sj-item"><img src="' + it.src + '" alt=""><div class="sj-ctl"><input type="text" data-cap="' + i + '" value="' + esc(it.cap) + '" aria-label="' + (i + 1) + '번 설명">' +
        '<div><button type="button" data-act="up" data-i="' + i + '" title="앞으로">↑</button><button type="button" data-act="down" data-i="' + i + '" title="뒤로">↓</button><button type="button" data-act="rot" data-i="' + i + '" title="돌리기">⟳</button><button type="button" data-act="del" data-i="' + i + '" title="빼기" class="del">✕</button></div></div></div>';
    }).join("");
    $("sj-count").textContent = items.length ? "사진 " + items.length + "장 · A4 " + Math.ceil(items.length / +$("sj-per").value) + "장" : "";
    $("sj-print").disabled = !items.length;
  }
  function drawPages() {
    var per = +$("sj-per").value, g = GRID[per], cap = $("sj-cap").checked, num = $("sj-num").checked;
    var title = $("sj-title").value.trim(), sub = $("sj-sub").value.trim();
    var pages = Math.max(1, Math.ceil(items.length / per)), html = "";
    for (var p = 0; p < pages; p++) {
      var cells = "";
      for (var j = 0; j < per; j++) {
        var i = p * per + j, it = items[i];
        cells += '<figure class="sj-cell">' + (it ? '<div class="sj-img"><img src="' + it.src + '" alt=""></div>' + (cap || num ? '<figcaption>' + (num ? "<b>" + (i + 1) + "</b> " : "") + (cap ? esc(it.cap) : "") + "</figcaption>" : "") : "") + "</figure>";
      }
      html += '<div class="paper sj-paper' + ($("sj-border").checked ? " bordered" : "") + '">' +
        (title || sub ? '<header>' + (title ? "<h1>" + esc(title) + "</h1>" : "") + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</header>" : "") +
        '<div class="sj-grid" style="grid-template-columns:repeat(' + g[0] + ',1fr);grid-template-rows:repeat(' + g[1] + ',minmax(0,1fr))">' + cells + "</div>" +
        (pages > 1 ? '<footer>' + (p + 1) + " / " + pages + "</footer>" : "") + "</div>";
    }
    $("sj-pages").innerHTML = items.length ? html : '<div class="paper sj-paper sj-empty"><p>왼쪽에서 사진을 고르면<br>여기에 A4로 배치돼요.</p></div>';
    fit();
  }
  function draw() { drawList(); drawPages(); }
  function fit() {
    var wrap = $("sj-preview"), sc = $("sj-scale"), first = $("sj-pages").firstElementChild; if (!first) return;
    var k = Math.min(1, (wrap.clientWidth - 32) / first.offsetWidth);
    sc.style.transform = "scale(" + k + ")"; sc.style.width = first.offsetWidth + "px";
    wrap.style.height = (sc.scrollHeight * k + 32) + "px";
  }

  var input = $("sj-file"), drop = $("sj-drop");
  input.addEventListener("change", function () { addFiles(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { addFiles(e.dataTransfer.files); });
  $("sj-list").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var i = +b.dataset.i, a = b.dataset.act;
    if (a === "up" && i > 0) items.splice(i - 1, 0, items.splice(i, 1)[0]);
    else if (a === "down" && i < items.length - 1) items.splice(i + 1, 0, items.splice(i, 1)[0]);
    else if (a === "del") items.splice(i, 1);
    else if (a === "rot") return rotate(i);
    draw();
  });
  $("sj-list").addEventListener("input", function (e) { if (e.target.dataset.cap) { items[+e.target.dataset.cap].cap = e.target.value; drawPages(); } });
  ["sj-per", "sj-cap", "sj-border", "sj-num"].forEach(function (id) { $(id).addEventListener("change", draw); });
  ["sj-title", "sj-sub"].forEach(function (id) { $(id).addEventListener("input", drawPages); });
  $("sj-print").addEventListener("click", function () { window.print(); });
  $("sj-clear").addEventListener("click", function () { items = []; err(""); draw(); });
  window.addEventListener("resize", fit);
  draw();
})();
