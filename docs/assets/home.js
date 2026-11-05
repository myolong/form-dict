(function () {
  var q = document.getElementById("q");
  if (!q) return;
  q.addEventListener("input", function () {
    var v = q.value.trim().replace(/\s/g, "");
    document.querySelectorAll("[data-name]").forEach(function (li) {
      li.style.display = !v || li.dataset.name.replace(/\s/g, "").indexOf(v) >= 0 ? "" : "none";
    });
    document.querySelectorAll(".section-block").forEach(function (sec) {
      var any = Array.prototype.some.call(sec.querySelectorAll("[data-name]"), function (li) { return li.style.display !== "none"; });
      sec.style.display = any ? "" : "none";
    });
  });
})();
