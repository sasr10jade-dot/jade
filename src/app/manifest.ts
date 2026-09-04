import type { MetadataRoute } from "next";

// Next App Router 매니페스트 파일 컨벤션 — /manifest.webmanifest로 자동 서빙되고
// <link rel="manifest">도 자동으로 <head>에 삽입됨(레이아웃 수정 불필요).
// "홈 화면에 추가" 시 브라우저 주소창 없이 standalone 앱처럼 실행되도록.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VOICEMAP",
    short_name: "VOICEMAP",
    description: "작곡가와 보컬을 연결하고, 구매와 저작권을 하나의 플로우로 관리하는 음악 마켓플레이스",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
