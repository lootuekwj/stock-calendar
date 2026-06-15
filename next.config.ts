import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 部署無需額外設定
  // 若需 GitHub Pages 靜態部署，取消下行註解並設定 basePath
  // output: "export",
  // basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  images: { unoptimized: true },
};

export default nextConfig;
