"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { NotificationBell } from "./NotificationBell";
import { getUser, isAuthenticated, logout } from "@/lib/auth";
import { roleNavigation, type Role } from "@/lib/roles";

export function Navbar() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [user, setUser] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser?.role && storedUser.role in roleNavigation) {
      setRole(storedUser.role);
      setUser(storedUser);
    }
  }, []);

  const links = isAuthenticated() ? roleNavigation[role] : [];

  function handleLogout() {
    logout();
    setUser(null);
    setRole("STUDENT");
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-cyan-200/10 bg-void/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-black uppercase tracking-[0.18em]">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-100 shadow-glow">EF</span>
          <span className="hidden text-white sm:inline">EventFlow AI</span>
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-xs font-bold uppercase tracking-[0.16em] text-white/58 transition hover:text-cyan-100">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <div className="hidden text-right sm:block">
                <p className="text-sm font-black text-white">{user.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/55">{user.role}</p>
              </div>
              <Button type="button" variant="ghost" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
                Log in
              </Button>
              <Button href="/register">Register</Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export const OpsNavbar = Navbar;
