"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const handleGitHubLogin = async () => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
  };

  // 這裡是你新增的 Google 登入邏輯
  const handleGoogleLogin = async () => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            📈
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            股票資產損益行事曆
          </h1>
          <p className="mt-2 text-sm text-muted">
            登入後追蹤每日資產變化，資料完全私密隔離
          </p>
        </div>

        {/* 這裡把兩顆按鈕包起來，設定一點間距 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleGitHubLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-1.125-.585-1.875-.195-1.875 1.17 0 .855.045 1.23.045 1.41.075.42.15 1.275.075 1.995-.21 1.335-1.125 2.31-2.25 2.31-1.8 0-2.835-1.365-2.835-2.835 0-2.1 1.515-3.96 4.365-3.96 2.295 0 3.45.99 3.45.99.63-1.875 2.385-2.655 4.125-2.655 2.475 0 4.425 1.26 4.425 4.74 0 2.475-1.395 4.74-3.3 4.74-.645 0-1.245-.33-1.455-.735 0 0-.33 1.26-1.26 1.575-.39.99-1.14 1.98-2.04 2.7 1.545.465 3.18.78 4.89.78 6.63 0 12-5.37 12-12S18.63 0 12 0z" />
            </svg>
            使用 GitHub 登入
          </button>

          <button
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
          >
            {/* Google 彩色 Logo SVG */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            使用 Google 登入
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          您的資產資料僅自己可見，採用 Supabase RLS 隱私保護
        </p>
      </div>
    </div>
  );
}