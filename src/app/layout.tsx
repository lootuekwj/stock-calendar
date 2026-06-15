import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "股票資產損益行事曆",
  description: "追蹤每日股票資產變化，以月曆與折線圖視覺化損益",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
