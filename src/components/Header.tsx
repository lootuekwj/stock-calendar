"use client";

import type { User } from "@supabase/supabase-js";

type Props = {
  user: User;
  onAddClick: () => void;
  onBrokersClick: () => void;
  onSignOut: () => void;
};

export default function Header({ user, onAddClick, onBrokersClick, onSignOut }: Props) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-800 bg-gray-950/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex flex-col">
        <h1 className="text-lg font-bold tracking-wide text-gray-100 sm:text-xl">投資日誌</h1>
        <span className="text-[10px] text-gray-500 sm:text-xs">{user.email}</span>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3">
        <button 
          onClick={onBrokersClick} 
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-white sm:px-4 sm:py-2"
        >
          管理券商
        </button>
        <button 
          onClick={onAddClick} 
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-500 sm:px-4 sm:py-2"
        >
          ＋ 記帳
        </button>
        
        {/* 新增的重整按鈕 */}
        <button 
          onClick={() => window.location.reload()} 
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 sm:p-2" 
          aria-label="重整畫面"
          title="重整畫面"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* 原本的登出按鈕 */}
        <button 
          onClick={onSignOut} 
          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 sm:p-2" 
          aria-label="登出"
          title="登出"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}