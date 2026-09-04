import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS "홈 화면에 추가" 아이콘 — apple-touch-icon은 iOS가 자체적으로 둥근 모서리를
// 씌우므로 투명 배경 없이 꽉 채운 사각형으로 렌더링.
export default function AppleIcon() {
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
            fontSize: 100,
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
