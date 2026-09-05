# SolidEdit

이미지·표·코드·수식을 넣어 글, 회의록, 연구 노트를 작성하세요. JavaScript 파일 하나로 웹페이지의 textarea에 편집기를 붙일 수 있습니다.

[English](README.md) · [Statground에서 직접 사용하기](https://testgo.statground.net/toolbox/solid-edit/)

## 작업에 맞는 크기를 고르세요

**0.0.4**에서는 겹겹이 둘러싸던 툴바 테두리를 정리하고, 얇은 구분선과 읽기 쉬운 버튼으로 디자인을 바꿨습니다. 두 모드 모두 편집 도구를 처음부터 표시합니다.

| | Full | Mini |
|---|---|---|
| 알맞은 용도 | 글과 문서 작성 | 댓글과 짧은 메모 |
| 버튼 / 아이콘 | 36px / 20px | 28px / 16px |
| 입력 공간 | 문서 길이에 따라 확장 | 작은 영역 안에서 스크롤 |
| 도구와 저장 HTML | 동일 | 동일 |

모드에 따라 문서 형식이 바뀌지 않습니다. 좁은 화면에서는 도구가 다음 줄로 이어집니다.

![Full 편집기](docs/images/basic-layout.png)

## 편집기 붙이기

아래 코드를 HTML 페이지에 넣으세요. CDN 주소는 확인한 0.0.4 릴리스 커밋으로 고정되어 있습니다.

```html
<textarea id="content"><h2>첫 번째 문서</h2><p>여기서 시작하세요.</p></textarea>
<script>
  window.CONTENT_EDITOR_AUTOSTART = false;
  window.CONTENT_EDITOR_AUTOINIT = false;
</script>
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@ba2b1a6097fa2c677d9a51499a9a5e332afe4fb5/versions/0.0.4/editor.js"></script>
<script>
  const editor = window.mountContentEditor("#content", {
    lang: "ko",
    toolbarSize: "full",
    restoreDraft: false,
    storageKey: "my-document-draft"
  });
</script>
```

댓글에는 `toolbarSize: "mini"`를 사용하세요. Mini의 기본 입력 높이는 최소 160px, 최대 320px입니다. Full은 320px에서 시작해 내용에 따라 커집니다. 숫자형 `minHeight`, `maxHeight` 옵션으로 입력 높이를 조절할 수 있습니다.

```js
const comment = window.mountContentEditor("#comment", {
  toolbarSize: "mini",
  placeholder: "댓글을 남겨 주세요…",
  minHeight: 160,
  maxHeight: 320,
  storageKey: "my-comment-draft"
});
```

[Full/Mini 전체 예제](examples/cdn-basic/index.html)를 로컬 웹 서버에서 열면 두 모드를 직접 비교할 수 있습니다. 저장소의 예제는 함께 포함된 릴리스 파일을 읽습니다. script 주소를 고정된 CDN 주소로 바꿔 사용할 수도 있습니다.

## 어떤 문서를 만들 수 있나요?

- **글 꾸미기:** 제목, 굵게, 기울임, 밑줄, 취소선, 인라인 코드, 글자색, 형광펜.
- **구조 잡기:** 문단, 인용, 목록, 체크리스트, 정렬, 구분선.
- **이미지:** 파일을 올리거나 붙여넣고, 끌어다 놓으세요. 이미지의 크기와 설명을 조절할 수 있습니다.
- **표:** 표를 넣고 선택해 행·열과 설명을 수정하세요.
- **코드:** 언어를 선택하면 원본 코드와 함께 색상이 적용된 결과를 보관합니다.
- **수식:** 인라인 또는 블록 LaTeX를 입력하세요. 원본 수식은 나중에 다시 수정할 수 있습니다.
- **Markdown:** 원문을 확인하거나 수정하고, 분할 화면으로 작성하세요.

이미지·표·코드·수식을 선택하면 해당 요소의 설정이 열립니다. 도구 위에 마우스를 올리면 이름을 볼 수 있고, 키보드로 이동할 때도 현재 버튼을 구분할 수 있습니다.

## 내용 읽기·바꾸기·편집기 제거

```js
const html = editor.getHTML();           // 꾸민 문서 저장
const markdown = editor.getMarkdown(); // Markdown으로 내보내기
editor.setHTML("<h2>수정한 제목</h2><p>계속 작성하세요.</p>");
window.destroyLocalRichEditor(editor); // 호스트를 제거하기 전에 편집기 해제
```

HTML은 풍부한 서식을 유지합니다. Markdown은 이미지 크기, 글자색, 표 스타일 같은 시각 속성을 모두 표현하지 못합니다.

임시 저장은 브라우저 저장소를 사용합니다. 문서마다 다른 `storageKey`를 지정하세요. `restoreDraft: false`는 처음에 전달한 내용으로 시작하는 옵션이며, 이후 임시 저장을 끄지는 않습니다. 사용자가 제출할 때 `getHTML()` 결과를 애플리케이션에서 저장하세요.

## 코드와 수식 표시

SolidEdit은 Highlight.js와 MathJax를 지원합니다. 애플리케이션이 의존 파일을 관리한다면 편집기를 불러오기 전에 주소를 지정하세요.

```js
window.CONTENT_EDITOR_ENABLE_CODEBLOCK = true;
window.CONTENT_EDITOR_HLJS_SCRIPT_SRC = "YOUR_PINNED_HIGHLIGHT_JS_URL";
window.CONTENT_EDITOR_HLJS_STYLE_HREF = "YOUR_PINNED_HIGHLIGHT_CSS_URL";
window.CONTENT_EDITOR_MATHJAX_CDN_URL = "YOUR_PINNED_MATHJAX_TEX_SVG_URL";
```

Content Security Policy를 사용하는 페이지에서는 해당 자산과 이미지 data URL을 허용해야 합니다. [Statground의 전체 HTML 예제](https://testgo.statground.net/toolbox/solid-edit/#setup)에서 고정된 렌더러 설정까지 확인할 수 있습니다. 코드와 수식의 원본은 문서에 남습니다.

## 파일과 호환성

- `versions/0.0.4/editor.js`: 현재 릴리스 파일.
- `latest/editor.js`: 릴리스 시점에는 같은 파일이며, 개발 중 내용이 바뀝니다.
- `versions/0.0.3/editor.js`: 변경 없이 보관한 이전 릴리스.
- `tests/`: Node 계약 테스트와 브라우저 확인 페이지.

서비스에서는 커밋 SHA를 고정하고, `latest/`는 개발에 사용하세요. 공개 API는 `mountContentEditor`, `initContentEditor`, `CONTENT_EDITOR_*` 전역 설정입니다. 기존 `STATKISS_*` 이름도 호환성을 유지합니다.

MIT · Statground
