/* 양식 작성기: window.FORM(설정)을 읽어 입력 칸을 만들고 A4 미리보기에 반영한다.
   입력 내용은 서버로 보내지 않고 이 브라우저(localStorage)에만 저장한다. */
(function () {
  var F = window.FORM;
  if (!F) return;
  var KEY = "formdict:" + F.slug;
  var panel = document.getElementById("form-fields");
  var paper = document.getElementById("paper");
  var wrap = document.getElementById("preview-wrap");
  var scaler = document.getElementById("preview-scale");
  var savedNote = document.getElementById("saved-note");
  var blankMode = false;
  var state = {};

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  function won(n) { return Math.round(n).toLocaleString("ko-KR"); }

  /* 금액 한글 표기: 1200000 → 일백이십만 */
  function korMoney(n) {
    n = Math.floor(Math.abs(num(n)));
    if (!n) return "영";
    var d = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    var small = ["", "십", "백", "천"];
    var big = ["", "만", "억", "조", "경"];
    var out = "", g = 0;
    while (n > 0) {
      var chunk = n % 10000, part = "";
      for (var i = 0; i < 4; i++) {
        var digit = Math.floor(chunk / Math.pow(10, i)) % 10;
        if (digit) part = d[digit] + small[i] + part;
      }
      if (part) out = part + big[g] + out;
      n = Math.floor(n / 10000);
      g++;
    }
    return out;
  }
  window.korMoney = korMoney;

  function fmtDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return "";
    return m[1] + "년 " + parseInt(m[2], 10) + "월 " + parseInt(m[3], 10) + "일";
  }
  function addMonths(v, k) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    var y = +m[1], mo = +m[2] - 1 + k, day = +m[3];
    var dt = new Date(y, mo, 1);
    var last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(day, last));
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }

  /* ── 계산 값 ── */
  function items() {
    var list = state.items || [];
    return list.filter(function (r) { return r && (r.name || r.qty || r.price); });
  }
  function totals() {
    var supply = 0;
    items().forEach(function (r) { supply += num(r.qty || 1) * num(r.price); });
    var mode = state.vat_mode || F.vat_default || "별도";
    var vat = 0, total = supply;
    if (mode === "별도") { vat = Math.round(supply * 0.1); total = supply + vat; }
    else if (mode === "포함") { total = supply; supply = Math.round(total / 1.1); vat = total - supply; }
    return { supply: supply, vat: vat, total: total, mode: mode };
  }
  function itemsRows() {
    var minRows = F.min_rows || 8, rows = blankMode ? [] : items(), html = "";
    var mode = state.vat_mode || F.vat_default || "별도";
    rows.forEach(function (r, i) {
      var qty = num(r.qty || 1), price = num(r.price), amt = qty * price;
      var supply = mode === "포함" ? Math.round(amt / 1.1) : amt;
      var vat = mode === "별도" ? Math.round(amt * 0.1) : mode === "포함" ? amt - supply : 0;
      if (F.simple_items) {
        html += "<tr><td class='c'>" + (i + 1) + "</td><td>" + esc(r.name) + (r.spec ? " (" + esc(r.spec) + ")" : "") + "</td><td class='num'>" + (r.qty || r.price ? won(qty) : "") +
          "</td><td class='num'>" + (price ? won(price) : "") + "</td><td class='num'>" + (amt ? won(amt) : "") + "</td></tr>";
        return;
      }
      html += "<tr><td class='c'>" + (i + 1) + "</td><td>" + esc(r.name) + "</td><td class='c'>" + esc(r.spec || "") +
        "</td><td class='num'>" + (r.qty || r.price ? won(qty) : "") + "</td><td class='num'>" + (price ? won(price) : "") +
        "</td><td class='num'>" + (amt ? won(supply) : "") + "</td><td class='num'>" + (amt && mode !== "없음" ? won(vat) : "") + "</td></tr>";
    });
    var empty = F.simple_items ? "<tr><td class='c'>&nbsp;</td><td></td><td></td><td></td><td></td></tr>" : "<tr><td class='c'>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
    for (var j = rows.length; j < minRows; j++) html += empty;
    return html;
  }
  function approvalBox() {
    var labels = String(state.approval || F.approval_default || "담당,팀장,대표").split(/[,·\s]+/).filter(Boolean).slice(0, 6);
    var h = "<div class='approval'><table><tr><th rowspan='2'>결재</th>";
    labels.forEach(function (l) { h += "<td>" + esc(l) + "</td>"; });
    h += "</tr><tr>";
    labels.forEach(function () { h += "<td></td>"; });
    return h + "</tr></table></div>";
  }
  function schedule() {
    var P = num(state.principal), rate = num(state.rate) / 100;
    var method = state.repay_method || "만기 일시상환";
    var n = Math.max(1, Math.min(120, Math.round(num(state.months) || 1)));
    var start = state.first_due || state.due_date;
    if (blankMode || !P) return "";
    var rows = "", remain = P, totalInt = 0;
    if (method === "만기 일시상환") return "";
    var base = Math.floor(P / n);
    for (var i = 0; i < n; i++) {
      var pay = i === n - 1 ? remain : base;
      var interest = Math.round(remain * rate / 12);
      totalInt += interest;
      var due = addMonths(start, i);
      rows += "<tr><td class='c'>" + (i + 1) + "</td><td class='c'>" + (due ? due.replace(/-/g, ".") : "") + "</td><td class='num'>" + won(pay) +
        "</td><td class='num'>" + won(interest) + "</td><td class='num'>" + won(pay + interest) + "</td><td class='num'>" + won(remain - pay) + "</td></tr>";
      remain -= pay;
    }
    return "<div class='page-break'></div><p style='margin:0 0 2mm;font-weight:700'>[별지] 상환 일정표 (원금 균등 분할" + (rate ? ", 이자는 남은 원금 기준 월할 계산" : "") + ")</p>" +
      "<table class='items'><tr><th class='c'>회차</th><th class='c'>상환일</th><th class='c'>원금</th><th class='c'>이자</th><th class='c'>합계</th><th class='c'>남은 원금</th></tr>" +
      rows + "</table>";
  }

  /* ── 템플릿 채우기 ── */
  function value(key, filter) {
    var raw;
    var t = totals();
    if (key === "sum_supply") raw = blankMode ? "" : t.supply || "";
    else if (key === "sum_vat") raw = blankMode ? "" : (t.mode === "없음" ? "" : t.vat || "");
    else if (key === "sum_total") raw = blankMode ? "" : t.total || "";
    else if (key === "items_rows") return itemsRows();
    else if (key === "approval_box") return approvalBox();
    else if (key === "schedule") return schedule();
    else if (key === "vat_label") return t.mode === "포함" ? "(부가세 포함)" : t.mode === "없음" ? "" : "(부가세 포함)";
    else raw = blankMode ? "" : state[key];
    if (raw === undefined || raw === null) raw = "";
    if (filter === "raw") return esc(raw);
    if (raw === "" || raw === 0) {
      if (filter === "date") return "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;년 &nbsp;&nbsp;&nbsp;&nbsp;월 &nbsp;&nbsp;&nbsp;&nbsp;일";
      if (filter === "kor") return "<span class='blank' style='min-width:50mm'></span>";
      if (filter === "nl") return "";
      return "<span class='blank'></span>";
    }
    if (filter === "date") return esc(fmtDate(raw) || raw);
    if (filter === "won") return esc(won(num(raw)));
    if (filter === "kor") return esc(korMoney(raw));
    return esc(raw);
  }
  function render() {
    state.__split = state.repay_method === "매월 분할상환" ? "1" : "";
    state.__norate = state.rate !== undefined && state.rate !== "" && num(state.rate) === 0 ? "1" : "";
    state.__nolate = state.late_rate ? "" : "1";
    state.__minor = state.minor === "예" ? "1" : "";
    state.__fixed = /^기간의 정함이 있음/.test(state.contract_type || "") ? "1" : "";
    state.__noclaim = state.no_claim === "넣기" ? "1" : "";
    var annual = state.wage_type === "연봉" ? num(state.wage) : 0;
    state.__monthly = annual ? (annual % 12 ? "약 " : "") + won(Math.floor(annual / 12)) : "";
    var html = F.template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function (_, k, inner) {
      return !blankMode && state[k] ? inner : "";
    }).replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function (_, k, inner) {
      return blankMode || !state[k] ? inner : "";
    }).replace(/\{\{(\w+)(?:\|(\w+))?\}\}/g, function (_, k, f) { return value(k, f); });
    paper.innerHTML = html;
    fill();
    fit();
  }
  /* 내용이 적어도 A4 한 장이 알맞게 차도록: 빈 품목 줄 추가 → 남는 높이를 data-grow 칸에 나눠 줌 */
  var PAGE_PX = 293 * 96 / 25.4; /* 인쇄 시 2장으로 넘어가지 않도록 297mm보다 조금 작게 */
  function contentH() {
    var m = paper.style.minHeight; paper.style.minHeight = "0";
    var h = paper.offsetHeight; paper.style.minHeight = m; return h;
  }
  function fill() {
    var tbl = paper.querySelector("table[data-fill-rows]");
    if (tbl && tbl.rows.length > 2) {
      var cols = 0, head = tbl.rows[0].cells;
      for (var i = 0; i < head.length; i++) cols += head[i].colSpan;
      var last = tbl.rows[tbl.rows.length - 1], n = tbl.rows.length - 1;
      for (var g = 0; g < 40; g++) {
        var tr = document.createElement("tr");
        for (var c = 0; c < cols; c++) { var td = document.createElement("td"); td.innerHTML = c === 0 ? "" : "&nbsp;"; if (c === 0) td.className = "c"; tr.appendChild(td); }
        last.parentNode.insertBefore(tr, last);
        if (contentH() > PAGE_PX) { tr.parentNode.removeChild(tr); break; }
      }
    }
    var grows = paper.querySelectorAll("[data-grow]");
    if (!grows.length) return;
    var left = PAGE_PX - contentH();
    if (left <= 4) return;
    var total = 0, base = [];
    for (var j = 0; j < grows.length; j++) { total += +grows[j].getAttribute("data-grow") || 1; base.push(grows[j].offsetHeight); }
    for (var k = 0; k < grows.length; k++) {
      var el = grows[k], add = Math.floor(left * (+el.getAttribute("data-grow") || 1) / total);
      if (/^T[DH]$/.test(el.tagName)) el.style.height = (base[k] + add) + "px";
      else if (el.children.length || el.textContent.trim() || el.className) el.style.minHeight = (base[k] + add) + "px";
      else el.style.height = add + "px";
    }
    /* 여백 겹침(margin collapse) 등으로 넘치면 마지막 칸에서 넘친 만큼 줄임 */
    var over = contentH() - PAGE_PX;
    if (over > 0) {
      var e2 = grows[grows.length - 1], prop = e2.style.minHeight ? "minHeight" : "height";
      e2.style[prop] = Math.max(0, parseFloat(e2.style[prop]) - over - 1) + "px";
    }
  }
  function fit() {
    var avail = wrap.clientWidth - parseFloat(getComputedStyle(wrap).paddingLeft) * 2;
    var w = paper.offsetWidth;
    var s = Math.min(1, avail / w);
    scaler.style.transform = "scale(" + s + ")";
    scaler.style.height = paper.offsetHeight * s + "px";
    scaler.style.width = w * s + "px";
  }

  /* ── 입력 칸 만들기 ── */
  /* 숫자만 입력해도 점·하이픈 자동: 생년월일 1995.03.15 / 사업자번호 000-00-00000 / 전화 010-0000-0000 */
  function fmtKind(f) {
    if (f.format) return f.format;
    if (/birth$/.test(f.key)) return "birth";
    if (/biz_?no$/.test(f.key)) return "bizno";
    if (/(phone|tel)$/.test(f.key)) return "phone";
    return "";
  }
  function autoFormat(kind, v) {
    var d = v.replace(/[^0-9]/g, "");
    if (kind === "birth") {
      d = d.slice(0, 8);
      if (d.length <= 4) return d;
      if (d.length <= 6) return d.slice(0, 4) + "." + d.slice(4);
      return d.slice(0, 4) + "." + d.slice(4, 6) + "." + d.slice(6);
    }
    if (kind === "rrn") {
      d = d.slice(0, 13);
      return d.length <= 6 ? d : d.slice(0, 6) + "-" + d.slice(6);
    }
    if (kind === "bizno") {
      d = d.slice(0, 10);
      if (d.length <= 3) return d;
      if (d.length <= 5) return d.slice(0, 3) + "-" + d.slice(3);
      return d.slice(0, 3) + "-" + d.slice(3, 5) + "-" + d.slice(5);
    }
    if (kind === "phone") {
      d = d.slice(0, 11);
      if (/^02/.test(d)) {
        if (d.length <= 2) return d;
        if (d.length <= 5) return d.slice(0, 2) + "-" + d.slice(2);
        if (d.length <= 9) return d.slice(0, 2) + "-" + d.slice(2, d.length - 4) + "-" + d.slice(-4);
        return d.slice(0, 2) + "-" + d.slice(2, 6) + "-" + d.slice(6, 10);
      }
      if (/^1[5-9]/.test(d) && d.length <= 8) return d.length <= 4 ? d : d.slice(0, 4) + "-" + d.slice(4);
      if (d.length <= 3) return d;
      if (d.length <= 6) return d.slice(0, 3) + "-" + d.slice(3);
      if (d.length <= 10) return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
      return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
    }
    return v;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); savedNote.textContent = "입력 내용은 이 브라우저에만 임시 저장됩니다."; } catch (e) {}
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) state = s; } catch (e) {}
  }
  var DEFAULTS_VERSION = 3; /* 기본값(예시 문구)을 새로 넣으면 올린다: 예전 입력 기록이 있어도 빈 칸에 한 번 채워짐 */
  function defaults() {
    var refill = (state.__dv || 0) < DEFAULTS_VERSION;
    (F.fields || []).forEach(function (f) {
      if ((state[f.key] === undefined || (refill && state[f.key] === "")) && f.default !== undefined) {
        state[f.key] = f.default === "today" ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10) : f.default;
      }
    });
    state.__dv = DEFAULTS_VERSION;
    if (F.has_items && !state.items) state.items = [{ name: "", spec: "", qty: "", price: "" }];
  }
  function itemsEditor() {
    var box = document.createElement("div");
    box.className = "items-editor";
    function draw() {
      box.innerHTML = "<div class='row head'><span>품목 / 규격</span><span>수량</span><span>단가(원)</span><span></span></div>";
      state.items.forEach(function (r, i) {
        var row = document.createElement("div");
        row.className = "row";
        row.innerHTML = "<input placeholder='품목명' aria-label='품목명' data-k='name'><input inputmode='numeric' placeholder='1' aria-label='수량' data-k='qty'>" +
          "<input inputmode='numeric' placeholder='0' aria-label='단가' data-k='price'><button type='button' class='del' aria-label='줄 삭제'>×</button>" +
          "<input class='spec' placeholder='규격·단위 (선택)' aria-label='규격' data-k='spec'>";
        row.querySelectorAll("input").forEach(function (inp) {
          inp.value = r[inp.dataset.k] || "";
          inp.addEventListener("input", function () { r[inp.dataset.k] = inp.value; save(); render(); });
        });
        row.querySelector(".del").addEventListener("click", function () {
          state.items.splice(i, 1);
          if (!state.items.length) state.items.push({ name: "", spec: "", qty: "", price: "" });
          save(); draw(); render();
        });
        box.appendChild(row);
      });
      var add = document.createElement("button");
      add.type = "button"; add.className = "btn small"; add.textContent = "+ 품목 추가";
      add.addEventListener("click", function () { state.items.push({ name: "", spec: "", qty: "", price: "" }); save(); draw(); render(); });
      box.appendChild(add);
    }
    draw();
    return box;
  }
  /* 여러 줄 목록 칸 — 엔터를 치면 다음 줄 앞에 표시를 자동으로 붙인다.
     "bullet": "●" 이면 글머리표, "numbered": true 이면 1. 2. 3. 번호.
     한글 입력 중 엔터도 놓치지 않도록 줄바꿈이 들어간 '뒤'(input 이벤트)에 처리한다. */
  function listMarker(f) { return f.bullet ? { bullet: f.bullet } : f.numbered ? { bullet: null } : null; }
  function listify(ta, mk) {
    var B = mk.bullet;
    var isMark = B ? function (l) { return l.indexOf(B + " ") === 0 || l === B; }
                   : function (l) { return /^\s*\d+\.(\s|$)/.test(l); };
    var first = B ? B + " " : "1. ";
    function renumber(text) {
      if (B) return text;
      var n = 0;
      return text.split("\n").map(function (line) {
        var m = line.match(/^\s*\d+\.\s?(.*)$/);
        if (!m) return line;
        n += 1; return n + ". " + m[1];
      }).join("\n");
    }
    function emptyMark(l) { return B ? l.trim() === B : /^\s*\d+\.\s*$/.test(l); }
    ta.addEventListener("focus", function () {
      if (!ta.value) { ta.value = first; ta.setSelectionRange(first.length, first.length); ta.dispatchEvent(new Event("input")); }
    });
    ta.addEventListener("blur", function () {
      if (emptyMark(ta.value)) { ta.value = ""; ta.dispatchEvent(new Event("input")); }
    });
    ta.addEventListener("input", function (e) {
      if (!e.inputType || (e.inputType !== "insertLineBreak" && e.inputType !== "insertParagraph")) return;
      var pos = ta.selectionStart, v = ta.value;
      var before = v.slice(0, pos), after = v.slice(pos);
      var prevLine = before.slice(0, -1).split("\n").pop();
      if (emptyMark(prevLine)) {                        // 빈 표시 줄에서 엔터 → 목록 끝내기
        before = before.slice(0, before.length - 1 - prevLine.length);
        ta.value = renumber(before + after);
        ta.setSelectionRange(before.length, before.length);
        return;
      }
      if (!isMark(prevLine)) return;                    // 표시 없는 줄에서는 그냥 줄바꿈
      var ins = B ? B + " " : "0. ";
      var head = renumber(before + ins);
      ta.value = renumber(before + ins + after);
      ta.setSelectionRange(head.length, head.length);
    }, true);
  }
  /* show_if: {"key":..., "eq":...} 조건이 맞을 때만 칸을 보여 준다 */
  function updateVisibility() {
    panel.querySelectorAll("[data-show-key]").forEach(function (el) {
      var on = (state[el.dataset.showKey] || "") === el.dataset.showEq;
      el.hidden = !on;
    });
  }
  function build() {
    panel.innerHTML = "";
    (F.fields || []).forEach(function (f) {
      if (f.type === "group") {
        var g = document.createElement("div"); g.className = "group-title"; g.textContent = f.label; panel.appendChild(g); return;
      }
      if (f.type === "items") {
        var t = document.createElement("div"); t.className = "field";
        t.innerHTML = "<label>" + esc(f.label) + "</label>"; t.appendChild(itemsEditor()); panel.appendChild(t); return;
      }
      var wrapF = document.createElement("div"); wrapF.className = "field";
      var id = "f-" + f.key;
      var input;
      if (f.type === "textarea") input = document.createElement("textarea");
      else if (f.type === "select") {
        input = document.createElement("select");
        f.options.forEach(function (o) { var op = document.createElement("option"); op.value = o; op.textContent = o; input.appendChild(op); });
        if (!state[f.key]) state[f.key] = f.default || (f.key === "vat_mode" && F.vat_default) || f.options[0];
      } else {
        input = document.createElement("input");
        input.type = f.type === "date" ? "date" : "text";
        if (f.type === "money" || f.type === "number") input.inputMode = "decimal";
        if (fmtKind(f)) { input.inputMode = "numeric"; if (!f.placeholder) f.placeholder = { birth: "숫자만 입력 (예: 19950315)", bizno: "숫자만 입력 (10자리)", rrn: "숫자만 입력 (13자리)", phone: "숫자만 입력 (예: 01012345678)" }[fmtKind(f)]; }
      }
      input.id = id;
      if (f.placeholder) input.placeholder = f.placeholder;
      input.value = state[f.key] == null ? "" : state[f.key];
      if (f.type === "money" && input.value) input.value = won(num(input.value));
      if (listMarker(f)) listify(input, listMarker(f));
      input.addEventListener("input", function () {
        if (f.type === "money") {
          var digits = input.value.replace(/[^0-9]/g, "");
          state[f.key] = digits;
          input.value = digits ? won(+digits) : "";
        } else if (fmtKind(f)) {
          var nv = autoFormat(fmtKind(f), input.value);
          if (nv !== input.value) input.value = nv;
          state[f.key] = nv;
        } else state[f.key] = input.value;
        save(); render(); updateVisibility();
      });
      wrapF.innerHTML = "<label for='" + id + "'>" + esc(f.label) + "</label>";
      if (f.show_if) { wrapF.dataset.showKey = f.show_if.key; wrapF.dataset.showEq = f.show_if.eq; }
      wrapF.appendChild(input);
      if (f.hint) { var h = document.createElement("div"); h.className = "hint"; h.textContent = f.hint; wrapF.appendChild(h); }
      if (f.type === "money") {
        var k = document.createElement("div"); k.className = "hint";
        var upd = function () { k.textContent = state[f.key] ? "일금 " + korMoney(state[f.key]) + "원정" : ""; };
        input.addEventListener("input", upd); upd(); wrapF.appendChild(k);
      }
      panel.appendChild(wrapF);
    });
    updateVisibility();
  }

  document.getElementById("btn-print").addEventListener("click", function () { blankMode = false; render(); window.print(); });
  var bp = document.getElementById("btn-blank");
  if (bp) bp.addEventListener("click", function () { blankMode = true; render(); window.print(); blankMode = false; setTimeout(render, 300); });
  var bc = document.getElementById("btn-clear");
  if (bc) bc.addEventListener("click", function () {
    if (!confirm("입력한 내용을 모두 지울까요?")) return;
    state = {}; try { localStorage.removeItem(KEY); } catch (e) {}
    defaults(); build(); render();
  });
  window.addEventListener("afterprint", function () { if (blankMode) { blankMode = false; render(); } });
  window.addEventListener("resize", fit);

  load(); defaults(); build(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
