"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavUser from "./nav-user";

export default function AppNav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6 text-sm">
      <Link href="/" className="font-bold text-white hover:no-underline">Jopler</Link>
      <Link href="/jobs">Jobs</Link>
      <Link href="/summary">Summary</Link>
      <Link href="/training" className="text-amber-400 hover:text-amber-300">Training</Link>
      <Link href="/mock-interview" className="text-gray-400 hover:text-gray-200">Mock Interview</Link>
      <Link href="/team" className="text-gray-400 hover:text-gray-200">Team</Link>
      <div className="ml-auto flex items-center gap-4">
        <Link href="/access" className="text-gray-500 hover:text-gray-300 text-xs">Access</Link>
        <NavUser />
      </div>
    </nav>
  );
}
