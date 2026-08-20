"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GlassPanel, StatusBeacon } from "@/components/OpsUI";
import { LoadingState } from "@/components/LoadingState";
import { getUser, isAuthenticated } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/roles";

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const user = getUser();

    if (roles?.length && !roles.includes(user?.role)) {
      setForbidden(true);
      return;
    }

    setAllowed(true);
  }, [router, roles]);

  if (forbidden) {
    const user = getUser();

    return (
      <div className="min-h-screen bg-void px-5 py-10 text-white">
        <GlassPanel className="mx-auto mt-20 max-w-2xl">
          <StatusBeacon status="denied" label="ACCESS DENIED" />
          <h1 className="mt-5 text-3xl font-black uppercase tracking-wide text-white">Restricted operations lane</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Your current role{user?.role ? ` (${user.role})` : ""} cannot enter this EventFlow AI control surface.
          </p>
          {user?.role && roleHome[user.role as Role] ? (
            <button
              type="button"
              onClick={() => router.replace(roleHome[user.role as Role])}
              className="mt-6 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-cyan-100"
            >
              Return to assigned dashboard
            </button>
          ) : null}
        </GlassPanel>
      </div>
    );
  }

  if (!allowed) {
    return <LoadingState label="Checking access lane" />;
  }

  return <>{children}</>;
}
