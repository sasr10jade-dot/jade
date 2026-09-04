import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// PWA/매니페스트용 아이콘 — 헤더 로고(rounded bg-primary + 검정 "V")와 동일한 디자인을
// next/og의 ImageResponse로 렌더링. 별도 이미지 편집 툴 없이 코드로 생성/재현 가능.
// 마스커블 아이콘 가이드에 맞춰 글리프 주변에 여백을 둬서 OS가 원형/둥근 마스크를
// 씌워도 잘리지 않게 함.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#7fff00",
        }}
      >
        <div
          style={{
            fontSize: 260,
            fontWeight: 900,
            color: "#0a0a0a",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          V
        </div>
      </div>
    ),
    { ...size }
  );
}
