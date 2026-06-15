"use client";

import type { User } from "@supabase/supabase-js";

type Props = {
  user: User;
  onAddClick: () => void;
  onBrokersClick: () => void;
  onSignOut: () => void;
};

export default function Header({
  user,
  onAddClick,
  onBrokersClick,
  onSignOut,
}: Props) {
  const avatar = user.user_metadata?.avatar_url;
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.user_name ??
    "使用者";

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
              📈
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              資產行事曆
            </p>
            <p className="truncate text-xs text-muted">{name}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onBrokersClick}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-muted transition hover:bg-gray-100 hover:text-gray-900"
            title="管理券商"
          >
            券商
          </button>
          <button
            onClick={onSignOut}
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-muted transition hover:bg-gray-100 hover:text-gray-900"
          >
            登出
          </button>
          <button
            onClick={onAddClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xl font-light text-white shadow-md transition hover:bg-primary-hover active:scale-95"
            aria-label="新增今日資產"
          >
            +
          </button>
        </div>
      </div>
    </header>
  );
}
