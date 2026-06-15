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

        <button
          onClick={handleGitHubLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 active:scale-[0.98]"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-1.125-.585-1.875-.195-1.875 1.17 0 .855.045 1.23.045 1.41.075.42.15 1.275.075 1.995-.21 1.335-1.125 2.31-2.25 2.31-1.8 0-2.835-1.365-2.835-2.835 0-2.1 1.515-3.96 4.365-3.96 2.295 0 3.45.99 3.45.99.63-1.875 2.385-2.655 4.125-2.655 2.475 0 4.425 1.26 4.425 4.74 0 2.475-1.395 4.74-3.3 4.74-.645 0-1.245-.33-1.455-.735 0 0-.33 1.26-1.26 1.575-.39.99-1.14 1.98-2.04 2.7 1.545.465 3.18.78 4.89.78 6.63 0 12-5.37 12-12S18.63 0 12 0z" />
          </svg>
          使用 GitHub 登入
        </button>

        <p className="mt-6 text-center text-xs text-muted">
          您的資產資料僅自己可見，採用 Supabase RLS 隱私保護
        </p>
      </div>
    </div>
  );
}
