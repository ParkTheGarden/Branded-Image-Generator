# AIVEX Branded Image Generator

AIVEX의 브랜드 아이덴티티가 담긴 이미지를 **디자이너가 아니어도** 쉽게 생성할 수 있도록 만든 React 기반 웹 애플리케이션입니다.  
HR/마케팅/운영팀 등이 자주 쓰는 비율·배경·사진 무드·로고 조합을 선택만 하면, 즉시 브랜드 가이드를 지키는 이미지를 생성하고 PNG로 다운로드할 수 있습니다.

---

## 주요 기능

- **이미지 비율 선택 (config 기반)**
  - `1:1` (1200×1200)
  - `16:9` (1920×1080)
  - `3:2` (1800×1200)
  - `4:3` (1600×1200)
  - `2:1` (1800×900)
  - `3:1` (1800×600)
  - `커스텀` (W/H 픽셀 직접 입력, 최대 3000px)
  - 상단 미리보기 패널에서 chip 형태로 선택 가능, 선택 즉시 canvas 비율/해상도 반영

- **배경 옵션**
  - `없음 (투명)` – transparent PNG 지원
  - `브랜드 (오렌지)` – `#FF5900`
  - `흰색` – `#FFFFFF`
  - `어두운 회색` – `#323339`
  - `검정 (블랙)` – `#000000`
  - `밝은(회색)` – `#FAFAFC`
  - `추상 1`, `추상 2` – 전체 배경으로 꽉 차게 들어가는 이미지 배경  
    (추상 배경 선택 시 사진 오버레이 비활성화 및 안내 문구 노출)

- **사진 오버레이 옵션 (사진 무드 선택)**
  - 오버레이 이미지는 캔버스를 기준으로 **`object-fit: cover`** 처럼 가득 차게 표시
  - **투명도(알파) 슬라이더**로 0~100% (5% 단위) 조절 가능
  - 아래 ID/파일명/레이블 기반:
    - `none` – 없음
    - `line` – `BG-line.png` (라인)
    - `building` – `BG-building.png` (사옥)
    - `lobby` – `BG-lobby.png` (3층 로비)
    - `factory01` – `BG-factory01.png` (현장 1)
    - `factory02` – `BG-factory02.png` (현장 2)
    - `labeling01` – `BG-labeling01.png` (레이블링 1)
    - `labeling02` – `BG-labeling02.png` (레이블링 2)
    - `people01` – `BG-people01.png` (AIVers 1)
    - `people02` – `BG-people02.png` (AIVers 2)
    - `minsoo` – `BG-minsoo.png` (민수님)

- **사진 흑백 처리 토글**
  - “사진 오버레이” 섹션 상단의 **토글 스위치**로 on/off
  - ON 시, 오버레이 이미지에 **흑백 처리** 적용 (썸네일 + 실제 canvas + 다운로드 모두)
    - 브라우저에서 `canvas filter`가 미지원/불안정한 경우를 대비해 **fallback(픽셀 변환)** 포함

- **로고 조합 / 로고 컬러 선택**
  - **로고 타입**
    - `logoOnly` – 로고만
    - `logoHorizontal` – 로고 + 슬로건 가로형
    - `logoVertical` – 로고 + 슬로건 세로형
  - **로고 컬러**
    - `white` – 로고 흰색 (`*white*.svg`)
    - `orange` – 로고 AIVEX 오렌지 (`*orange*.svg`)
    - `black` – 로고 검정색 (`*black*.svg`)
  - **로고 자동 크기 조정**
    - `logoOnly`: 기본보다 약 1.25배
    - `logoHorizontal`: 기본보다 약 1.8배
    - `logoVertical`: 기본보다 약 1.5배
  - **배경에 따른 사용 제약(가시성 보장)**
    - 로고 흰색: `white`, `lightgray` 배경에서는 선택 불가
    - 로고 검정색: `darkgray`, `black`, `abstract01`, `abstract02` 배경에서는 선택 불가
    - 로고 오렌지: `brand`(오렌지) 배경에서는 선택 불가
  - UI 상에서 사용할 수 없는 조합은 chip 버튼이 비활성화되며,
    “로고의 가시성을 위해 배경 컬러에 따라 일부 옵션이 제한될 수 있습니다.” 안내 문구 제공

  - **로고 편집(미리보기 캔버스)**
    - 로고 선택 시 캔버스 위에 바운딩 박스 표시
    - 바운딩 박스 드래그로 위치 이동
    - 우하단 리사이즈 핸들 드래그로 크기 조절 (가로/세로 비율 고정)

