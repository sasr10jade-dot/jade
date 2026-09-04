import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cloudflared 터널(매 재시작마다 호스트명이 바뀜)을 통해 접속할 때 Next.js dev 서버가
  // /_next/* 리소스(HMR뿐 아니라 앱 JS 번들 자체도 포함)를 교차 출처 요청으로 보고 막던
  // 문제 — 모바일에서 클릭/재생이 전혀 안 먹히던 근본 원인이었음: 페이지 HTML은 정상
  // 서빙되지만 React 하이드레이션용 JS 청크가 거부당해 어떤 상호작용도 동작하지 않았음.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
