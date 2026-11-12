/* 카드·통장 내역 엑셀 → 가계부 정리 (모든 처리는 이 브라우저 안에서만) */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var LS_MAP = "formdict:gagyebu:map";      // 사용처 → 분류 (사용자가 고친 것만)
  var MAX_ROWS = 20000;

  var CATS = ["식비", "카페·간식", "장보기", "교통·차량", "쇼핑", "주거·공과금", "통신·구독", "의료·건강", "문화·여가", "교육", "경조사·선물", "기타", "수입", "이체·제외"];
  var CAT_COLOR = {"식비":"#e8590c","카페·간식":"#f08c00","장보기":"#2f9e44","교통·차량":"#1971c2","쇼핑":"#c2255c","주거·공과금":"#5f3dc4","통신·구독":"#0c8599","의료·건강":"#e03131","문화·여가":"#9c36b5","교육":"#3b5bdb","경조사·선물":"#a61e4d","기타":"#868e96","수입":"#2b8a3e","이체·제외":"#adb5bd"};
  // 앞쪽 규칙이 먼저 맞음 (예: 쿠팡이츠 → 식비가 쿠팡 → 쇼핑보다 앞)
  var RULES = [
    ["이체·제외", "카드대금|카드결제|결제대금|카드 대금|신용카드|본인이체|내계좌|적금|청약|이자 ?납입|대출상환"],
    ["식비", "쿠팡이츠|배달의민족|배민|요기요|땡겨요|식당|김밥|치킨|피자|맥도날드|버거킹|롯데리아|맘스터치|서브웨이|본죽|한솥|국밥|분식|떡볶이|고기|갈비|삼겹|횟집|초밥|스시|반점|중국집|짬뽕|마라|쌀국수|돈까스|돈가스|냉면|칼국수|순대|족발|보쌈|감자탕|해장국|도시락|푸드|키친|밥집|GS25|CU |씨유|세븐일레븐|이마트24|편의점|미니스톱"],
    ["카페·간식", "스타벅스|STARBUCKS|커피|카페|CAFE|투썸|이디야|메가엠지씨|메가커피|빽다방|컴포즈|할리스|폴바셋|파리바게뜨|파리바게트|뚜레쥬르|베이커리|제과|배스킨|던킨|설빙|공차|도넛|디저트"],
    ["장보기", "이마트|홈플러스|롯데마트|코스트코|트레이더스|하나로|마트|노브랜드|컬리|오아시스|정육|청과|농산|수산|반찬|GS더프레시"],
    ["교통·차량", "택시|카카오T|카카오모빌리티|티머니|버스|지하철|교통|코레일|KTX|SRT|주유|충전소|SK에너지|GS칼텍스|S-OIL|에쓰오일|현대오일|알뜰주유|주차|하이패스|도로공사|고속도로|세차|타이어|정비"],
    ["통신·구독", "SKT|SK텔레콤|KT |케이티|LG U|엘지유플러스|LGU|유플러스|알뜰폰|통신|넷플릭스|NETFLIX|유튜브|YOUTUBE|티빙|웨이브|쿠팡와우|디즈니|멜론|지니뮤직|스포티파이|SPOTIFY|왓챠|APPLE|애플|GOOGLE|구글|네이버플러스|밀리의서재"],
    ["주거·공과금", "관리비|월세|한국전력|한전|전기요금|도시가스|가스|수도|상하수도|아파트|세탁|렌탈|정수기|인터넷요금"],
    ["의료·건강", "병원|의원|약국|치과|한의원|안과|피부과|정형외과|내과|소아과|이비인후과|산부인과|검진|헬스|피트니스|필라테스|요가|PT"],
    ["문화·여가", "CGV|메가박스|롯데시네마|영화|서점|교보문고|YES24|예스24|알라딘|영풍문고|노래|코인노래|PC방|피씨방|볼링|여행|호텔|숙박|모텔|펜션|야놀자|여기어때|에어비앤비|AIRBNB|항공|대한항공|아시아나|제주항공|티웨이|진에어|인터파크|티켓|공연|전시|놀이공원|에버랜드|롯데월드"],
    ["교육", "학원|교육|강의|클래스101|인프런|학습지|교습|어학|문제집"],
    ["쇼핑", "쿠팡|COUPANG|네이버페이|NAVERPAY|11번가|G마켓|지마켓|옥션|무신사|올리브영|다이소|지그재그|에이블리|29CM|SSG|신세계|롯데백화점|현대백화점|갤러리아|아울렛|유니클로|자라|ZARA|H&M|이케아|IKEA|오늘의집|알리|ALIEXPRESS|테무|TEMU|아마존|AMAZON|문구|안경|화장품"],
    ["경조사·선물", "축의|부의|조의|화환|꽃집|플라워|선물하기|기프티콘"]
  ].map(function (r) { return [r[0], new RegExp(r[1], "i")]; });

  var state = { wb: null, sheet: null, rows: [], head: 0, tx: [], month: "all", filter: "", printList: true };
  var userMap = {};
  try { userMap = JSON.parse(localStorage.getItem(LS_MAP) || "{}") || {}; } catch (e) { userMap = {}; }
  function saveMap() { try { localStorage.setItem(LS_MAP, JSON.stringify(userMap)); } catch (e) {} }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function won(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function colName(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }

  /* ── 1. 파일 읽기 ─────────────────────────────── */
  function readFile(file) {
    if (!file) return;
    if (/\.pdf$/i.test(file.name)) { return fail("PDF는 아직 지원하지 않아요. 카드사·은행 홈페이지에서 '엑셀 다운로드'로 받은 파일을 넣어 주세요."); }
    if (!window.XLSX) return fail("엑셀 읽기 도구를 불러오지 못했어요. 페이지를 새로고침해 주세요.");
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var buf = new Uint8Array(rd.result), wb;
        if (/\.(csv|txt)$/i.test(file.name)) {
          var text;
          try { text = new TextDecoder("utf-8", { fatal: true }).decode(buf); }
          catch (e) { text = new TextDecoder("euc-kr").decode(buf); }
          wb = XLSX.read(text.replace(/^﻿/, ""), { type: "string", raw: true });
        } else {
          wb = XLSX.read(buf, { type: "array", cellDates: true, codepage: 949 });
        }
        loadWorkbook(wb, file.name);
      } catch (e) {
        if (/password|encrypt/i.test(String(e))) fail("비밀번호가 걸린 파일이에요. 엑셀에서 파일을 열어 비밀번호를 푼 뒤 다른 이름으로 저장해서 넣어 주세요.");
        else fail("파일을 읽지 못했어요. 엑셀(.xlsx, .xls)이나 CSV 파일인지 확인해 주세요.");
      }
    };
    rd.readAsArrayBuffer(file);
  }

  function fail(msg) { var e = $("gg-error"); e.textContent = msg; e.hidden = false; }

  function loadWorkbook(wb, name) {
    $("gg-error").hidden = true;
    state.wb = wb;
    var sel = $("gg-sheet");
    sel.innerHTML = wb.SheetNames.map(function (n, i) { return '<option value="' + i + '">' + esc(n) + "</option>"; }).join("");
    $("gg-sheet-row").hidden = wb.SheetNames.length < 2;
    $("gg-filename").textContent = name;
    pickSheet(0);
    $("gg-step2").hidden = false;
    $("gg-step2").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function pickSheet(i) {
    var ws = state.wb.Sheets[state.wb.SheetNames[i]];
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "", blankrows: false });
    state.rows = rows.slice(0, MAX_ROWS);
    state.head = guessHeader(state.rows);
    fillHeadSelect();
    guessColumns();
    drawPreview();
  }

  /* ── 2. 머리글 줄·열 추정 ─────────────────────── */
  var KEYS = {
    date: /일자|일시|날짜|년월일|^(이용|거래|승인|사용|매출)\s*일$|^date$/i,
    place: /가맹점|이용처|사용처|이용하신 ?곳|거래처|적요|기재 ?내용|내용|메모|받는 ?분|보낸 ?분|상호/,
    amount: /이용 ?금액|승인 ?금액|결제 ?금액|청구 ?금액|매출 ?금액|^금액$|금액\(원\)|원금/,
    out: /출금|찾으신|지급/,
    inn: /입금|맡기신|예입/
  };
  function guessHeader(rows) {
    var best = 0, bestScore = -1;
    for (var r = 0; r < Math.min(rows.length, 30); r++) {
      var cells = rows[r].map(norm), score = 0;
      if (cells.some(function (c) { return c.length < 20 && KEYS.date.test(c); })) score += 2;
      if (cells.some(function (c) { return c.length < 20 && (KEYS.amount.test(c) || KEYS.out.test(c)); })) score += 2;
      if (cells.some(function (c) { return c.length < 20 && KEYS.place.test(c); })) score += 1;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return bestScore > 0 ? best : 0;
  }
  function findCol(re, cells, skip) {
    for (var i = 0; i < cells.length; i++) if (skip.indexOf(i) < 0 && cells[i].length < 24 && re.test(cells[i])) return i;
    return -1;
  }
  function guessColumns() {
    var cells = (state.rows[state.head] || []).map(norm);
    var d = findCol(KEYS.date, cells, []);
    var o = findCol(KEYS.out, cells, [d]), n = findCol(KEYS.inn, cells, [d, o]);
    var a = findCol(KEYS.amount, cells, [d, o, n]);
    var p = findCol(/가맹점|이용처|사용처|이용하신 ?곳|기재 ?내용|거래 ?내용|받는 ?분|보낸 ?분|상호|거래처/, cells, [d, o, n, a]);
    if (p < 0) p = findCol(KEYS.place, cells, [d, o, n, a]);
    var mode = (o >= 0 && n >= 0 && a < 0) ? "bank" : "card";
    if (mode === "card" && a < 0) a = o;
    setColSelects(cells, { date: d, place: p, amount: a, out: o, inn: n });
    document.querySelector('input[name="gg-mode"][value="' + mode + '"]').checked = true;
    syncMode();
  }
  function fillHeadSelect() {
    var sel = $("gg-head"), n = Math.min(state.rows.length, 30), h = "";
    for (var r = 0; r < n; r++) {
      var label = state.rows[r].map(norm).filter(Boolean).slice(0, 4).join(" · ");
      h += '<option value="' + r + '">' + (r + 1) + "번째 줄" + (label ? " — " + esc(label.slice(0, 40)) : "") + "</option>";
    }
    sel.innerHTML = h; sel.value = state.head;
  }
  function setColSelects(cells, pick) {
    var width = state.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var opts = function (allowNone) {
      var h = allowNone ? '<option value="-1">(없음)</option>' : '<option value="-1">고르세요</option>';
      for (var i = 0; i < width; i++) h += '<option value="' + i + '">' + colName(i) + "열" + (cells[i] ? " · " + esc(cells[i].slice(0, 16)) : "") + "</option>";
      return h;
    };
    ["date", "place", "amount", "out", "inn"].forEach(function (k) {
      var s = $("gg-col-" + k); s.innerHTML = opts(k === "inn" || k === "out"); s.value = pick[k];
    });
  }
  function syncMode() {
    var bank = document.querySelector('input[name="gg-mode"]:checked').value === "bank";
    $("gg-card-cols").hidden = bank; $("gg-bank-cols").hidden = !bank;
    drawPreview();
  }
  function drawPreview() {
    var h = state.head, rows = state.rows.slice(h, h + 7);
    var width = state.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var used = {};
    var bank = document.querySelector('input[name="gg-mode"]:checked').value === "bank";
    (bank ? ["date", "place", "out", "inn"] : ["date", "place", "amount"]).forEach(function (k) {
      var el = $("gg-col-" + k);
      var v = +el.value; if (v >= 0) used[v] = {date:"날짜",place:"사용처",amount:"금액",out:"출금",inn:"입금"}[k];
    });
    var t = "<thead><tr><th></th>";
    for (var i = 0; i < width; i++) t += "<th" + (used[i] ? ' class="on"' : "") + ">" + colName(i) + (used[i] ? "<b>" + used[i] + "</b>" : "") + "</th>";
    t += "</tr></thead><tbody>";
    rows.forEach(function (r, j) {
      t += "<tr" + (j === 0 ? ' class="hd"' : "") + "><th>" + (h + j + 1) + "</th>";
      for (var i = 0; i < width; i++) t += "<td" + (used[i] ? ' class="on"' : "") + ">" + esc(cellText(r[i]).slice(0, 24)) + "</td>";
      t += "</tr>";
    });
    $("gg-preview-table").innerHTML = t + "</tbody>";
  }
  function cellText(v) {
    if (v instanceof Date) return ymd(v);
    return norm(v);
  }

  /* ── 3. 값 해석 ──────────────────────────────── */
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function parseDate(v) {
    if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate(), 12);
    if (typeof v === "number" && v > 20000 && v < 80000) { var d = XLSX.SSF.parse_date_code(v); return new Date(d.y, d.m - 1, d.d, 12); }
    var s = norm(v); if (!s) return null;
    var m = s.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/) || s.match(/^(20\d{2})(\d{2})(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
    m = s.match(/^(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
    if (m) return new Date(2000 + +m[1], +m[2] - 1, +m[3], 12);
    m = s.match(/^(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
    if (m) { var y = new Date().getFullYear(), d2 = new Date(y, +m[1] - 1, +m[2], 12); if (d2 > new Date()) d2.setFullYear(y - 1); return d2; }
    return null;
  }
  function parseAmount(v) {
    if (typeof v === "number") return v;
    var s = norm(v); if (!s) return 0;
    var neg = /^\(.*\)$/.test(s) || /^-|−/.test(s) || /취소/.test(s);
    var n = parseFloat(s.replace(/[^\d.]/g, "")); if (isNaN(n)) return 0;
    return neg ? -n : n;
  }
  function categorize(place, isIncome) {
    if (userMap[place]) return userMap[place];
    if (isIncome) return /이자|급여|월급|상여|환급|캐시백|용돈/.test(place) ? "수입" : (RULES[0][1].test(place) ? "이체·제외" : "수입");
    for (var i = 0; i < RULES.length; i++) if (RULES[i][1].test(place)) return RULES[i][0];
    return "기타";
  }

  function build() {
    var bank = document.querySelector('input[name="gg-mode"]:checked').value === "bank";
    var c = {}; ["date", "place", "amount", "out", "inn"].forEach(function (k) { c[k] = +$("gg-col-" + k).value; });
    if (c.date < 0) return fail("날짜가 들어 있는 열을 골라 주세요.");
    if (!bank && c.amount < 0) return fail("금액이 들어 있는 열을 골라 주세요.");
    if (bank && c.out < 0 && c.inn < 0) return fail("출금 열이나 입금 열을 골라 주세요.");
    $("gg-error").hidden = true;
    var tx = [], skipped = 0;
    for (var r = state.head + 1; r < state.rows.length; r++) {
      var row = state.rows[r], d = parseDate(row[c.date]);
      if (!d) { if (row.some(function (x) { return norm(x); })) skipped++; continue; }
      var place = c.place >= 0 ? norm(row[c.place]) : "";
      var out = 0, inn = 0;
      if (bank) { out = c.out >= 0 ? Math.abs(parseAmount(row[c.out])) : 0; inn = c.inn >= 0 ? Math.abs(parseAmount(row[c.inn])) : 0; }
      else { var a = parseAmount(row[c.amount]); out = a; }   // 카드: 음수는 취소·환불
      if (!out && !inn) continue;
      tx.push({ d: d, place: place || "(내용 없음)", out: out, inn: inn, cat: categorize(place, inn > 0 && !out) });
    }
    if (!tx.length) return fail("정리할 거래를 찾지 못했어요. 머리글 줄과 열을 다시 확인해 주세요.");
    tx.sort(function (a, b) { return a.d - b.d; });
    state.tx = tx; state.bank = bank; state.skipped = skipped;
    var months = monthsOf(tx);
    $("gg-month").innerHTML = (months.length > 1 ? '<option value="all">전체 기간</option>' : "") + months.map(function (m) { return '<option value="' + m + '">' + m.replace("-", "년 ") + "월</option>"; }).join("");
    state.month = months.length > 1 ? "all" : months[0];
    $("gg-month").value = state.month;
    $("gg-step3").hidden = false; $("gg-preview").hidden = false;
    render();
    $("gg-step3").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function monthsOf(tx) { var s = {}; tx.forEach(function (t) { s[ymd(t.d).slice(0, 7)] = 1; }); return Object.keys(s).sort(); }
  function current() { return state.tx.filter(function (t) { return state.month === "all" || ymd(t.d).slice(0, 7) === state.month; }); }

  /* ── 4. 집계 ─────────────────────────────────── */
  function summarize(list) {
    var s = { out: 0, inn: 0, n: 0, cats: {}, months: {}, places: {}, weeks: {} };
    list.forEach(function (t) {
      if (t.cat === "이체·제외") return;
      s.n++;
      if (t.cat === "수입") { s.inn += t.inn - t.out; return; }
      var v = t.out - t.inn; s.out += v;
      s.cats[t.cat] = (s.cats[t.cat] || 0) + v;
      var m = ymd(t.d).slice(0, 7); s.months[m] = (s.months[m] || 0) + v;
      var p = s.places[t.place] || (s.places[t.place] = { n: 0, v: 0 }); p.n++; p.v += v;
      var w = Math.floor((t.d.getDate() - 1) / 7) + 1; s.weeks[w] = (s.weeks[w] || 0) + v;
    });
    return s;
  }
  function periodLabel(list) {
    if (!list.length) return "";
    var a = list[0].d, b = list[list.length - 1].d;
    var f = function (d) { return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + "."; };
    return f(a) + " ~ " + f(b);
  }

  function render() {
    var list = current(), s = summarize(list);
    // 요약 타일
    $("gg-tiles").innerHTML =
      tile("쓴 돈", won(s.out) + "원", "") +
      (s.inn ? tile("들어온 돈", won(s.inn) + "원", "") : "") +
      tile("거래", s.n + "건", periodLabel(list)) +
      tile("하루 평균", won(s.out / Math.max(1, days(list))) + "원", "");
    // 분류별
    var cats = Object.keys(s.cats).sort(function (a, b) { return s.cats[b] - s.cats[a]; });
    var max = cats.length ? s.cats[cats[0]] : 1;
    $("gg-cats").innerHTML = cats.map(function (k) {
      var v = s.cats[k], pct = s.out ? v / s.out * 100 : 0;
      return '<tr><td><span class="dot" style="background:' + CAT_COLOR[k] + '"></span>' + k + '</td><td class="bar"><span style="width:' + Math.max(1, v / max * 100) + "%;background:" + CAT_COLOR[k] + '"></span></td><td class="num">' + won(v) + '원</td><td class="num muted">' + pct.toFixed(1) + "%</td></tr>";
    }).join("") || '<tr><td colspan="4" class="muted">지출이 없어요</td></tr>';
    // 월별
    var months = Object.keys(s.months).sort();
    $("gg-months-box").hidden = months.length < 2;
    $("gg-months").innerHTML = months.map(function (m) { return "<tr><td>" + m.replace("-", "년 ") + '월</td><td class="num">' + won(s.months[m]) + "원</td></tr>"; }).join("");
    // 거래 목록
    var f = state.filter;
    var shown = list.filter(function (t) { return !f || t.cat === f; });
    $("gg-filter").innerHTML = '<option value="">모든 분류 (' + list.length + "건)</option>" + CATS.filter(function (k) { return list.some(function (t) { return t.cat === k; }); }).map(function (k) { return '<option value="' + k + '">' + k + " (" + list.filter(function (t) { return t.cat === k; }).length + "건)</option>"; }).join("");
    $("gg-filter").value = f;
    var opts = CATS.map(function (k) { return '<option value="' + k + '">' + k + "</option>"; }).join("");
    $("gg-tx").innerHTML = shown.slice(0, 500).map(function (t) {
      var i = state.tx.indexOf(t);
      return "<tr><td>" + ymd(t.d).slice(5).replace("-", ".") + "</td><td>" + esc(t.place) + '</td><td><select data-i="' + i + '" style="border-left:4px solid ' + CAT_COLOR[t.cat] + '">' + opts.replace('value="' + t.cat + '"', 'value="' + t.cat + '" selected') + '</select></td><td class="num">' + (t.out ? won(t.out) : "") + '</td><td class="num in">' + (t.inn ? won(t.inn) : "") + "</td></tr>";
    }).join("");
    $("gg-tx-more").textContent = shown.length > 500 ? "화면에는 앞의 500건만 보여요. 합계·인쇄·엑셀에는 모두 들어갑니다." : "";
    $("gg-skipped").textContent = state.skipped ? "날짜를 읽지 못한 " + state.skipped + "줄(합계 줄 등)은 뺐어요." : "";
    $("gg-in-col").hidden = !state.bank && !list.some(function (t) { return t.inn; });
    renderPaper(list, s);
  }
  function days(list) { if (!list.length) return 1; return Math.round((list[list.length - 1].d - list[0].d) / 864e5) + 1; }
  function tile(label, value, sub) { return '<div class="tile"><span>' + label + "</span><b>" + value + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</div>"; }

  /* ── 5. A4 가계부 ────────────────────────────── */
  var PER_PAGE = 36;
  function renderPaper(list, s) {
    var title = state.month === "all" ? periodLabel(list) : state.month.replace("-", "년 ") + "월";
    var cats = Object.keys(s.cats).sort(function (a, b) { return s.cats[b] - s.cats[a]; });
    var max = cats.length ? s.cats[cats[0]] : 1;
    var catRows = cats.map(function (k) {
      var v = s.cats[k];
      return '<tr><td><span class="dot" style="background:' + CAT_COLOR[k] + '"></span>' + k + '</td><td class="barc"><span style="width:' + Math.max(1, v / max * 100) + "%;background:" + CAT_COLOR[k] + '"></span></td><td class="num">' + won(v) + '</td><td class="num">' + (s.out ? (v / s.out * 100).toFixed(1) : "0") + "%</td></tr>";
    }).join("");
    var months = Object.keys(s.months).sort(), second;
    if (months.length > 1) {
      second = '<h3>월별 지출</h3><table class="mini2"><tr><th>월</th><th>쓴 돈</th></tr>' + months.map(function (m) { return "<tr><td class=\"c\">" + m.replace("-", ". ") + '</td><td class="num">' + won(s.months[m]) + "</td></tr>"; }).join("") + "</table>";
    } else {
      second = '<h3>주별 지출</h3><table class="mini2"><tr><th>주</th><th>날짜</th><th>쓴 돈</th></tr>' + [1, 2, 3, 4, 5].filter(function (w) { return w < 5 || s.weeks[5]; }).map(function (w) { var a = (w - 1) * 7 + 1; return '<tr><td class="c">' + w + '주</td><td class="c">' + a + "~" + (w === 5 ? "말" : a + 6) + '일</td><td class="num">' + won(s.weeks[w] || 0) + "</td></tr>"; }).join("") + "</table>";
    }
    var top = Object.keys(s.places).sort(function (a, b) { return s.places[b].v - s.places[a].v; }).slice(0, 8);
    var topRows = top.map(function (p, i) { return '<tr><td class="c">' + (i + 1) + "</td><td>" + esc(p.slice(0, 22)) + '</td><td class="c">' + s.places[p].n + '</td><td class="num">' + won(s.places[p].v) + "</td></tr>"; }).join("");
    var page1 = '<div class="paper gg-paper">' +
      '<h1 class="doc-title">가 계 부</h1><p class="gg-period">' + esc(title) + "</p>" +
      '<table class="gg-sum"><tr><th>쓴 돈</th><th>들어온 돈</th><th>남은 돈</th><th>거래</th></tr><tr><td>' + won(s.out) + "원</td><td>" + (s.inn ? won(s.inn) + "원" : "-") + "</td><td>" + (s.inn ? won(s.inn - s.out) + "원" : "-") + "</td><td>" + s.n + "건</td></tr></table>" +
      '<h3>분류별 지출</h3><table class="gg-cat"><tr><th>분류</th><th></th><th>금액(원)</th><th>비율</th></tr>' + catRows + "</table>" +
      '<div class="gg-two"><div>' + second + '</div><div><h3>많이 쓴 곳</h3><table class="mini2"><tr><th></th><th>사용처</th><th>횟수</th><th>금액</th></tr>' + topRows + "</table></div></div>" +
      '<h3>이번 달 돌아보기</h3><div class="gg-memo"></div>' +
      "</div>";
    var pages = "";
    if (state.printList) {
      var rows = list.filter(function (t) { return t.cat !== "이체·제외"; });
      for (var p = 0; p * PER_PAGE < rows.length; p++) {
        var chunk = rows.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
        pages += '<div class="paper gg-paper"><h3 style="margin-top:0">거래 내역 <small>' + esc(title) + " · " + (p + 1) + "/" + Math.ceil(rows.length / PER_PAGE) + '</small></h3><table class="gg-list"><tr><th>날짜</th><th>사용처</th><th>분류</th><th>쓴 돈</th><th>들어온 돈</th></tr>' +
          chunk.map(function (t) { return '<tr><td class="c">' + ymd(t.d).slice(5).replace("-", ".") + "</td><td>" + esc(t.place.slice(0, 26)) + '</td><td class="c">' + t.cat + '</td><td class="num">' + (t.out ? won(t.out) : "") + '</td><td class="num">' + (t.inn ? won(t.inn) : "") + "</td></tr>"; }).join("") +
          "</table></div>";
      }
    }
    $("gg-pages").innerHTML = page1 + pages;
    // 메모 칸이 첫 장 남는 자리를 채우게 (A4 297mm ≈ 1122px, 인쇄 오차 여유 12px)
    var p1 = $("gg-pages").firstElementChild, memo = p1.querySelector(".gg-memo");
    p1.style.minHeight = "0"; memo.style.height = "0";
    var room = p1.offsetWidth * 297 / 210 - 12 - p1.offsetHeight;
    memo.style.height = Math.max(40, room) + "px"; p1.style.minHeight = "";
    $("gg-pagecount").textContent = "A4 " + (1 + (pages.match(/class="paper/g) || []).length) + "장";
    fit();
  }
  function fit() {
    var wrap = $("gg-preview"), sc = $("gg-scale"); if (!wrap || wrap.offsetParent === null) return;
    var paperW = sc.firstElementChild ? sc.firstElementChild.firstElementChild.offsetWidth : 794;
    var k = Math.min(1, (wrap.clientWidth - 32) / paperW);
    sc.style.transform = "scale(" + k + ")"; sc.style.width = paperW + "px";
    wrap.style.height = (sc.scrollHeight * k + 32) + "px";
  }

  /* ── 6. 엑셀로 저장 ──────────────────────────── */
  function exportXlsx() {
    var list = current(), s = summarize(list), wb = XLSX.utils.book_new();
    var a = [["날짜", "사용처", "분류", "쓴 돈", "들어온 돈"]].concat(list.map(function (t) { return [ymd(t.d), t.place, t.cat, t.out || "", t.inn || ""]; }));
    var ws = XLSX.utils.aoa_to_sheet(a); ws["!cols"] = [{ wch: 11 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "거래내역");
    var cats = Object.keys(s.cats).sort(function (x, y) { return s.cats[y] - s.cats[x]; });
    var b = [["분류", "금액", "비율(%)"]].concat(cats.map(function (k) { return [k, s.cats[k], +(s.cats[k] / s.out * 100).toFixed(1)]; })).concat([["합계", s.out, 100]]);
    var ws2 = XLSX.utils.aoa_to_sheet(b); ws2["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 9 }];
    XLSX.utils.book_append_sheet(wb, ws2, "분류별");
    var months = Object.keys(s.months).sort();
    var ws3 = XLSX.utils.aoa_to_sheet([["월", "쓴 돈"]].concat(months.map(function (m) { return [m, s.months[m]]; })));
    ws3["!cols"] = [{ wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws3, "월별");
    XLSX.writeFile(wb, "가계부_" + (state.month === "all" ? "전체" : state.month) + ".xlsx");
  }

  /* ── 7. 예시 파일 ────────────────────────────── */
  function sample() {
    var y = new Date().getFullYear(), m = new Date().getMonth(); if (m === 0) { y--; m = 12; }
    var mm = ("0" + m).slice(-2);
    var base = [
      [1,"스타벅스 강남역점",5600],[1,"GS25 역삼점",3200],[2,"카카오T 택시",11800],[2,"배달의민족",23500],[3,"이마트 성수점",68400],
      [4,"SK텔레콤 통신요금",55000],[5,"쿠팡",32900],[5,"메가MGC커피",2000],[6,"김밥천국",8000],[7,"CGV 용산",15000],
      [8,"올리브영",27800],[8,"티머니 교통",1500],[9,"한국전력 전기요금",38200],[10,"교보문고",18000],[11,"넷플릭스",17000],
      [12,"맘스터치",9200],[13,"○○내과의원",6500],[13,"△△약국",4800],[14,"쿠팡이츠",19800],[15,"아파트 관리비",182000],
      [16,"다이소",7000],[17,"홈플러스",45300],[18,"GS칼텍스 주유",60000],[19,"파리바게뜨",8400],[20,"쿠팡",-12900],
      [20,"무신사",59000],[21,"요기요",21000],[22,"투썸플레이스",6300],[23,"꽃집 플라워",30000],[24,"롯데시네마",14000],
      [25,"도시가스",24700],[26,"마켓컬리",41200],[27,"카카오T 택시",9300],[28,"영어 학원",150000],[29,"본죽",11000],[30,"스타벅스",6100]
    ];
    var aoa = [["카드 이용내역"], ["조회기간: " + y + "." + mm + ".01 ~ " + y + "." + mm + ".30"], [],
      ["이용일자", "이용카드", "가맹점명", "이용금액", "할부", "승인번호"]];
    base.forEach(function (b, i) { aoa.push([y + "." + mm + "." + ("0" + b[0]).slice(-2), "본인 1234", b[1], b[2], "일시불", String(10000000 + i * 7919)]); });
    aoa.push(["합계", "", "", base.reduce(function (a, b) { return a + b[2]; }, 0), "", ""]);
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "이용내역");
    loadWorkbook(wb, "예시_카드이용내역.xlsx");
  }

  /* ── 이벤트 ───────────────────────────────────── */
  var drop = $("gg-drop"), input = $("gg-file");
  input.addEventListener("change", function () { readFile(input.files[0]); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { readFile(e.dataTransfer.files[0]); });
  $("gg-sample").addEventListener("click", sample);
  $("gg-sheet").addEventListener("change", function () { pickSheet(+this.value); });
  $("gg-head").addEventListener("change", function () { state.head = +this.value; guessColumns(); });
  ["date", "place", "amount", "out", "inn"].forEach(function (k) { $("gg-col-" + k).addEventListener("change", drawPreview); });
  document.querySelectorAll('input[name="gg-mode"]').forEach(function (r) { r.addEventListener("change", syncMode); });
  $("gg-build").addEventListener("click", build);
  $("gg-month").addEventListener("change", function () { state.month = this.value; render(); });
  $("gg-filter").addEventListener("change", function () { state.filter = this.value; render(); });
  $("gg-tx").addEventListener("change", function (e) {
    var sel = e.target; if (!sel.dataset.i) return;
    var t = state.tx[+sel.dataset.i], cat = sel.value;
    state.tx.forEach(function (x) { if (x.place === t.place) x.cat = cat; });   // 같은 사용처는 함께
    userMap[t.place] = cat; saveMap();
    render();
  });
  $("gg-printlist").addEventListener("change", function () { state.printList = this.checked; render(); });
  $("gg-print").addEventListener("click", function () { window.print(); });
  $("gg-xlsx").addEventListener("click", exportXlsx);
  $("gg-reset").addEventListener("click", function () { state.tx = []; $("gg-step2").hidden = true; $("gg-step3").hidden = true; $("gg-preview").hidden = true; window.scrollTo({ top: 0, behavior: "smooth" }); });
  $("gg-forget").addEventListener("click", function () { userMap = {}; saveMap(); this.textContent = "지웠어요"; });
  window.addEventListener("resize", fit);
})();