- **미리보기 & 줌**
  - 옵션 변경 시마다 **동일한 canvas 인스턴스에 즉시 렌더**
  - 캔버스 영역에서 **마우스 스크롤로 확대/축소** (0.5x ~ 2x 범위)
  - “미리보기” 제목 옆에 “스크롤하여 줌을 조절할 수 있어요” 안내 문구 표시
  - 캔버스 우상단에 `Undo/Redo` 버튼과 `줌%` 배지 고정 표시
  - 캔버스 위에 4x4(16분할) 빨간 가이드 격자 표시 (opacity 50%)
  - 미리보기 영역은 항상 wrapper 안에서만 표시되도록 크롭 처리

- **다운로드**
  - 현재 미리보기와 **완전히 동일한 canvas** 를 사용해 PNG 저장
  - transparent 배경 선택 시, PNG 알파 채널 유지 (체커보드 패턴은 화면용 미리보기에서만 사용)

- **텍스트**
  - 미리보기 상단(이미지 비율 아래)에서 텍스트를 추가할 수 있습니다.
  - 캔버스 위 텍스트는 **드래그로 위치 이동**만 가능하며, 선택 시 바운딩 박스가 표시됩니다.
  - 텍스트를 **더블클릭**하면 편집 모드로 전환되며, 우측에 작은 삭제 버튼이 표시됩니다.
  - 줄바꿈은 **Enter로만** 가능하며, 자동 줄바꿈(자동 개행)은 하지 않습니다.
  - 텍스트는 캔버스 영역 밖으로 나가면 **보이지 않도록 클리핑**됩니다.
  - 텍스트 정렬(왼쪽/가운데/오른쪽)
    - 선택된 텍스트에 대해 우하단 정렬 컨트롤로 L/C/R 설정
    - 하단 “텍스트” 입력 옵션에서도 동일하게 정렬 설정 가능
  - 타이포그래피 기본값은 `config.json`의 `typography`로 관리합니다.
    - `lineHeightRatio`: 기본 1.4 (글자 크기의 140%)
    - `letterSpacing`: 기본 `-0.01em` (-1%)

- **완전한 config 기반 설정**
  - 이미지 비율, 컬러 값, 배경/오버레이/로고 옵션, 에셋 경로는 모두 `public/config.json` 에서 관리
  - 코드 상에서는 기본값으로 `src/config/defaultConfig.js` 를 사용하며,
    실제 실행 시에는 `ConfigContext` 를 통해 `config.json` 을 우선 로딩

---

## 기술 스택

- **React 18** – 단일 페이지 애플리케이션(SPA)
- **Vite** – 개발 서버 및 빌드 도구
- **HTML5 Canvas** – 실시간 미리보기/합성/다운로드 렌더링
- **Context API** – `ConfigContext` 로 `config.json` 공유
- **CSS (일반 CSS)** – Figma 디자인 기반 커스텀 스타일

---

## 폴더 구조 (요약)

```text
Aivex Branded Image Generator/
├─ public/
│  ├─ config.json                  # 실제 앱이 읽는 설정 파일
│  └─ assets/
│     ├─ logo/                     # AIVEX 로고 및 슬로건 SVG
│     └─ overlays/                 # BG-*.png 오버레이 이미지 + README
├─ src/
│  ├─ components/
│  │  ├─ OptionPanel.jsx           # 좌측 옵션 패널 (배경/오버레이/로고 등)
│  │  └─ PreviewCanvas.jsx         # 우측 캔버스 미리보기 + 다운로드
│  ├─ config/
│  │  └─ defaultConfig.js          # config.json 과 동일 구조의 기본 설정
│  ├─ context/
│  │  └─ ConfigContext.jsx         # 설정 로딩/제공용 Context
│  ├─ utils/
│  │  └─ canvasRender.js           # 캔버스 렌더링(배경/오버레이/로고 합성) 로직
│  ├─ index.css                    # 전역 스타일
│  ├─ main.jsx                     # React 엔트리
│  └─ App.jsx                      # 전체 레이아웃 및 상태 관리
└─ vite.config.js

---

## 배포

### Vercel

이 프로젝트는 별도 서버가 없는 Vite 정적 앱이라 Vercel에 바로 배포할 수 있습니다.

1. GitHub 저장소를 Vercel에 import
2. Framework Preset: `Vite`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Deploy

Vercel에서는 별도 설정 파일 없이 루트 경로(`/`) 기준으로 정상 동작합니다.

### GitHub Pages

GitHub Pages는 저장소명 하위 경로(`/Branded-Image-Generator/`)로 서비스되므로 전용 빌드를 사용해야 합니다.

- 로컬 빌드: `npm run build:github-pages`
- 출력 폴더: `dist`
- 자동 배포: `.github/workflows/deploy-pages.yml`

GitHub에서 아래 설정도 한 번 해줘야 합니다.

1. 저장소 `Settings`
2. `Pages`
3. `Build and deployment`의 Source를 `GitHub Actions`로 변경

그 뒤 `main` 브랜치에 push 하면 Pages가 자동 배포됩니다.
