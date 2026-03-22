"use client";

import { useSession, signOut } from "next-auth/react";

export default function NavUser() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-2">
      {session.user.image ? (
        <img
          src={session.user.image}
          alt=""
          className="w-6 h-6 rounded-full"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-[10px] font-bold" style={{ color: "#fff" }}>
          {session.user.name?.charAt(0)?.toUpperCase() || session.user.email?.charAt(0)?.toUpperCase() || "?"}
        </div>
      )}
      <span className="text-xs text-gray-400 hidden sm:inline">{session.user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="text-xs text-gray-600 hover:text-gray-400 transition ml-1"
      >
        Sign out
      </button>
    </div>
  );
}
