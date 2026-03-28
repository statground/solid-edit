# SolidEdit

> A reliable, offline-first rich text editor that runs directly from a
> single HTML file.

------------------------------------------------------------------------

## 🌐 Language

-   [English](#english)
-   [한국어](#korean)

------------------------------------------------------------------------

`<a id="english">`{=html}`</a>`{=html} \# 🇺🇸 English

## ✨ Overview

SolidEdit is a lightweight yet powerful rich text editor designed to
work fully offline.

It runs directly from your local environment (`file://`) without
requiring: - build tools - external dependencies - server setup

This project prioritizes **stability, predictability, and real
usability** over flashy features.

------------------------------------------------------------------------

## 🎯 Philosophy

-   Offline-first
-   Single HTML + JS execution
-   No external dependency
-   Deterministic behavior
-   Regression-resistant design

------------------------------------------------------------------------

## 🚀 Features

### ✍️ Rich Text

-   Bold, Italic, Underline, Strike
-   Headings (H1\~H3)
-   Blockquote
-   Lists (Ordered, Unordered, Checklist)
-   Inline code, links
-   Text color / background color
-   Horizontal rule

### 🧾 Markdown

-   Toggle panel
-   Apply Markdown
-   Sync with WYSIWYG
-   Split view

### 🧮 Math (LaTeX)

-   Inline / block support
-   Render on load
-   Data preserved

### 💻 Code Blocks

-   Language selection
-   Syntax highlighting
-   Raw code protection

### 🖼️ Images

-   Paste / drag / upload
-   Base64 embed
-   Compression

### 📊 Tables

-   Grid picker UI
-   Inspector control

### 🔍 Inspector

-   Context-aware UI
-   Minimal display

### 💾 Persistence

-   Auto-save
-   Snapshots

------------------------------------------------------------------------

## 📦 Installation

### 1. Direct (Recommended)

Download: - index.html - editor.js

Run: file:///path/to/index.html

------------------------------------------------------------------------

### 2. jsDelivr CDN

``` html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit/editor.js"></script>
```

------------------------------------------------------------------------

## ⚙️ Usage

``` html
<div id="app"></div>
<script>
  SolidEdit.init({
    container: "#app"
  });
</script>
```

------------------------------------------------------------------------

## 📱 Responsive

-   Mobile optimized
-   Toolbar adapts
-   Overflow menu support

------------------------------------------------------------------------

## 🧱 Architecture

editor.js structure: - init - state - DOM - toolbar - markdown - math -
code - image - table - inspector - autosave

------------------------------------------------------------------------

## 🤝 Contributing

-   Must work in file://
-   Avoid external deps
-   Prevent regression

------------------------------------------------------------------------

## 📄 License

MIT

------------------------------------------------------------------------

`<a id="korean">`{=html}`</a>`{=html} \# 🇰🇷 한국어

## ✨ 개요

SolidEdit는 오프라인에서 바로 실행 가능한 리치 텍스트 에디터입니다.

다음이 필요 없습니다: - 빌드 과정 - 서버 - 외부 라이브러리

👉 file:// 환경에서 바로 실행됩니다.

------------------------------------------------------------------------

## 🎯 설계 철학

-   오프라인 우선
-   단일 HTML + JS
-   외부 의존 없음
-   예측 가능한 동작
-   안정성 중심

------------------------------------------------------------------------

## 🚀 주요 기능

### ✍️ 리치 텍스트

-   굵게, 기울임, 밑줄, 취소선
-   제목 (H1\~H3)
-   인용문
-   리스트
-   코드, 링크
-   색상
-   구분선

### 🧾 Markdown

-   패널 토글
-   적용
-   동기화
-   Split View

### 🧮 수식

-   인라인/블록
-   초기 렌더

### 💻 코드 블록

-   언어 선택
-   하이라이트
-   원본 보존

### 🖼️ 이미지

-   붙여넣기 / 드래그
-   base64
-   압축

### 📊 표

-   그리드 UI
-   Inspector 제어

### 🔍 Inspector

-   선택 기반 UI
-   최소 표시

### 💾 저장

-   자동 저장
-   스냅샷

------------------------------------------------------------------------

## 📦 설치

### 직접 실행

index.html + editor.js 다운로드 후 실행

### jsDelivr

``` html
<script src="https://cdn.jsdelivr.net/gh/statground/solid-edit/editor.js"></script>
```

------------------------------------------------------------------------

## ⚙️ 사용

``` javascript
SolidEdit.init({
  container: "#app"
});
```

------------------------------------------------------------------------

## 📱 반응형

-   모바일 대응
-   툴바 최적화

------------------------------------------------------------------------

## 📄 라이선스

MIT

------------------------------------------------------------------------

## 제작

Statground
