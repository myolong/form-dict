#!/usr/bin/env python3
"""src/ 를 읽어 docs/ 에 정적 사이트(무료 양식 작성기)를 만든다.

사용법: python3 build.py   (GitHub Pages: main 브랜치 /docs 배포)

양식 하나 = src/forms/<slug>/ 폴더 하나
  form.json      제목·메뉴·순서·입력 칸(fields)·관련 양식 등
  template.html  A4 종이 모양. {{key}} 자리에 입력값이 들어감
                 필터: {{key|date}} 날짜, {{key|won}} 1,000, {{key|kor}} 한글 금액
                 계산값: {{items_rows}} {{sum_supply}} {{sum_vat}} {{sum_total}} {{approval_box}} {{schedule}}
                 조건: {{#key}}값 있을 때만{{/key}}  {{^key}}값 없을 때만{{/key}}
  guide.html     작성법 글 (h2/h3/ul 등 HTML)
메뉴 목록 = src/menus.json
"""
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

# ── 사이트 설정 (이름·도메인·애드센스가 정해지면 여기만 바꾸고 다시 빌드) ──────
SITE_URL = "https://formcunning.co.kr"
CUSTOM_DOMAIN = "formcunning.co.kr"
SITE_NAME = "양식컨닝"
SITE_TAGLINE = "업무 양식 컨닝페이퍼"
CONTACT_EMAIL = "salimdict.help@gmail.com"  # 문의 메일 (본업과 분리된 공용 주소)
ADSENSE_CLIENT = "ca-pub-5781805498180631"                       # 승인 후 "ca-pub-..." 입력 → 광고 스크립트·ads.txt 생성
GOOGLE_VERIFICATION = ""
NAVER_VERIFICATION = "c27abaacf7acf26970a9db7a4b149e927e392597"
UPDATED = date.today().isoformat()
PRIVACY_FROM = "2026-11-05"  # 개인정보처리방침 시행일 (방침을 바꿀 때만 고침)
# ───────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "docs"
BASE_PATH = re.sub(r"^https?://[^/]+", "", SITE_URL).rstrip("/")


def url(path):
    return BASE_PATH + path


def asset(path):
    """자산 주소에 내용 해시를 붙여, 수정 후 브라우저가 옛 파일을 쓰지 않게 한다."""
    import hashlib
    h = hashlib.md5((SRC / path.lstrip("/")).read_bytes()).hexdigest()[:8]
    return url(path) + "?v=" + h


def esc(text):
    return html.escape(str(text), quote=True)



LASTMOD = {}  # 경로 → 수정일 (사이트맵 lastmod)


def date_line(pub, mod):
    if pub == mod:
        return f'<p class="meta">작성 <time datetime="{pub}">{pub}</time></p>'
    return f'<p class="meta">작성 <time datetime="{pub}">{pub}</time> · 최종 수정 <time datetime="{mod}">{mod}</time></p>'


# ── 글별 날짜 (src/dates.json) ─────────────────────────────────────────
# 원본 파일 내용이 바뀐 날만 '수정일'이 바뀐다. 빌드할 때마다 모든 글이 오늘 날짜가 되지 않게 하려는 것.
# 처음 보는 파일은 git 기록(처음 커밋한 날 / 마지막 커밋한 날)으로 채운다.
DATES_FILE = SRC / "dates.json"
_dates = json.loads(DATES_FILE.read_text(encoding="utf-8")) if DATES_FILE.exists() else {}


