# 양식컨닝

칸만 채우면 A4 양식이 완성되는 무료 문서 양식 사이트 (정적 사이트, GitHub Pages /docs 배포).

- `python3 build.py` → `src/` 를 읽어 `docs/` 생성
- 사이트 설정(이름·도메인·애드센스·검색엔진 인증): `build.py` 맨 위
- 양식 하나 = `src/forms/<slug>/` (form.json 입력 칸 / template.html A4 모양 / guide.html 작성법)
- 공통 작성기 `src/assets/form.js`: 미리보기, 브라우저 임시 저장, 인쇄, 합계·부가세·한글 금액, 결재란, 차용증 분할 상환표
- 입력 내용은 서버로 보내지 않음 (localStorage만 사용)
- 운영 원칙: 세무 설명 금지(차용증 포함), 운영자 실명·본업 비공개
