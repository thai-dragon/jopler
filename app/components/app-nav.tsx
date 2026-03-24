"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { isGuestEmail } from "@/lib/access-policy";
import NavUser from "./nav-user";
import ThemeToggle from "./theme-toggle";

export default function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const email = session?.user?.email;
  const isGuest = session?.user?.isGuest === true || isGuestEmail(email);
  const homeHref = isGuest ? "/jobs" : "/";
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [canSeeTeam, setCanSeeTeam] = useState(false);
  const [canUseAi, setCanUseAi] = useState(false);

  useEffect(() => {
    fetch("/api/training/is-admin")
      .then((r) => r.json())
      .then((d) => {
        setIsSuperadmin(d.isSuperadmin === true);
        setCanSeeTeam(d.canSeeTeam === true);
        setCanUseAi(d.canUseAi === true);
      })
      .catch(() => {});
  }, []);

  if (pathname === "/login") return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string) =>
    `transition ${isActive(href) ? "font-semibold text-white" : "text-gray-400 hover:text-gray-200"}`;

  return (
    <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6 text-sm">
      <Link href={homeHref} className={`font-bold hover:no-underline ${linkClass(homeHref)}`}>Jopler</Link>
      <Link href="/jobs" className={linkClass("/jobs")}>Jobs</Link>
      <Link href="/summary" className={linkClass("/summary")}>Summary</Link>
      <Link href="/training" className={linkClass("/training")}>Training</Link>
      {canUseAi && (
        <Link href="/mock-interview" className={linkClass("/mock-interview")}>Mock Interview</Link>
      )}
      {canSeeTeam && (
        <Link href="/team" className={linkClass("/team")}>Team</Link>
      )}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {isSuperadmin && (
          <Link href="/access" className={`text-xs transition ${isActive("/access") ? "font-semibold text-white" : "text-gray-500 hover:text-gray-300"}`}>Access</Link>
        )}
        <NavUser />
      </div>
    </nav>
  );
}
