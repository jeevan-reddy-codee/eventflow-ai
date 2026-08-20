"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorAlert } from "@/components/Alert";
import { FormInput } from "@/components/FormInput";
import { LoadingState } from "@/components/LoadingState";
import { NeonButton } from "@/components/NeonButton";
import { ControlChip, GlassPanel, StatusBeacon } from "@/components/OpsUI";
import { post } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/roles";

const roles: Role[] = ["STUDENT", "ORGANIZER", "VOLUNTEER", "ADMIN"];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("STUDENT");
  const [email, setEmail] = useState("student1@iiita.ac.in");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function login() {
    setIsLoading(true);
    setError("");

    try {
      const response = await post("/api/auth/login", { email, password });
      const { token, user } = response.data;

      saveToken(token);
      saveUser(user);
      router.push(roleHome[user.role as Role]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_520px]">
      <section className="hidden min-h-screen items-center px-10 lg:grid">
        <div className="max-w-2xl">
          <ControlChip>Identity Access</ControlChip>
          <h1 className="mt-6 text-6xl font-black uppercase leading-none tracking-wide text-white">Enter the campus flow grid.</h1>
          <p className="mt-6 text-lg leading-8 text-white/58">Choose a demo role and route into the right EventFlow AI operations surface.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {roles.map((item, index) => (
              <div
                key={item}
                className={`grid h-36 w-36 place-items-center rounded-full border bg-white/5 p-3 text-center backdrop-blur ${
                  index === 1
                    ? "border-violet/30 text-violet-100 shadow-violet"
                    : index === 2
                      ? "border-lime/30 text-lime shadow-[0_0_24px_rgba(163,230,53,0.14)]"
                      : index === 3
                        ? "border-amber/30 text-amber shadow-[0_0_24px_rgba(245,158,11,0.14)]"
                        : "border-cyan-300/30 text-cyan-100 shadow-glow"
                }`}
              >
                <div>
                  <p className="text-2xl font-black text-white">{item.slice(0, 2)}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em]">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="grid place-items-center px-4 py-10">
        <GlassPanel className="w-full max-w-md">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/60">EventFlow AI Access</p>
              <h1 className="mt-3 text-3xl font-black uppercase text-white">Login</h1>
            </div>
            <StatusBeacon status="open" label={role} />
          </div>
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); login(); }}>
            {error ? <ErrorAlert title="Login failed">{error}</ErrorAlert> : null}
            <FormInput label="Email" type="email" placeholder="you@campus.edu" value={email} onChange={(event) => setEmail(event.target.value)} />
            <FormInput label="Password" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <label className="grid gap-2 text-sm font-bold text-white/75">
              Demo role
              <select value={role} onChange={(event) => {
                const nextRole = event.target.value as Role;
                setRole(nextRole);
                setEmail({
                  STUDENT: "student1@iiita.ac.in",
                  ORGANIZER: "organizer@iiita.ac.in",
                  VOLUNTEER: "volunteer@iiita.ac.in",
                  ADMIN: "admin@iiita.ac.in",
                }[nextRole]);
              }} className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10">
                {roles.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <NeonButton type="submit" disabled={isLoading} className="mt-2 w-full">{isLoading ? "Routing..." : "Login"}</NeonButton>
            {isLoading ? <LoadingState label="Opening identity lane" /> : null}
          </form>
          <p className="mt-5 text-center text-sm text-white/55">
            New signal? <Link className="font-bold text-cyan-100" href="/register">Create identity</Link>
          </p>
        </GlassPanel>
      </section>
    </main>
  );
}
