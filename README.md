# Branded-Image-Generator

AIVEX Branded Image Generator

제조업 MLOps 플랫폼 브랜드용 이미지를 옵션만 선택해 바로 생성하는 React 웹 앱입니다.

## 기술 스택

- React 18 (단일 페이지 앱)
- Vite
- 상태: `ratio`, `background`, `overlayCategory`, `logoType`
- 옵션 변경 시 즉시 canvas 미리보기 렌더
- 다운로드: PNG (transparent 배경 지원)
- 에셋: `/public/assets`에서 읽음

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 빌드

```bash
npm run build
```

## 설정 (config.json)

`public/config.json`에서 컬러와 이미지 소스를 직접 수정할 수 있습니다. 앱 실행 시 로드되며, 수정 후 새로고침하면 반영됩니다.

```json
{
  "colors": {
    "brand": "#FF5900",
    "white": "#FFFFFF",
    "darkgray": "#323339",
    "black": "#000000",
    "gradient": {
      "color": "#000000",
      "stops": [{ "opacity": 0.8 }, { "opacity": 0.6 }],
      "angle": 45
    }
  },
  "overlays": [
    { "id": "none", "label": "없음" },
    { "id": "machine", "label": "제조 기계", "src": "/assets/overlays/machine.jpg" },
    ...
  ]
}
```

- **logos**: 기본 로고 (로고 업로드 없을 때 사용)
  - `logoOnly`, `logoWordmark`: light(밝은 배경용), dark(어두운 배경용)
  - `logoHorizontal`, `logoVertical`: 슬로건 가로형/세로형
- **colors**: 배경 색상 (brand=주황색, white=흰색, darkgray=어두운 회색, black=검정)
- **gradient**: 블랙 그라디언트 (#000000 80% → 60%, 45도 사선)
- **overlays**: 오버레이 목록 (id, label, src)

## 이미지 소스

- **로고**: 화면에서 PNG/SVG 업로드 (없으면 `config.json`의 `logos` 기본값 사용)
- **오버레이**: `config.json`의 `overlays`에 정의된 `src` 경로에 이미지 배치 (현재 기본: `public/assets/overlays/BG-*.png`)

디자인: [Figma BIG-DEMO](https://sonata-savor-12715725.figma.site)