def _git_dates(rel):
    import subprocess
    try:
        out = subprocess.run(["git", "log", "--follow", "--format=%cs", "--", rel], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.split()
        dirty = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", rel], cwd=ROOT).returncode != 0
    except Exception:
        return UPDATED, UPDATED
    if not out:
        return UPDATED, UPDATED
    return out[-1], (UPDATED if dirty else out[0])


def page_dates(*files):
    """원본 파일들의 (작성일, 수정일). 여러 파일이면 가장 이른 작성일, 가장 늦은 수정일."""
    import hashlib
    pubs, mods = [], []
    for f in files:
        f = Path(f)
        if not f.exists():
            continue
        rel = f.relative_to(ROOT).as_posix()
        h = hashlib.md5(f.read_bytes()).hexdigest()
        rec = _dates.get(rel)
        if rec is None:
            pub, mod = _git_dates(rel)
            rec = _dates[rel] = {"published": pub, "modified": mod, "hash": h}
        elif rec["hash"] != h:
            rec.update(modified=UPDATED, hash=h)
        pubs.append(rec["published"])
        mods.append(rec["modified"])
    if not mods:
        return UPDATED, UPDATED
    return min(pubs), max(mods)


def save_dates():
    DATES_FILE.write_text(json.dumps(dict(sorted(_dates.items())), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


# ── 자주 묻는 질문 → FAQPage 구조화 데이터 ────────────────────────────────
def faq_ld(body):
    """본문의 <h2>자주 묻는 질문</h2> 아래 h3(질문)·다음 내용(답)을 FAQPage로 만든다."""
    m = re.search(r"<h2[^>]*>\s*자주 묻는 질문\s*</h2>(.*?)(?=<h2|\Z)", body, re.S)
    if not m:
        return None
    pairs = re.findall(r"<h3[^>]*>(.*?)</h3>(.*?)(?=<h3|\Z)", m.group(1), re.S)

    def text(s):
        return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s))).strip()

    qa = [{"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
          for q, a in pairs if text(q) and text(a)]
    return {"@type": "FAQPage", "mainEntity": qa} if qa else None


# ── 관련 공식 자료 (출처 링크) ─────────────────────────────────────────────────────
def sources_html(sources):
    """sources: [(이름, 주소), ...] → 출처 목록 HTML."""
    if not sources:
        return ""
    lis = "".join(
        f'<li><a href="{esc(u)}" target="_blank" rel="noopener">{esc(n)}</a></li>' for n, u in sources
    )
    return f'<section class="sources"><h2>관련 공식 자료</h2><ul>{lis}</ul></section>'


def parse_sources(value):
    """앞머리 한 줄 'sources: 이름 | 주소 ; 이름 | 주소' 를 목록으로."""
    out = []
    for part in (value or "").split(";"):
        if "|" in part:
            n, u = part.split("|", 1)
            out.append((n.strip(), u.strip()))
    return out


# 컨닝 시리즈 (푸터 한 줄)
SERIES = [
    ("살림컨닝", "https://salimdict.com"),
    ("첫직장컨닝", "https://firstjobdict.co.kr"),
    ("양식컨닝", "https://formcunning.co.kr"),
]


def series_line():
    parts = []
    for name, href in SERIES:
        if name == SITE_NAME:
            parts.append(f'<strong class="current" aria-current="page">{esc(name)}</strong>')
        else:
            parts.append(f'<a href="{href}/">{esc(name)}</a>')
    return '<p class="series-links">컨닝 시리즈: ' + " · ".join(parts) + "</p>"

def read_forms():
    forms = []
    for d in sorted((SRC / "forms").iterdir()):
        if not (d / "form.json").exists():
            continue
        f = json.loads((d / "form.json").read_text(encoding="utf-8"))
        f["slug"] = d.name
        f["path"] = f"/{d.name}/"
        f["template"] = (d / "template.html").read_text(encoding="utf-8")
        g = d / "guide.html"
        f["guide"] = g.read_text(encoding="utf-8").replace('href="/', f'href="{BASE_PATH}/') if g.exists() else ""
        forms.append(f)
    return sorted(forms, key=lambda f: f["order"])


def layout(*, title, description, path, body, menus, active=None, json_ld=None, page_title=None, scripts="", noindex=False):
    canonical = SITE_URL + path
    full_title = page_title or f"{title} | {SITE_NAME}"
    head = []
    if noindex:
        head.append('<meta name="robots" content="noindex">')
    if GOOGLE_VERIFICATION:
        head.append(f'<meta name="google-site-verification" content="{esc(GOOGLE_VERIFICATION)}">')
    if NAVER_VERIFICATION:
        head.append(f'<meta name="naver-site-verification" content="{esc(NAVER_VERIFICATION)}">')
    if ADSENSE_CLIENT:
        head.append(f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={esc(ADSENSE_CLIENT)}" crossorigin="anonymous"></script>')
    for ld in (json_ld or []):
        head.append('<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + "</script>")
    nav = "".join(
        f'<a href="{url("/" + m["id"] + "/")}"{" aria-current=\"page\"" if active == m["id"] else ""}>{esc(m["short"])}</a>'
        for m in menus
    )
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full_title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(SITE_NAME)}">
<meta property="og:title" content="{esc(full_title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:locale" content="ko_KR">
<meta property="og:image" content="{SITE_URL}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(SITE_NAME)} - {esc(SITE_TAGLINE)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fffdf6">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@400;600;800&display=swap">
<link rel="icon" href="{url('/favicon.ico') + '?v=2'}" sizes="48x48">
<link rel="icon" href="{url('/assets/favicon.svg') + '?v=2'}" type="image/svg+xml">
<link rel="apple-touch-icon" href="{url('/assets/apple-touch-icon.png') + '?v=2'}">
<link rel="alternate" type="application/rss+xml" title="{esc(SITE_NAME)}" href="{url('/rss.xml')}">
<link rel="stylesheet" href="{asset('/assets/style.css')}">
{chr(10).join(head)}
</head>
<body>
<header class="site-header">
  <div class="wrap">
    <div class="top"><a class="logo" href="{url('/')}"><img src="{url('/assets/favicon.svg') + '?v=2'}" alt="" width="30" height="30">{esc(SITE_NAME)}</a><span class="tagline">{esc(SITE_TAGLINE)}</span></div>
    <nav class="menu" aria-label="메뉴">{nav}</nav>
  </div>
</header>
<main class="wrap">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>이 사이트의 양식과 설명은 일반적인 참고용입니다. 회사·기관·관공서에 정해진 양식이 있으면 그 양식을 우선 사용하고, 법률 문제는 전문가 상담을 받으세요. 입력한 내용은 서버로 전송·저장되지 않습니다.</p>
    <p><a href="{url('/about/')}">사이트 소개</a> · <a href="{url('/terms/')}">이용 안내</a> · <a href="{url('/privacy/')}">개인정보처리방침</a> · <a href="{url('/contact/')}">문의</a></p>
    {series_line()}
    <p>© {date.today().year} {esc(SITE_NAME)}</p>
  </div>
</footer>
{scripts}
</body>
</html>
"""


def write(path, content):
    target = OUT / path.lstrip("/")
    if path.endswith("/"):
        target = target / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def cards(forms):
    return "\n".join(
        f'<li data-name="{esc(f["title"] + " " + " ".join(f.get("aka", [])))}"><a href="{url(f["path"])}"><strong>{esc(f["title"])}</strong><span>{esc(f["card"])}</span></a></li>'
        for f in forms
    )


AD = '<div class="ad-slot"></div>'


def form_page(f, forms, menus):
    menu = next(m for m in menus if m["id"] == f["menu"])
    d = SRC / "forms" / f["slug"]
    pub, mod = page_dates(d / "form.json", d / "template.html", d / "guide.html")
    LASTMOD[f["path"]] = mod
    by_slug = {x["slug"]: x for x in forms}
    related = [by_slug[s] for s in f.get("related", []) if s in by_slug]
    cfg = {k: f[k] for k in ("slug", "fields", "template") if k in f}
    for k in ("has_items", "min_rows", "approval_default", "simple_items", "vat_default"):
        if k in f:
            cfg[k] = f[k]
    blank_only = f.get("blank_only", False)
    buttons = (
        '<button type="button" class="btn primary" id="btn-print">빈 서식 인쇄 · PDF 저장</button>'
        if blank_only else
        '<button type="button" class="btn primary" id="btn-print">인쇄 · PDF 저장</button>'
        '<button type="button" class="btn" id="btn-blank">빈 양식 인쇄</button>'
        '<button type="button" class="btn" id="btn-clear">입력 지우기</button>'
    )
    notice = f'<div class="notice">{f["notice"].replace("href=\"/", "href=\"" + BASE_PATH + "/")}</div>' if f.get("notice") else ""
    faq = f.get("faq", [])
    faq_html = ""
    if faq:
        faq_html = '<h2>자주 묻는 질문</h2><div class="faq">' + "".join(
            f"<details><summary>{esc(q)}</summary><p>{a}</p></details>" for q, a in faq) + "</div>"
    rel_html = ""
    if related:
        rel_html = f'<section class="related"><h2>함께 많이 찾는 양식</h2><ul class="cards">{cards(related)}</ul></section>'
    panel = (
        f'<p class="saved-note">아래 칸은 비워 두고 <b>빈 서식 인쇄</b>를 누른 뒤 손으로 써 주세요.</p>'
        if blank_only else
        f'<p class="saved-note" id="saved-note">입력 내용은 서버로 보내지 않고 이 브라우저에만 임시 저장됩니다.</p><div id="form-fields"></div>'
    )
    if blank_only:
        panel += '<div id="form-fields" hidden></div><span id="saved-note" hidden></span>'
    body = f"""
<div class="crumbs"><a href="{url('/')}">홈</a> › <a href="{url('/' + menu['id'] + '/')}">{esc(menu['title'])}</a></div>
<h1>{esc(f['h1'])}</h1>
<p class="lead">{esc(f['lead'])}</p>
{date_line(pub, mod)}
{notice}
<div class="form-layout">
  <section class="panel form-panel" aria-label="입력">
    <div class="actions">{buttons}</div>
    {panel}
  </section>
  <section aria-label="A4 미리보기">
    <div class="preview-wrap" id="preview-wrap"><div class="preview-scale" id="preview-scale"><div class="paper" id="paper"></div></div></div>
  </section>
</div>
{AD}
<article class="article">
{f['guide']}
{faq_html}
{sources_html(f.get("sources", []))}
</article>
{rel_html}
"""
    lds = [{
        "@context": "https://schema.org", "@type": "WebApplication", "name": f["h1"],
        "applicationCategory": "BusinessApplication", "operatingSystem": "Web",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "KRW"},
        "url": SITE_URL + f["path"], "description": f["description"], "inLanguage": "ko",
        "datePublished": pub, "dateModified": mod,
        "publisher": {"@type": "Organization", "name": SITE_NAME, "url": SITE_URL + "/"}}]
    if faq:
        lds.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub("<[^>]+>", "", a)}} for q, a in faq]})
    scripts = ("<script>window.FORM=" + json.dumps(cfg, ensure_ascii=False).replace("</", "<\\/") + ";</script>"
               f'<script src="{asset("/assets/form.js")}"></script>')
    write(f["path"], layout(title=f["seo_title"], page_title=f'{f["seo_title"]} | {SITE_NAME}', description=f["description"],
                            path=f["path"], body=body, menus=menus, active=f["menu"], json_ld=lds, scripts=scripts))


def static_page(path, title, description, inner, menus, noindex=False):
    write(path, layout(title=title, description=description, path=path, menus=menus, noindex=noindex,
                       body=f'<article class="article" style="margin-top:0"><h1 style="margin-top:20px">{esc(title)}</h1>{inner}</article>'))


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(SRC / "assets", OUT / "assets")
    shutil.copy(SRC / "assets" / "favicon.ico", OUT / "favicon.ico")  # 검색엔진이 찾는 기본 위치
    (OUT / ".nojekyll").write_text("")
    menus = json.loads((SRC / "menus.json").read_text(encoding="utf-8"))
    forms = read_forms()

    for f in forms:
        form_page(f, forms, menus)

    # 메뉴 페이지
    for m in menus:
        fs = [f for f in forms if f["menu"] == m["id"]]
        LASTMOD[f"/{m['id']}/"] = max([LASTMOD[f["path"]] for f in fs], default=UPDATED)
        body = f"""<div class="crumbs"><a href="{url('/')}">홈</a></div>
<h1>{esc(m['title'])} 양식</h1>
<p class="lead">{esc(m['card'])}. 칸만 채우면 A4 한 장으로 완성되고, 바로 인쇄하거나 PDF로 저장할 수 있어요.</p>
<ul class="cards">{cards(fs)}</ul>"""
        write(f"/{m['id']}/", layout(title=f"{m['title']} 양식 모음", description=f"{m['card']} 무료 양식. 회원가입·다운로드 없이 칸만 채우면 바로 인쇄·PDF 저장.",
                                     path=f"/{m['id']}/", body=body, menus=menus, active=m["id"]))

    # 홈
    blocks = ""
    for m in menus:
        fs = [f for f in forms if f["menu"] == m["id"]]
        blocks += f'<section class="section-block"><h2><a href="{url("/" + m["id"] + "/")}" style="color:inherit;text-decoration:none">{esc(m["title"])}</a></h2><ul class="cards">{cards(fs)}</ul></section>'
    home = f"""<section class="hero">
<h1>필요한 양식, 칸만 채우면 바로 완성</h1>
<p class="lead" style="margin:0">사직서·차용증·위임장·견적서 같은 자주 쓰는 문서를 브라우저에서 바로 작성하고 A4로 인쇄하거나 PDF로 저장하세요.</p>
<div class="badges"><span>회원가입 없음</span><span>파일 다운로드 없음</span><span>입력 내용 서버 저장 안 함</span><span>합계·한글 금액 자동</span></div>
<input class="search" id="q" type="search" placeholder="어떤 양식을 찾으세요? 예: 사직서, 견적서" aria-label="양식 검색">
</section>
{blocks}
{AD}"""
    write("/", layout(title=SITE_NAME, page_title=f"{SITE_NAME} - {SITE_TAGLINE}",
                      description="사직서, 차용증, 위임장, 재직증명서, 견적서, 거래명세서 등 자주 쓰는 문서 양식을 회원가입·다운로드 없이 바로 작성하고 인쇄·PDF 저장하는 무료 사이트.",
                      path="/", body=home, menus=menus, scripts=f'<script src="{asset("/assets/home.js")}"></script>',
                      json_ld=[{"@context": "https://schema.org", "@type": "WebSite", "name": SITE_NAME, "url": SITE_URL + "/"}]))

    # 안내 페이지
    static_page("/about/", "사이트 소개", f"{SITE_NAME} 소개", f"""
<p>{esc(SITE_NAME)}은 자주 쓰는 문서 양식을 <b>회원가입이나 파일 다운로드 없이</b> 브라우저에서 바로 작성할 수 있게 만든 무료 사이트입니다.</p>
<ul>
<li>칸을 채우면 오른쪽 A4 미리보기에 바로 반영됩니다.</li>
<li>[인쇄 · PDF 저장]을 누르면 A4 한 장으로 인쇄되고, 인쇄 창에서 'PDF로 저장'을 고르면 파일로 저장됩니다.</li>
<li>견적서·거래명세서는 합계와 부가세, 한글 금액(일금 ○○원정)을 자동으로 계산합니다.</li>
<li>입력한 내용은 서버로 전송되지 않고, 사용하는 브라우저에만 임시 저장됩니다.</li>
</ul>
<p>양식과 작성법은 일반적인 참고용입니다. 회사·기관에 정해진 양식이 있으면 그 양식을 우선 사용해 주세요.</p>
""", menus)
    static_page("/terms/", "이용 안내", "양식 이용 안내와 책임의 한계", """
<h2>양식의 성격</h2>
<p>이 사이트의 양식과 작성법, 자주 묻는 질문은 일반적으로 쓰이는 형식을 정리한 참고 자료입니다. 특정 상황에서의 법적 효력이나 유불리를 보장하지 않습니다.</p>
<h2>정해진 양식이 있는 경우</h2>
<p>회사·관공서·금융기관 등이 별도 서식을 정해 둔 경우에는 그 서식을 써야 합니다. 예를 들어 인감증명서 발급 위임장은 법령에 정해진 서식이 있고 위임자가 직접 손으로 써야 합니다.</p>
<h2>계산 기능</h2>
<p>합계·부가세·상환 일정 등 자동 계산은 입력값을 단순 계산한 결과입니다. 원 단위 미만 반올림 방식 등은 실제 거래 관행과 다를 수 있으니 최종 금액은 직접 확인해 주세요.</p>
<h2>법률 문제</h2>
<p>금전 거래, 퇴사, 징계 등으로 분쟁이 생겼거나 생길 우려가 있으면 대한법률구조공단(국번 없이 132) 등 전문 기관의 상담을 받으세요.</p>""", menus)
    static_page("/privacy/", "개인정보처리방침", "개인정보처리방침", f"""
<p>{esc(SITE_NAME)}(이하 '사이트')은 이용자의 개인정보를 수집하지 않는 것을 원칙으로 합니다.</p>
<h2>1. 양식에 입력한 내용</h2>
<p>양식에 입력한 이름, 주소, 금액 등은 서버로 전송되지 않습니다. 다시 방문했을 때 이어서 쓸 수 있도록 이용자 기기의 브라우저 저장소(localStorage)에만 저장되며, 각 양식의 [입력 지우기] 버튼이나 브라우저의 사이트 데이터 삭제로 언제든 지울 수 있습니다. 공용 PC에서는 사용 후 꼭 [입력 지우기]를 눌러 주세요.</p>
<h2>2. 광고와 쿠키</h2>
<p>사이트는 Google 애드센스 광고를 게재할 수 있습니다. Google 등 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이전 방문 기록을 바탕으로 광고를 제공할 수 있습니다. 이용자는 <a href="https://adssettings.google.com" rel="noopener">Google 광고 설정</a>에서 맞춤 광고를 끌 수 있습니다.</p>
<h2>3. 방문 통계</h2>
<p>검색엔진(구글 서치 콘솔, 네이버 서치어드바이저)이 제공하는 검색 유입 통계를 볼 수 있으나, 이를 통해 개인을 식별하지 않습니다.</p>
<h2>4. 문의</h2>
<p>개인정보 관련 문의: {esc(CONTACT_EMAIL)}</p>
<p>시행일: {PRIVACY_FROM}</p>""", menus)
    static_page("/contact/", "문의", "문의하기", f"""
<p>양식 오류 제보, 추가해 줬으면 하는 양식, 기타 문의는 아래 메일로 보내 주세요.</p>
<p><a href="mailto:{esc(CONTACT_EMAIL)}">{esc(CONTACT_EMAIL)}</a></p>
<p>개별 법률·노무 상담은 답변드리기 어렵습니다.</p>""", menus)
    write("/404.html", layout(title="페이지를 찾을 수 없어요", description="페이지를 찾을 수 없습니다", path="/404.html", menus=menus, noindex=True,
                             body=f'<h1>페이지를 찾을 수 없어요</h1><p><a href="{url("/")}">홈으로 가서 양식 찾기</a></p>'))

    # sitemap / robots / CNAME / ads.txt
    paths = ["/"] + [f"/{m['id']}/" for m in menus] + [f["path"] for f in forms] + ["/about/", "/terms/", "/privacy/", "/contact/"]
    sm = "".join(f"<url><loc>{esc(SITE_URL + p)}</loc><lastmod>{LASTMOD.get(p, max(LASTMOD.values(), default=UPDATED))}</lastmod></url>" for p in paths)
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>\n', encoding="utf-8")
    items = "".join(
        f"<item><title>{esc(f['seo_title'])}</title><link>{esc(SITE_URL + f['path'])}</link>"
        f"<guid>{esc(SITE_URL + f['path'])}</guid><description>{esc(f['description'])}</description></item>"
        for f in forms)
    (OUT / "rss.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>{esc(SITE_NAME)}</title>'
        f"<link>{esc(SITE_URL)}/</link><description>{esc(SITE_TAGLINE)}</description><language>ko</language>"
        f"{items}</channel></rss>\n", encoding="utf-8")
    save_dates()
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    if CUSTOM_DOMAIN:
        (OUT / "CNAME").write_text(CUSTOM_DOMAIN + "\n")
    if ADSENSE_CLIENT:
        (OUT / "ads.txt").write_text(f"google.com, {ADSENSE_CLIENT.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n")
    print(f"built {len(forms)} forms, {len(paths)} pages → {OUT}")


if __name__ == "__main__":
    main()
