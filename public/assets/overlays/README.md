# 사진 오버레이 이미지

이 폴더의 이미지는 **사진 오버레이** 옵션으로 사용됩니다.  
각 파일명은 `public/config.json` 의 `overlays` 설정과 연결되어 있으며,  
선택된 이미지가 캔버스 위에 **약 20% 투명도**로 `object-fit: cover` 형태로 깔립니다.

## 파일명과 역할

| ID          | 파일명                | UI 표시 이름   | 설명                |
|-------------|-----------------------|----------------|---------------------|
| `none`      | (이미지 없음)         | 없음           | 오버레이 사용 안 함 |
| `line`      | `BG-line.png`         | 라인           | 추상적인 라인 패턴  |
| `building`  | `BG-building.png`     | 사옥           | AIVEX 사옥 이미지   |
| `lobby`     | `BG-lobby.png`        | 3층 로비       | 3층 로비 사진       |
| `factory01` | `BG-factory01.png`    | 현장 1         | 제조 현장 사진 1    |
| `factory02` | `BG-factory02.png`    | 현장 2         | 제조 현장 사진 2    |
| `labeling01`| `BG-labeling01.png`   | 레이블링 1     | 레이블링 작업 1     |
| `labeling02`| `BG-labeling02.png`   | 레이블링 2     | 레이블링 작업 2     |
| `people01`  | `BG-people01.png`     | AIVers 1       | AIVEX 인물 사진 1   |
| `people02`  | `BG-people02.png`     | AIVers 2       | AIVEX 인물 사진 2   |
| `minsoo`    | `BG-minsoo.png`       | 민수님         | 민수님 포트레이트   |

> 해당 이미지는 `public/config.json` 의 `backgrounds` 항목에서 관리되며,
> `BG-abstract01.png`, `BG-abstract02.png` 파일은 `/public/assets/overlays` 에 위치해 있습니다.

## 노출 방식

- 오버레이 이미지는 **캔버스를 기준으로 중앙 정렬 + 비율 유지 + 꽉 채우기**로 렌더링됩니다.
- “사진 흑백 처리” 토글이 활성화되어 있으면,  
  썸네일과 실제 캔버스 모두에 흑백(saturation 0%) 필터가 적용됩니다.
- 배경으로 `추상 1`, `추상 2` 를 선택한 경우:
  - 사진 오버레이 영역은 UI 상에서 비활성화되며
  - “추상 배경 선택 시 이미지를 오버레이할 수 없어요” 라는 안내 문구가 표시됩니다.