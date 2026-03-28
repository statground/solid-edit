# SolidEdit

> 단일 HTML 파일로 바로 실행할 수 있는, 오프라인 우선 리치 텍스트 에디터

---

## 🌐 Language

- [English README 보기](./README.md)
- 한국어 (이 파일)

---

## 개요

**SolidEdit**는 브라우저에서 최소한의 준비만으로 바로 실행할 수 있도록 설계된 오프라인 우선 리치 텍스트 에디터입니다.

이 프로젝트는 다음과 같은 실행 철학을 바탕으로 합니다.

- 가능한 한 로컬에서 바로 열기
- 가능하면 서버 없이 실행하기
- 불필요한 외부 의존 줄이기
- 동작을 안정적이고 예측 가능하게 유지하기
- 데모성 화려함보다 실제 편집 신뢰성을 우선하기

즉, SolidEdit는 `file://` 환경을 포함해 “바로 열어서 실제로 쓸 수 있는 편집기”를 목표로 합니다.

---

## 핵심 원칙

- **오프라인 우선**
- **단순한 구조**
- **낮은 의존성**
- **안정적인 편집 동작**
- **예측 가능한 초기화**
- **회귀 방지 중심 개발**

---

## 주요 기능

### 리치 텍스트 편집
- 굵게, 기울임, 밑줄, 취소선
- 문단 및 제목
- 인용문
- 순서 목록, 비순서 목록, 체크리스트
- 인라인 코드
- 링크 삽입
- 서식 제거
- 글자색 및 배경색
- 구분선

### Markdown
- Markdown 패널 토글
- Markdown 적용
- WYSIWYG와 Markdown 동기화
- Split View 지원

### 수식
- 인라인 및 블록 LaTeX 지원
- 초기 로드 시 렌더
- 원본 수식 데이터 보존

### 코드 블록
- 언어 선택
- 문법 하이라이트
- 원본 코드 보존
- 편집 후 재하이라이트

### 이미지
- 붙여넣기, 업로드, 드래그 앤 드롭
- Base64 삽입
- 압축 처리
- 기본 정렬 제어

### 표
- 그리드 기반 표 선택기
- alert/prompt 없는 삽입
- Inspector 기반 제어

### Inspector
- 문맥 인식형 제어 UI
- 기본적으로 최소 상태 유지
- 선택한 노드와 관련된 섹션만 표시

### 저장
- 자동 저장
- 스냅샷/버전 기록
- 로컬 스토리지 기반 복구

---

## Repository 구조

권장하는 repository 구조는 다음과 같습니다.

```text
solid-edit/
├── index.html
├── README.md
├── README.ko.md
├── latest/
│   └── editor.js
└── versions/
    └── 0.0.1/
        └── editor.js
```

### 왜 `versions/` 폴더인가?

고정 버전 빌드나 이전 버전을 모아두는 폴더명으로는 **`versions`**를 추천합니다.

루트에 버전 폴더를 여러 개 흩뿌리는 것보다 의미가 명확하고, 구조도 더 깔끔하게 유지됩니다.

- `latest/` → 현재 최신 사용 예시용 빌드
- `versions/0.0.1/` → 고정된 과거 버전 또는 버전별 접근용 빌드

---

## 설치 방법

### 1. 로컬 사용

필요한 파일을 내려받은 뒤 HTML 파일을 직접 열면 됩니다.

예시 로컬 구조:

```text
index.html
latest/editor.js
```

그 다음 아래처럼 열면 됩니다.

```text
file:///path/to/index.html
```

---

### 2. jsDelivr CDN

실제 에디터 파일이 폴더 안에 들어 있으므로, CDN 경로에도 그 폴더 경로가 반드시 포함되어야 합니다.

#### 최신 빌드

```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js"></script>
```

#### 0.0.1 버전 빌드

```html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.1/editor.js"></script>
```

---

## CDN 버전 전략 메모

jsDelivr로 SolidEdit를 제공하는 방식은 실무적으로 두 가지가 있습니다.

### A. branch 기반 경로
repository를 계속 수정하는 동안 쓰기 좋습니다.

```html
https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js
https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.1/editor.js
```

### B. tag 기반 경로
안정적인 문서 배포나 실제 서비스 임베드에는 이 방식을 더 권장합니다.

Git tag 이름이 `0.0.1`이면:

```html
https://cdn.jsdelivr.net/gh/statground/solid-edit@0.0.1/versions/0.0.1/editor.js
```

Git tag 이름이 `v0.0.1`이면:

```html
https://cdn.jsdelivr.net/gh/statground/solid-edit@v0.0.1/versions/0.0.1/editor.js
```

### 추천

- 계속 바뀌는 예제는 `@main/latest/editor.js`
- 문서용 고정 예제나 서비스 적용은 tag 기반 CDN 경로

---

## HTML 예시

### 최신 빌드 예시

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SolidEdit - Latest</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    #app { height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/latest/editor.js"></script>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      if (!window.SolidEdit || typeof window.SolidEdit.init !== "function") {
        console.error("SolidEdit failed to load.");
        return;
      }

      window.SolidEdit.init({
        container: "#app"
      });
    });
  </script>
</body>
</html>
```

### 0.0.1 버전 예시

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SolidEdit - 0.0.1</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    #app { height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>

  <script src="https://cdn.jsdelivr.net/gh/statground/solid-edit@main/versions/0.0.1/editor.js"></script>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      if (!window.SolidEdit || typeof window.SolidEdit.init !== "function") {
        console.error("SolidEdit failed to load.");
        return;
      }

      window.SolidEdit.init({
        container: "#app"
      });
    });
  </script>
</body>
</html>
```

---

## 초기화 계약

CDN 방식이 제대로 동작하려면 에디터 번들이 최소한 아래와 같이 전역 객체를 노출해야 합니다.

```javascript
window.SolidEdit = SolidEdit;
```

그리고 아래와 같은 초기화 진입점이 있어야 합니다.

```javascript
SolidEdit.init({
  container: "#app"
});
```

전역 노출이 없으면 파일 자체는 로드되어도 브라우저에서는 `SolidEdit`를 찾지 못합니다.

---

## 기여

기여는 환영하지만, 변경 시 아래 방향을 지켜야 합니다.

- 불필요한 외부 의존 추가 지양
- 로컬 실행 가능성 유지
- 에디터 데이터 무결성 보존
- 회귀 최소화
- 시각적 과장보다 동작 신뢰성 우선

---

## 라이선스

MIT

---

## 제작

**Statground**
