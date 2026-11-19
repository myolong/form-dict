/* 어르신 두뇌 활동지 생성기 — 문제는 이 브라우저 안에서 만들고, 어디에도 보내거나 저장하지 않습니다(설정만 이 기기에 기억). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

  // ── 난수 (시드가 같으면 같은 문제) ─────────────────────────────
  function RNG(seed) {
    var s = (seed >>> 0) || 1;
    var r = function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    r.int = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    r.pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    r.shuffle = function (arr) { arr = arr.slice(); for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    for (var i = 0; i < 5; i++) r();
    return r;
  }
  function won(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  var DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  function dateKo(d) { return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + DAYS[d.getDay()] + "요일"; }
  function season(m) { return m >= 3 && m <= 5 ? "봄" : m >= 6 && m <= 8 ? "여름" : m >= 9 && m <= 11 ? "가을" : "겨울"; }
  var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  function chosung(w) { return w.split("").map(function (c) { var k = c.charCodeAt(0) - 0xAC00; return k >= 0 && k < 11172 ? CHO[Math.floor(k / 588)] : c; }).join(""); }

  // ── 낱말·속담 자료 (직접 고른 일상 낱말, 옛 속담) ─────────────────
  var WORDS = {
    "과일": ["사과", "배", "감", "귤", "포도", "수박", "참외", "딸기", "복숭아", "자두", "바나나", "대추", "밤", "앵두", "홍시", "곶감", "오렌지", "키위", "레몬", "석류"],
    "채소": ["배추", "무", "오이", "호박", "감자", "고구마", "당근", "양파", "마늘", "대파", "시금치", "콩나물", "고추", "가지", "상추", "깻잎", "버섯", "도라지", "미나리", "부추"],
    "동물": ["소", "말", "개", "돼지", "닭", "오리", "토끼", "고양이", "호랑이", "사자", "코끼리", "기린", "원숭이", "다람쥐", "거북이", "염소", "참새", "제비", "까치", "두루미"],
    "꽃·나무": ["장미", "국화", "무궁화", "진달래", "개나리", "목련", "해바라기", "코스모스", "백합", "동백", "소나무", "은행나무", "단풍나무", "벚나무", "대나무", "감나무", "느티나무", "버드나무", "민들레", "나팔꽃"],
    "음식": ["김치", "된장국", "비빔밥", "불고기", "잡채", "떡국", "송편", "만두", "국수", "냉면", "김밥", "갈비", "미역국", "부침개", "호떡", "식혜", "수정과", "누룽지", "칼국수", "떡볶이"],
    "집안 물건": ["냉장고", "세탁기", "텔레비전", "선풍기", "전화기", "시계", "거울", "이불", "베개", "방석", "빗자루", "걸레", "주전자", "냄비", "숟가락", "젓가락", "그릇", "다리미", "우산", "달력"],
    "몸": ["머리", "얼굴", "눈썹", "코", "입술", "귀", "어깨", "팔꿈치", "손가락", "손톱", "무릎", "발가락", "발뒤꿈치", "허리", "배꼽", "이마", "턱", "목", "가슴", "등"],
    "직업": ["의사", "간호사", "선생님", "농부", "어부", "경찰", "소방관", "요리사", "미용사", "목수", "우체부", "운전사", "가수", "화가", "기자", "판사", "약사", "군인", "은행원", "상인"]
  };
  var PROVERBS = [
    "티끌 모아 태산", "누워서 떡 먹기", "식은 죽 먹기", "그림의 떡", "우물 안 개구리", "금강산도 식후경", "작은 고추가 맵다",
    "가는 날이 장날", "꿩 먹고 알 먹고", "누이 좋고 매부 좋고", "등잔 밑이 어둡다", "벼룩도 낯짝이 있다", "말이 씨가 된다",
    "발 없는 말이 천 리 간다", "백지장도 맞들면 낫다", "세 살 버릇 여든까지 간다", "소 잃고 외양간 고친다",
    "가는 말이 고와야 오는 말이 곱다", "낮말은 새가 듣고 밤말은 쥐가 듣는다", "원숭이도 나무에서 떨어진다",
    "호랑이도 제 말 하면 온다", "고생 끝에 낙이 온다", "공든 탑이 무너지랴", "구슬이 서 말이라도 꿰어야 보배",
    "낫 놓고 기역 자도 모른다", "돌다리도 두들겨 보고 건너라", "목마른 사람이 우물 판다", "바늘 도둑이 소도둑 된다",
    "아니 땐 굴뚝에 연기 날까", "열 번 찍어 안 넘어가는 나무 없다", "윗물이 맑아야 아랫물이 맑다", "천 리 길도 한 걸음부터",
    "콩 심은 데 콩 나고 팥 심은 데 팥 난다", "하늘이 무너져도 솟아날 구멍이 있다", "호랑이 굴에 가야 호랑이 새끼를 잡는다",
    "벼는 익을수록 고개를 숙인다", "빈 수레가 요란하다", "사공이 많으면 배가 산으로 간다", "될성부른 나무는 떡잎부터 알아본다",
    "개구리 올챙이 적 생각 못 한다", "고래 싸움에 새우 등 터진다", "가랑비에 옷 젖는 줄 모른다", "남의 떡이 커 보인다",
    "도토리 키 재기", "달면 삼키고 쓰면 뱉는다", "믿는 도끼에 발등 찍힌다", "쇠뿔도 단김에 빼라", "시작이 반이다",
    "제 눈에 안경", "꿀 먹은 벙어리", "오르지 못할 나무는 쳐다보지도 마라", "웃는 얼굴에 침 못 뱉는다",
    "마른하늘에 날벼락", "티끌만 한 일도 쌓이면 산이 된다", "급할수록 돌아가라", "말 한마디로 천 냥 빚을 갚는다"
  ];

  // ── 활동지 목록 ───────────────────────────────────────────────
  // make(r, st) → { title, guide, html, answer(문자열 HTML 또는 ""), noDate }
  var A = {};

  // 1. 더하기·빼기
  A.addsub = {
    title: "더하기·빼기", opts: [["op", "계산", [["mix", "섞어서"], ["plus", "더하기"], ["minus", "빼기"]]]],
    levels: ["쉬움: 답이 10 이하", "보통: 20까지(받아올림)", "어려움: 두 자리 수"],
    make: function (r, st) {
      var n = st.size === 2 ? 10 : 16, seen = {}, qs = [], tries = 0;
      while (qs.length < n && tries++ < 500) {
        var plus = st.op === "plus" ? true : st.op === "minus" ? false : r() < 0.55, a, b;
        if (st.level === 1) { if (plus) { a = r.int(1, 8); b = r.int(1, 10 - a); } else { a = r.int(2, 10); b = r.int(1, a - 1); } }
        else if (st.level === 2) { if (plus) { a = r.int(3, 9); b = r.int(Math.max(2, 11 - a), 9); } else { a = r.int(11, 18); b = r.int(a - 9, 9); } }
        else { if (plus) { a = r.int(12, 69); b = r.int(11, 89 - a); } else { a = r.int(31, 98); b = r.int(11, a - 10); } }
        var k = a + (plus ? "+" : "-") + b; if (seen[k]) continue; seen[k] = 1;
        qs.push({ t: a + " " + (plus ? "+" : "−") + " " + b + " =", ans: plus ? a + b : a - b });
      }
      return {
        title: "더하기·빼기", guide: "계산해서 네모 칸에 답을 써 보세요.",
        html: '<div class="hd-calc s' + st.size + '">' + qs.map(function (q, i) { return '<div class="q"><b>' + (i + 1) + '</b><span>' + q.t + '</span><i class="hd-box"></i></div>'; }).join("") + "</div>",
        answer: qs.map(function (q, i) { return (i + 1) + ") " + q.ans; }).join("　")
      };
    }
  };

  // 2. 시장 보기 돈 계산
  var GOODS = [["두부", 1500], ["콩나물", 1000], ["사과", 2000], ["우유", 2500], ["달걀 한 판", 7000], ["대파 한 단", 3000], ["라면", 1000], ["고등어", 4000],
    ["귤 한 봉지", 5000], ["식빵", 3500], ["배추", 4000], ["양파", 1500], ["감자", 1000], ["김", 1500], ["요구르트", 500], ["떡", 3000], ["오이", 1000], ["호박", 2000]];
  A.money = {
    title: "시장 보기 돈 계산", opts: [],
    levels: ["쉬움: 물건 1~2개, 천 원 단위", "보통: 개수가 있는 계산", "어려움: 거스름돈까지"],
    make: function (r, st) {
      var pool = st.level === 1 ? GOODS.filter(function (g) { return g[1] % 1000 === 0; }) : GOODS;
      var board = r.shuffle(pool).slice(0, st.size === 2 ? 6 : 8);
      var n = st.size === 2 ? 4 : 6, qs = [];
      for (var i = 0; i < n; i++) {
        var items, total, text, ans;
        if (st.level === 1) {
          items = r.shuffle(board).slice(0, i % 2 ? 2 : 1).map(function (g) { return [g, i % 2 ? 1 : r.int(1, 3)]; });
        } else {
          items = r.shuffle(board).slice(0, 2).map(function (g) { return [g, r.int(1, 3)]; });
        }
        total = items.reduce(function (s, it) { return s + it[0][1] * it[1]; }, 0);
        text = items.map(function (it) { return "<b>" + it[0][0] + "</b> " + it[1] + "개"; }).join("와 ") + "를 샀어요.";
        if (st.level === 3 && i % 2 === 1) {
          var pay = total <= 5000 ? 5000 : total <= 10000 ? 10000 : 20000;
          text += " <b>" + won(pay) + "원</b>을 내면 거스름돈은?"; ans = pay - total;
          qs.push({ text: text, line: "거스름돈 (　　　　　　) 원", ans: won(ans) + "원 (모두 " + won(total) + "원)" });
        } else {
          text += " 모두 얼마일까요?";
          qs.push({ text: text, line: "모두 (　　　　　　) 원", ans: won(total) + "원" });
        }
      }
      var b = '<div class="hd-board"><div class="hd-board-t">오늘의 가격표 <small>(연습용 가격)</small></div><div class="hd-board-g">' +
        board.map(function (g) { return "<span><b>" + g[0] + "</b>" + won(g[1]) + "원</span>"; }).join("") + "</div></div>";
      return {
        title: "시장 보기 돈 계산", guide: "가격표를 보고 얼마인지 계산해 보세요.",
        html: b + '<div class="hd-money s' + st.size + '">' + qs.map(function (q, i) { return '<div class="mq"><p><em>' + (i + 1) + "</em>" + q.text + '</p><p class="ml">' + q.line + "</p></div>"; }).join("") + "</div>",
        answer: qs.map(function (q, i) { return (i + 1) + ") " + q.ans; }).join("　")
      };
    }
  };

  // 3. 시계 읽기
  function clockSVG(h, m, hands, mm) {
    var s = '<svg viewBox="0 0 120 120" width="' + mm + 'mm" height="' + mm + 'mm"><circle cx="60" cy="60" r="56" fill="#fff" stroke="#000" stroke-width="3"/>';
    for (var i = 0; i < 60; i++) { if (i % 5) { var a0 = i * 6 * Math.PI / 180; s += '<line x1="' + (60 + Math.sin(a0) * 53) + '" y1="' + (60 - Math.cos(a0) * 53) + '" x2="' + (60 + Math.sin(a0) * 50) + '" y2="' + (60 - Math.cos(a0) * 50) + '" stroke="#000" stroke-width="1"/>'; } }
    for (var k = 1; k <= 12; k++) { var a = k * 30 * Math.PI / 180; s += '<text x="' + (60 + Math.sin(a) * 41) + '" y="' + (60 - Math.cos(a) * 41 + 6) + '" text-anchor="middle" font-size="17" font-weight="700" font-family="Noto Sans KR,sans-serif">' + k + "</text>"; }
    if (hands) {
      var ha = ((h % 12) + m / 60) * 30 * Math.PI / 180, ma = m * 6 * Math.PI / 180;
      s += '<line x1="60" y1="60" x2="' + (60 + Math.sin(ha) * 25) + '" y2="' + (60 - Math.cos(ha) * 25) + '" stroke="#000" stroke-width="6" stroke-linecap="round"/>';
      s += '<line x1="60" y1="60" x2="' + (60 + Math.sin(ma) * 38) + '" y2="' + (60 - Math.cos(ma) * 38) + '" stroke="#000" stroke-width="3.5" stroke-linecap="round"/>';
    }
    return s + '<circle cx="60" cy="60" r="4"/></svg>';
  }
  A.clock = {
    title: "시계 읽기", opts: [["mode", "활동", [["read", "시계 보고 시각 쓰기"], ["draw", "시각 보고 바늘 그리기"]]]],
    levels: ["쉬움: 정각", "보통: 정각·30분", "어려움: 5분 단위"],
    make: function (r, st) {
      var n = st.size === 2 ? 4 : 9, seen = {}, ts = [];
      while (ts.length < n) {
        var h = r.int(1, 12), m = st.level === 1 ? 0 : st.level === 2 ? r.pick([0, 30]) : r.int(1, 11) * 5;
        if (seen[h + ":" + m]) continue; seen[h + ":" + m] = 1; ts.push([h, m]);
      }
      var mm = st.size === 2 ? 72 : 50, draw = st.mode === "draw";
      return {
        title: draw ? "시계 바늘 그리기" : "시계 읽기",
        guide: draw ? "아래에 적힌 시각에 맞게 짧은 바늘과 긴 바늘을 그려 보세요." : "시계를 보고 몇 시 몇 분인지 써 보세요.",
        html: '<div class="hd-clocks s' + st.size + '">' + ts.map(function (t) {
          return '<div class="ck">' + clockSVG(t[0], t[1], !draw, mm) + '<p>' + (draw ? "<b>" + t[0] + "시" + (t[1] ? " " + t[1] + "분" : "") + "</b>" : "(　　) 시 (　　) 분") + "</p></div>";
        }).join("") + "</div>",
        answer: ts.map(function (t, i) { return (i + 1) + ") " + t[0] + "시 " + (t[1] ? t[1] + "분" : "정각"); }).join("　")
      };
    }
  };

  // 4. 숫자 순서대로 잇기
  var GANA = "가나다라마바사아자차카타파하".split("");
  A.trail = {
    title: "숫자 순서대로 잇기", opts: [["kind", "순서", [["num", "숫자만 (1, 2, 3…)"], ["mix", "숫자·글자 번갈아 (1, 가, 2, 나…)"]]]],
    levels: ["쉬움: 10개", "보통: 15개", "어려움: 25개"],
    make: function (r, st) {
      var n = [0, 10, 15, 25][st.level], R = st.size === 2 ? 10 : 8, W = 178, H = 205, pts = [], tries = 0, minD = R * 2.9;
      if (st.kind === "mix") n = Math.min(n, 24);
      while (pts.length < n && tries++ < 20000) {
        var x = R + 2 + r() * (W - 2 * R - 4), y = R + 2 + r() * (H - 2 * R - 4), ok = true;
        for (var i = 0; i < pts.length; i++) { var dx = pts[i][0] - x, dy = pts[i][1] - y; if (dx * dx + dy * dy < minD * minD) { ok = false; break; } }
        if (ok) pts.push([x, y]);
        if (tries === 10000 && pts.length < n) { pts = []; minD *= 0.9; }
      }
      var labels = [];
      for (var k = 0; k < n; k++) labels.push(st.kind === "mix" ? (k % 2 ? GANA[(k - 1) / 2] : String(k / 2 + 1)) : String(k + 1));
      var fs = R * (labels[n - 1].length > 1 ? 1.05 : 1.25);
      var svg = '<svg class="hd-trail" viewBox="0 0 ' + W + " " + H + '" width="' + W + 'mm" height="' + H + 'mm">';
      pts.forEach(function (p, i) {
        svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + R + '" fill="#fff" stroke="#000" stroke-width="' + (i === 0 || i === n - 1 ? 0.9 : 0.5) + '"/>' +
          '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + fs * 0.36).toFixed(1) + '" text-anchor="middle" font-size="' + fs.toFixed(1) + '" font-weight="700" font-family="Noto Sans KR,sans-serif">' + labels[i] + "</text>";
        if (i === 0 || i === n - 1) svg += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] - R - 1.5).toFixed(1) + '" text-anchor="middle" font-size="4.2" font-weight="700" font-family="Noto Sans KR,sans-serif">' + (i ? "끝" : "시작") + "</text>";
      });
      return {
        title: "순서대로 잇기",
        guide: st.kind === "mix" ? "1 → 가 → 2 → 나 → 3 … 숫자와 글자를 번갈아 차례대로 이어 보세요." : "1부터 " + n + "까지 차례대로 선으로 이어 보세요.",
        html: svg + "</svg>", answer: ""
      };
    }
  };

  // 5. 빈칸 숫자 채우기
  A.fillnum = {
    title: "빈칸 숫자 채우기", opts: [],
    levels: ["쉬움: 1씩 커지는 수", "보통: 2·5·10씩, 거꾸로", "어려움: 3·4씩, 빈칸 여러 개"],
    make: function (r, st) {
      var rows = st.size === 2 ? 6 : 8, len = st.size === 2 ? 5 : 6, out = [], ans = [];
      for (var i = 0; i < rows; i++) {
        var step, start;
        if (st.level === 1) { step = i % 4 === 3 ? -1 : 1; start = step > 0 ? r.int(1, 14) : r.int(8, 20); }
        else if (st.level === 2) { step = r.pick([2, 5, 10, -1, 2, 10]); start = step === 10 ? r.int(1, 5) * 10 : step === 5 ? r.int(0, 4) * 5 + 5 : step === -1 ? r.int(10, 30) : r.int(1, 20); }
        else { step = r.pick([3, 4, -2, -5, 3, 4, 20]); start = step < 0 ? r.int(30, 60) : r.int(1, 30); }
        var seq = []; for (var k = 0; k < len; k++) seq.push(start + step * k);
        var blanks = st.level === 3 ? r.shuffle([0, 1, 2, 3, 4, 5].slice(0, len)).slice(0, 2) : [r.int(1, len - 1)];
        out.push('<div class="row">' + seq.map(function (v, k) { return blanks.indexOf(k) >= 0 ? '<i class="hd-box"></i>' : "<span>" + v + "</span>"; }).join("") + "</div>");
        ans.push((i + 1) + ") " + blanks.sort().map(function (k) { return seq[k]; }).join(", "));
      }
      return { title: "빈칸 숫자 채우기", guide: "숫자가 어떻게 커지거나 작아지는지 보고, 빈칸에 알맞은 수를 써 보세요.", html: '<div class="hd-seq s' + st.size + " l" + len + '">' + out.join("") + "</div>", answer: ans.join("　") };
    }
  };

  // 6. 같은 글자 찾기
  var LOOK = [["꽃", "꼿꽂곶꼳꽁꼭"], ["밥", "밤반받방박발"], ["물", "뭄문묻불줄룰"], ["손", "솜송순숀존돈"], ["달", "닭담단당닥탈"], ["집", "짐짓질짚칩입"], ["별", "벌벨멸볕볍밸"], ["강", "갓감같각깡광"], ["눈", "논늠는둔문뉸"], ["봄", "봉봅볼톰몸붐"]];
  var COMMON = "가나다라마바사아자차카타파하고노도로모보소오조호구누두루무부수우주후기니디리미비시이지히".split("");
  A.letterfind = {
    title: "같은 글자 찾기", opts: [["kind", "찾을 것", [["word", "글자"], ["num", "숫자"]]]],
    levels: ["쉬움: 모양이 다른 글자 속에서", "보통: 비슷한 글자 속에서", "어려움: 칸이 많고 비슷한 글자"],
    make: function (r, st) {
      var cols = st.size === 2 ? 6 : 7, rowsN = st.size === 2 ? 7 : 9;
      if (st.level === 3) { cols += 1; rowsN += 1; }
      var target, others;
      if (st.kind === "num") {
        target = String(r.int(2, 9));
        var simNum = { "2": "57Z", "3": "856", "4": "17", "5": "632", "6": "958", "7": "124", "8": "3690", "9": "687" };
        others = st.level === 1 ? "0123456789".replace(target, "").split("") : (simNum[target] || "0").replace(/Z/, "").split("").concat(st.level === 3 ? [] : ["0", "1"]);
        others = others.filter(function (c) { return c !== target && /\d/.test(c); });
      } else {
        var set = r.pick(LOOK); target = set[0];
        others = st.level === 1 ? r.shuffle(COMMON).slice(0, 8) : set[1].split("");
      }
      var cells = [], cnt = 0, total = cols * rowsN;
      for (var i = 0; i < total; i++) { var t = r() < 0.2; if (t) cnt++; cells.push(t ? target : r.pick(others)); }
      if (!cnt) { cells[r.int(0, total - 1)] = target; cnt = 1; }
      return {
        title: "같은 글자 찾기",
        guide: '<b class="hd-ring">' + target + "</b> 을(를) 모두 찾아 동그라미 하세요. 모두 몇 개인가요? ( 　　 개)",
        html: '<div class="hd-find s' + st.size + '" style="grid-template-columns:repeat(' + cols + ',1fr)">' + cells.map(function (c) { return "<span>" + c + "</span>"; }).join("") + "</div>",
        answer: target + " 모두 " + cnt + "개"
      };
    }
  };

  // 7. 낱말 찾기 퍼즐
  var FILL = "가거고구기나너노누니다더도두디라러로루리마머모무미바버보부비사서소수시아어오우이자저조주지차처초추치카타파하허호후히".split("");
  A.wordsearch = {
    title: "낱말 찾기 퍼즐", opts: [["theme", "주제", [["mix", "골고루"]].concat(Object.keys(WORDS).map(function (k) { return [k, k]; }))]],
    levels: ["쉬움: 6×6 칸, 가로로만", "보통: 8×8 칸, 가로·세로", "어려움: 9×9 칸, 대각선까지"],
    make: function (r, st) {
      var N = [0, 6, 8, 9][st.level], want = [0, 5, 7, 9][st.level];
      var dirs = st.level === 1 ? [[0, 1]] : st.level === 2 ? [[0, 1], [1, 0]] : [[0, 1], [1, 0], [1, 1]];
      var theme = st.theme === "mix" || !WORDS[st.theme] ? r.pick(Object.keys(WORDS)) : st.theme;
      var cand = r.shuffle(WORDS[theme].filter(function (w) { return w.length >= 2 && w.length <= Math.min(5, N); }));
      var grid = [], placed = [];
      for (var y = 0; y < N; y++) { grid.push([]); for (var x = 0; x < N; x++) grid[y].push(""); }
      for (var wi = 0; wi < cand.length && placed.length < want; wi++) {
        var w = cand[wi].split(""), done = false;
        for (var t = 0; t < 200 && !done; t++) {
          var d = r.pick(dirs), y0 = r.int(0, N - 1 - d[0] * (w.length - 1)), x0 = r.int(0, N - 1 - d[1] * (w.length - 1)), ok = true;
          for (var k = 0; k < w.length; k++) { var c = grid[y0 + d[0] * k][x0 + d[1] * k]; if (c && c !== w[k]) { ok = false; break; } }
          if (!ok) continue;
          var cellsW = [];
          for (k = 0; k < w.length; k++) { grid[y0 + d[0] * k][x0 + d[1] * k] = w[k]; cellsW.push((y0 + d[0] * k) * N + x0 + d[1] * k); }
          placed.push({ w: cand[wi], cells: cellsW }); done = true;
        }
      }
      var used = {}; placed.forEach(function (p) { p.w.split("").forEach(function (c) { used[c] = 1; }); });
      var fill = FILL.filter(function (c) { return !used[c]; });
      var flat = [];
      for (y = 0; y < N; y++) for (x = 0; x < N; x++) { if (!grid[y][x]) grid[y][x] = r.pick(fill); flat.push(grid[y][x]); }
      var on = {}; placed.forEach(function (p) { p.cells.forEach(function (c) { on[c] = 1; }); });
      var cell = st.size === 2 ? Math.min(26, 172 / N) : Math.min(22, 158 / N);
      var g = function (ans) {
        return '<div class="hd-ws" style="grid-template-columns:repeat(' + N + "," + (ans ? 6 : cell) + "mm);font-size:" + (ans ? 3.6 : cell * 0.55) + 'mm">' +
          flat.map(function (c, i) { return '<span style="height:' + (ans ? 6 : cell) + 'mm"' + (ans && on[i] ? ' class="on"' : "") + ">" + c + "</span>"; }).join("") + "</div>";
      };
      var list = placed.map(function (p) { return p.w; }).sort(function (a, b) { return a.localeCompare(b, "ko"); });
      return {
        title: "낱말 찾기 — " + theme,
        guide: "아래 낱말을 표에서 찾아 동그라미 하세요. " + (st.level === 1 ? "낱말은 왼쪽에서 오른쪽으로 숨어 있어요." : st.level === 2 ? "가로(→)와 세로(↓)로 숨어 있어요." : "가로(→), 세로(↓), 대각선(↘)으로 숨어 있어요."),
        html: '<div class="hd-chips s' + st.size + '">' + list.map(function (w) { return "<span>" + w + "</span>"; }).join("") + "</div>" + g(false),
        answer: g(true)
      };
    }
  };

  // 8. 첫소리 낱말 맞히기
  A.chosung = {
    title: "첫소리 낱말 맞히기", opts: [["theme", "주제", [["mix", "골고루"]].concat(Object.keys(WORDS).map(function (k) { return [k, k]; }))]],
    levels: ["쉬움: 두 글자 + 첫 글자 힌트", "보통: 두세 글자", "어려움: 세 글자 이상"],
    make: function (r, st) {
      var n = st.size === 2 ? 7 : 10, pool = [];
      Object.keys(WORDS).forEach(function (k) { if (st.theme === "mix" || st.theme === k) WORDS[k].forEach(function (w) { pool.push([w, k]); }); });
      pool = pool.filter(function (p) { var L = p[0].length; return st.level === 1 ? L === 2 : st.level === 2 ? L >= 2 && L <= 3 : L >= 3; });
      if (pool.length < n) Object.keys(WORDS).forEach(function (k) { WORDS[k].forEach(function (w) { if (w.length >= 2) pool.push([w, k]); }); });
      var qs = r.shuffle(pool).slice(0, n);
      return {
        title: "첫소리 보고 낱말 맞히기", guide: "첫소리와 힌트를 보고 어떤 낱말인지 써 보세요.",
        html: '<div class="hd-cho s' + st.size + '">' + qs.map(function (q, i) {
          var cs = chosung(q[0]);
          return '<div class="row"><b>' + (i + 1) + '</b><span class="cs">' + cs.split("").join(" ") + '</span><span class="hint">' + q[1] + (st.level === 1 ? " · 첫 글자 '" + q[0][0] + "'" : "") + '</span><i class="line"></i></div>';
        }).join("") + "</div>",
        answer: qs.map(function (q, i) { return (i + 1) + ") " + q[0]; }).join("　")
      };
    }
  };

  // 9. 속담 따라 쓰기
  function splitLines(t, max) {
    var words = t.split(" "), lines = [], cur = "";
    var wl = function (x) { return x.replace(/ /g, "").length + (x.split(" ").length - 1) * 0.4; };
    words.forEach(function (w) { if (wl(cur ? cur + " " + w : w) > max && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; });
    if (cur) lines.push(cur);
    return lines;
  }
  A.proverb = {
    title: "속담 따라 쓰기", opts: [["mode", "활동", [["trace", "흐린 글씨 따라 쓰기"], ["blank", "뒷부분 채워 쓰기"]]]],
    levels: ["쉬움: 짧은 속담", "보통: 중간 길이", "어려움: 긴 속담"],
    make: function (r, st) {
      var pool = PROVERBS.filter(function (p) { var L = p.length; return st.level === 1 ? L <= 9 : st.level === 2 ? L > 7 && L <= 14 : L > 12; });
      var max = st.size === 2 ? 13.5 : 17, room = 212, html = "", ans = [], used = 0, list = r.shuffle(pool);
      var lineH = st.size === 2 ? 34 : 28;
      for (var i = 0; i < list.length; i++) {
        var p = list[i], lines = splitLines(p, max);
        var h = st.mode === "blank" ? 9 + lineH * 0.8 : 9 + lines.length * lineH;
        if (used + h > room) continue;
        used += h;
        if (st.mode === "blank") {
          var ws = p.split(" "), cut = Math.max(1, Math.ceil(ws.length / 2)), front = ws.slice(0, cut).join(" "), back = ws.slice(cut).join(" ");
          var hint = st.level === 1 ? back.split(" ").map(function (w) { return w[0] + "○".repeat(w.length - 1); }).join(" ") : st.level === 2 ? back[0] + "…" : "";
          html += '<div class="pv pvb s' + st.size + '"><p class="pv-q"><b>' + (ans.length + 1) + "</b>" + front + ' <span class="pv-b"></span></p>' + (hint ? '<p class="pv-h">힌트: ' + hint + "</p>" : "") + "</div>";
          ans.push((ans.length + 1) + ") " + back);
        } else {
          html += '<div class="pv s' + st.size + '"><p class="pv-q"><b>' + (ans.length + 1) + "</b>" + p + "</p>" + lines.map(function (l) { return '<div class="pv-tr">' + l + '</div><div class="pv-w"></div>'; }).join("") + "</div>";
          ans.push(p);
        }
      }
      return {
        title: st.mode === "blank" ? "속담 뒷부분 채우기" : "속담 따라 쓰기",
        guide: st.mode === "blank" ? "속담의 앞부분을 읽고 이어지는 말을 빈칸에 써 보세요." : "흐린 글씨를 따라 쓰고, 아래 칸에 한 번 더 써 보세요.",
        html: html, answer: st.mode === "blank" ? ans.join("　") : ""
      };
    }
  };

  // 10. 오늘 날짜 쓰기
  A.today = {
    title: "오늘 날짜 쓰기", opts: [], noDate: true,
    levels: ["쉬움: 보기에서 골라 동그라미", "보통: 빈칸에 쓰기", "어려움: 어제·내일까지"],
    make: function (r, st, day) {
      var d = day, m = d.getMonth() + 1, y = new Date(d.getTime() - 864e5), t = new Date(d.getTime() + 864e5);
      var circ = function (arr) { return '<span class="opts">' + arr.map(function (a) { return "<i>" + a + "</i>"; }).join("") + "</span>"; };
      var rows = [];
      if (st.level === 1) {
        rows.push(["오늘은 몇 월인가요?", circ(["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"])]);
        rows.push(["오늘은 무슨 요일인가요?", circ(["월", "화", "수", "목", "금", "토", "일"])]);
        rows.push(["지금은 어느 계절인가요?", circ(["봄", "여름", "가을", "겨울"])]);
        rows.push(["오늘 날씨는 어떤가요?", circ(["맑음", "흐림", "비", "눈"])]);
        rows.push(["지금은 하루 중 언제인가요?", circ(["아침", "점심", "저녁"])]);
      } else {
        rows.push(["오늘은", "(　　　　)년 (　　)월 (　　)일 (　　)요일"]);
        rows.push(["지금 계절은", "(　　　　)"]);
        rows.push(["오늘 날씨는", "(　　　　　　)"]);
        rows.push(["오늘 아침에 먹은 음식", '<i class="ln"></i>']);
        if (st.level === 3) {
          rows.push(["어제는", "(　　)월 (　　)일 (　　)요일"]);
          rows.push(["내일은", "(　　)월 (　　)일 (　　)요일"]);
          rows.push(["다음 달은", "(　　)월"]);
        }
        rows.push(["오늘 하고 싶은 일", '<i class="ln"></i>']);
      }
      return {
        title: "오늘은 며칠인가요?", guide: st.level === 1 ? "알맞은 것에 동그라미 하세요." : "빈칸에 알맞게 써 보세요.",
        html: '<div class="hd-today s' + st.size + " l" + st.level + '">' + rows.map(function (rw) { return "<div class=\"row\"><p>" + rw[0] + "</p><div>" + rw[1] + "</div></div>"; }).join("") + "</div>",
        answer: "오늘: " + dateKo(d) + " (" + season(m) + ")" + (st.level === 3 ? "　어제: " + (y.getMonth() + 1) + "월 " + y.getDate() + "일 " + DAYS[y.getDay()] + "요일　내일: " + (t.getMonth() + 1) + "월 " + t.getDate() + "일 " + DAYS[t.getDay()] + "요일　다음 달: " + (m % 12 + 1) + "월" : "")
      };
    }
  };

  // 11. 쉬운 숫자 퍼즐 (스도쿠)
  function sudoku(r, n) {
    var bh = n === 4 ? 2 : 2, bw = n === 4 ? 2 : 3, g = [], y, x;
    for (y = 0; y < n; y++) { g.push([]); for (x = 0; x < n; x++) g[y].push(((y % bh) * bw + Math.floor(y / bh) + x) % n + 1); }
    var digits = r.shuffle(Array.from({ length: n }, function (_, i) { return i + 1; }));
    g = g.map(function (row) { return row.map(function (v) { return digits[v - 1]; }); });
    var bands = r.shuffle(Array.from({ length: n / bh }, function (_, i) { return i; })), rowsO = [];
    bands.forEach(function (b) { r.shuffle(Array.from({ length: bh }, function (_, i) { return i; })).forEach(function (i) { rowsO.push(b * bh + i); }); });
    var stacks = r.shuffle(Array.from({ length: n / bw }, function (_, i) { return i; })), colsO = [];
    stacks.forEach(function (s) { r.shuffle(Array.from({ length: bw }, function (_, i) { return i; })).forEach(function (i) { colsO.push(s * bw + i); }); });
    var sol = rowsO.map(function (ry) { return colsO.map(function (cx) { return g[ry][cx]; }); });
    function count(p, lim) {
      var c = 0;
      (function go(i) {
        if (c >= lim) return;
        if (i === n * n) { c++; return; }
        var yy = Math.floor(i / n), xx = i % n;
        if (p[yy][xx]) return go(i + 1);
        for (var v = 1; v <= n; v++) {
          var ok = true, k;
          for (k = 0; k < n && ok; k++) if (p[yy][k] === v || p[k][xx] === v) ok = false;
          var by = yy - yy % bh, bx = xx - xx % bw;
          for (k = 0; k < bh * bw && ok; k++) if (p[by + Math.floor(k / bw)][bx + k % bw] === v) ok = false;
          if (ok) { p[yy][xx] = v; go(i + 1); p[yy][xx] = 0; }
        }
      })(0);
      return c;
    }
    return { sol: sol, bh: bh, bw: bw, count: count };
  }
  A.sudoku = {
    title: "쉬운 숫자 퍼즐", opts: [],
    levels: ["쉬움: 4×4, 빈칸 5개", "보통: 4×4, 빈칸 8개", "어려움: 6×6"],
    make: function (r, st) {
      var n = st.level === 3 ? 6 : 4, holes = [0, 5, 8, 16][st.level], k = st.size === 2 ? 1 : 2, html = "", ans = "";
      for (var q = 0; q < k; q++) {
        var s = sudoku(r, n), p = s.sol.map(function (row) { return row.slice(); }), order = r.shuffle(Array.from({ length: n * n }, function (_, i) { return i; })), made = 0;
        for (var i = 0; i < order.length && made < holes; i++) {
          var yy = Math.floor(order[i] / n), xx = order[i] % n, keep = p[yy][xx]; p[yy][xx] = 0;
          if (s.count(p.map(function (row) { return row.slice(); }), 2) !== 1) p[yy][xx] = keep; else made++;
        }
        var cell = st.size === 2 ? (n === 4 ? 34 : 25) : (n === 4 ? 22 : 15);
        var grid = function (src, c, isAns) {
          return '<div class="hd-sdk" style="grid-template-columns:repeat(' + n + "," + c + "mm);font-size:" + (c * 0.6) + 'mm">' + src.map(function (row, yy) {
            return row.map(function (v, xx) {
              var cls = ((xx + 1) % s.bw === 0 && xx < n - 1 ? " vr" : "") + ((yy + 1) % s.bh === 0 && yy < n - 1 ? " hr" : "");
              return '<span class="' + cls + '" style="height:' + c + 'mm">' + (v || (isAns ? "" : "")) + "</span>";
            }).join("");
          }).join("") + "</div>";
        };
        html += '<div class="hd-sdk-wrap">' + (k > 1 ? "<p>퍼즐 " + (q + 1) + "</p>" : "") + grid(p, cell) + "</div>";
        ans += '<div class="ans-sdk">' + (k > 1 ? "퍼즐 " + (q + 1) : "") + grid(s.sol, 6, true) + "</div>";
      }
      return {
        title: "쉬운 숫자 퍼즐",
        guide: "가로줄, 세로줄, 굵은 선 네모 안에 1부터 " + n + "까지 숫자가 한 번씩만 들어가요. 빈칸을 채워 보세요.",
        html: html, answer: '<div class="ans-sdks">' + ans + "</div>"
      };
    }
  };

  // 12. 미로 찾기
  A.maze = {
    title: "미로 찾기", opts: [],
    levels: ["쉬움: 5×6 칸", "보통: 8×10 칸", "어려움: 11×14 칸"],
    make: function (r, st) {
      var C = [0, 5, 8, 11][st.level], R = [0, 6, 10, 14][st.level];
      var walls = [], seen = [], y, x;
      for (y = 0; y < R; y++) { walls.push([]); seen.push([]); for (x = 0; x < C; x++) { walls[y].push({ n: 1, e: 1, s: 1, w: 1 }); seen[y].push(0); } }
      var stack = [[0, 0]], prev = {}; seen[0][0] = 1;
      while (stack.length) {
        var cur = stack[stack.length - 1], cy = cur[0], cx = cur[1], nb = [];
        [[-1, 0, "n", "s"], [0, 1, "e", "w"], [1, 0, "s", "n"], [0, -1, "w", "e"]].forEach(function (d) {
          var ny = cy + d[0], nx = cx + d[1]; if (ny >= 0 && ny < R && nx >= 0 && nx < C && !seen[ny][nx]) nb.push([ny, nx, d[2], d[3]]);
        });
        if (!nb.length) { stack.pop(); continue; }
        var nx2 = r.pick(nb); walls[cy][cx][nx2[2]] = 0; walls[nx2[0]][nx2[1]][nx2[3]] = 0; seen[nx2[0]][nx2[1]] = 1; prev[nx2[0] + "," + nx2[1]] = cy + "," + cx; stack.push([nx2[0], nx2[1]]);
      }
      walls[0][0].w = 0; walls[R - 1][C - 1].e = 0;
      var path = [], k = (R - 1) + "," + (C - 1); while (k) { path.push(k.split(",").map(Number)); k = prev[k]; }
      var W = 160, cs = Math.min(W / C, 196 / R), w = cs * C, h = cs * R, sw = st.size === 2 ? 1.4 : 1.1;
      var svg = function (withPath, scale) {
        var s = '<svg viewBox="-14 -2 ' + (w + 28) + " " + (h + 4) + '" width="' + ((w + 28) * scale) + 'mm" height="' + ((h + 4) * scale) + 'mm"><g stroke="#000" stroke-width="' + sw + '" stroke-linecap="round">';
        for (var yy = 0; yy < R; yy++) for (var xx = 0; xx < C; xx++) {
          var c = walls[yy][xx], X = xx * cs, Y = yy * cs;
          if (c.n) s += '<line x1="' + X + '" y1="' + Y + '" x2="' + (X + cs) + '" y2="' + Y + '"/>';
          if (c.w) s += '<line x1="' + X + '" y1="' + Y + '" x2="' + X + '" y2="' + (Y + cs) + '"/>';
          if (yy === R - 1 && c.s) s += '<line x1="' + X + '" y1="' + (Y + cs) + '" x2="' + (X + cs) + '" y2="' + (Y + cs) + '"/>';
          if (xx === C - 1 && c.e) s += '<line x1="' + (X + cs) + '" y1="' + Y + '" x2="' + (X + cs) + '" y2="' + (Y + cs) + '"/>';
        }
        s += "</g>";
        if (withPath) s += '<polyline fill="none" stroke="#888" stroke-width="' + cs * 0.3 + '" stroke-linejoin="round" points="' + path.map(function (p) { return (p[1] * cs + cs / 2) + "," + (p[0] * cs + cs / 2); }).join(" ") + '"/>';
        s += '<text x="-7" y="' + (cs / 2 + 1.5) + '" text-anchor="middle" font-size="4.5" font-weight="700" font-family="Noto Sans KR,sans-serif">출발</text><text x="-7" y="' + (cs / 2 + 7) + '" text-anchor="middle" font-size="5">→</text>';
        s += '<text x="' + (w + 7) + '" y="' + (h - cs / 2 + 1.5) + '" text-anchor="middle" font-size="4.5" font-weight="700" font-family="Noto Sans KR,sans-serif">도착</text><text x="' + (w + 7) + '" y="' + (h - cs / 2 + 7) + '" text-anchor="middle" font-size="5">→</text>';
        return s + "</svg>";
      };
      return { title: "미로 찾기", guide: "출발에서 도착까지 벽에 닿지 않게 길을 따라 선을 그어 보세요.", html: '<div class="hd-maze">' + svg(false, 1) + "</div>", answer: svg(true, 0.4) };
    }
  };

  // ── 오늘의 활동지 세트 ────────────────────────────────────────
  var SET_POOL = ["addsub", "letterfind", "trail", "proverb", "clock", "chosung", "sudoku", "money", "fillnum", "wordsearch", "maze"];

  // ── 화면 ─────────────────────────────────────────────────────
  var root = $("hd-root"); if (!root) return;
  var ACT_ID = root.getAttribute("data-act");
  var isSet = ACT_ID === "set", act = A[ACT_ID];
  var KEY = "hd-common";
  var common = { level: 1, size: 2, pages: 1, name: true, center: "", answer: true };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "{}"); for (var sk in saved) if (sk in common) common[sk] = saved[sk]; } catch (e) { }
  var st = {}; for (var ck in common) st[ck] = common[ck];
  if (isSet) st.pages = 5;
  if (act) act.opts.forEach(function (o) { st[o[0]] = o[2][0][0]; });
  var today = new Date(); var seed = Math.floor(Math.random() * 1e9);
  if (isSet) seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  function seg(key, label, choices) {
    return '<div class="hd-field"><span class="hd-lab">' + label + '</span><div class="hd-seg" role="group" aria-label="' + label + '">' +
      choices.map(function (c) { return '<button type="button" data-k="' + key + '" data-v="' + c[0] + '"' + (String(st[key]) === String(c[0]) ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + ">" + c[1] + "</button>"; }).join("") + "</div></div>";
  }
  function controls() {
    var h = "";
    if (act) act.opts.forEach(function (o) { h += o[2].length > 4 ? selectField(o) : seg(o[0], o[1], o[2]); });
    h += seg("level", "난이도", [[1, "쉬움"], [2, "보통"], [3, "어려움"]]);
    if (act) h += '<p class="hd-note">' + act.levels[st.level - 1] + "</p>";
    h += seg("size", "글자 크기", [[1, "크게"], [2, "아주 크게"]]);
    h += seg("pages", isSet ? "장 수" : "몇 장", isSet ? [[3, "3장"], [5, "5장"], [10, "10장"]] : [[1, "1장"], [2, "2장"], [3, "3장"], [5, "5장"]]);
    if (!isSet && st.pages > 1) h += '<p class="hd-note">장마다 다른 문제가 나와요.</p>';
    h += '<div class="hd-field"><span class="hd-lab">넣을 것</span><div class="hd-checks"><label><input type="checkbox" data-c="name"' + (st.name ? " checked" : "") + "> 이름·날짜 칸</label><label><input type=\"checkbox\" data-c=\"answer\"" + (st.answer ? " checked" : "") + "> 정답지</label></div></div>";
    h += '<div class="hd-field"><label class="hd-lab" for="hd-center">기관 이름</label><input type="text" id="hd-center" maxlength="30" placeholder="예: 햇살 주간보호센터 (선택)" value="' + esc(st.center) + '"></div>';
    h += '<div class="hd-field"><label class="hd-lab" for="hd-date">날짜</label><input type="date" id="hd-date" value="' + ymd(today) + '"></div>';
    $("hd-controls").innerHTML = h;
  }
  function selectField(o) {
    return '<div class="hd-field"><label class="hd-lab" for="hd-o-' + o[0] + '">' + o[1] + '</label><select id="hd-o-' + o[0] + '" data-k="' + o[0] + '">' +
      o[2].map(function (c) { return '<option value="' + c[0] + '"' + (st[o[0]] === c[0] ? " selected" : "") + ">" + c[1] + "</option>"; }).join("") + "</select></div>";
  }
  function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function page(a, res, day) {
    var top = st.name ? '<div class="hd-top"><span>이름 <i class="hd-blank"></i></span>' + (st.center ? "<span>" + esc(st.center) + "</span>" : "") + (a.noDate ? "" : "<span>" + dateKo(day) + "</span>") + "</div>"
      : (st.center ? '<div class="hd-top"><span></span><span>' + esc(st.center) + "</span></div>" : "");
    return '<div class="paper hd-paper">' + top + '<h2 class="hd-title">' + res.title + '</h2><p class="hd-guide">' + res.guide + "</p>" + res.html + "</div>";
  }
  function draw() {
    var base = new Date($("hd-date") && $("hd-date").value ? $("hd-date").value + "T00:00:00" : today), html = "", answers = [];
    var ids = [];
    if (isSet) {
      var rs = RNG(seed), pool = rs.shuffle(SET_POOL);
      ids.push("today"); for (var i = 0; ids.length < st.pages; i++) ids.push(pool[i % pool.length]);
    } else for (var p = 0; p < st.pages; p++) ids.push(ACT_ID);
    ids.forEach(function (id, p) {
      var a = A[id], s2 = {}; for (var k in st) s2[k] = st[k];
      if (isSet || id !== ACT_ID) a.opts.forEach(function (o) { s2[o[0]] = o[2][0][0]; });
      var day = id === "today" && !isSet ? new Date(base.getTime() + p * 864e5) : base;
      var res = a.make(RNG(seed + p * 7919), s2, day);
      html += page(a, res, day);
      if (res.answer) answers.push('<div class="ans-item"><b>' + (ids.length > 1 ? (p + 1) + "장 · " : "") + res.title + "</b><div>" + res.answer + "</div></div>");
    });
    if (st.answer && answers.length) html += '<div class="paper hd-paper hd-answers"><h2 class="hd-title">정답</h2>' + answers.join("") + "</div>";
    $("hd-pages").innerHTML = html;
    splitAnswers();
    fit();
  }
  // 정답이 한 장을 넘으면 넘치는 항목을 다음 장으로 옮긴다
  function splitAnswers() {
    var guard = 0, pg = $("hd-pages").querySelector(".hd-answers:last-child");
    while (pg && pg.scrollHeight > pg.clientHeight + 1 && guard++ < 50) {
      var items = pg.querySelectorAll(".ans-item"); if (items.length < 2) break;
      var next = document.createElement("div"); next.className = "paper hd-paper hd-answers";
      next.innerHTML = '<h2 class="hd-title">정답 (이어서)</h2>';
      while (pg.scrollHeight > pg.clientHeight + 1 && pg.querySelectorAll(".ans-item").length > 1) {
        var last = pg.querySelectorAll(".ans-item"); next.insertBefore(last[last.length - 1], next.children[1] || null);
      }
      pg.parentNode.appendChild(next); pg = next;
    }
  }
  function fit() {
    var wrap = $("hd-preview"), sc = $("hd-scale"), first = $("hd-pages").firstElementChild; if (!first) return;
    var k = Math.min(1, (wrap.clientWidth - 32) / first.offsetWidth);
    sc.style.transform = "scale(" + k + ")"; sc.style.width = first.offsetWidth + "px"; sc.style.height = ($("hd-pages").offsetHeight * k) + "px";
  }
  function save() { var o = {}; for (var k in common) o[k] = st[k]; if (isSet) delete o.pages; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }

  controls(); draw();
  $("hd-controls").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]"); if (!b) return;
    var v = b.getAttribute("data-v"); st[b.getAttribute("data-k")] = /^\d+$/.test(v) ? +v : v;
    save(); controls(); draw();
  });
  $("hd-controls").addEventListener("change", function (e) {
    var t = e.target;
    if (t.getAttribute("data-c")) st[t.getAttribute("data-c")] = t.checked;
    else if (t.tagName === "SELECT") st[t.getAttribute("data-k")] = t.value;
    save(); draw();
  });
  $("hd-controls").addEventListener("input", function (e) { if (e.target.id === "hd-center") { st.center = e.target.value; save(); draw(); } });
  $("hd-new").addEventListener("click", function () { seed = Math.floor(Math.random() * 1e9); draw(); });
  $("hd-print").addEventListener("click", function () { window.print(); });
  window.addEventListener("resize", fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  window.HD_TEST = { A: A, st: st, draw: draw, setSeed: function (s) { seed = s; } };
})();
