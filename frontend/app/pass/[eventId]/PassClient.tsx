"use client";

import { useEffect, useState } from "react";
import { ErrorAlert, SuccessAlert } from "@/components/Alert";
import { LoadingState } from "@/components/LoadingState";
import { NeonButton } from "@/components/NeonButton";
import { GlassPanel, StatusBeacon } from "@/components/OpsUI";
import { get } from "@/lib/api";
import { unwrapData } from "@/lib/adapters";

type PassData = {
  event: { id: string; title: string; startTime: string; endTime: string; status: string };
  venue: { name: string; zone?: string; location?: string };
  student: { name: string; email: string };
  registrationStatus: string;
  seatNumber: string;
  qrToken: string;
  qrImage: string;
  expiry: string;
  passType?: string;
  specialEntryAllowed?: boolean;
  crewAccess?: {
    accessType: string;
    gateName: string;
    note?: string;
  } | null;
};

export function PassClient({ eventId }: { eventId: string }) {
  const [pass, setPass] = useState<PassData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPass() {
      setIsLoading(true);
      setError("");

      try {
        const payload = await get(`/api/events/${eventId}/pass`);
        if (!active) return;
        setPass(unwrapData(payload));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to generate QR pass.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadPass();
    return () => {
      active = false;
    };
  }, [eventId]);

  async function copyToken() {
    if (!pass?.qrToken) return;
    await navigator.clipboard.writeText(pass.qrToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (isLoading) {
    return <LoadingState label="Generating encrypted access pass" />;
  }

  if (error) {
    return (
      <GlassPanel className="mx-auto max-w-3xl">
        <StatusBeacon status="denied" label="ACCESS DENIED" />
        <h2 className="mt-4 text-3xl font-black text-white">Pass unavailable</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">{error}</p>
      </GlassPanel>
    );
  }

  if (!pass) return null;

  return (
    <div className="grid gap-5">
      <GlassPanel className="relative mx-auto max-w-3xl overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[280px_1fr]">
          <div className="relative grid min-h-80 place-items-center border-b border-cyan-200/12 bg-cyan-300/8 p-8 md:border-b-0 md:border-r">
            <div className="absolute inset-8 rounded-full border border-cyan-300/18" style={{ animation: "beacon 2.4s ease-in-out infinite" }} />
            <img src={pass.qrImage} alt="EventFlow AI QR pass" className="relative aspect-square w-52 rounded-2xl border border-white/10 bg-white p-3 shadow-glow" />
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/65">EventFlow AI Access</p>
                <h2 className="mt-3 text-3xl font-black text-white">{pass.event.title}</h2>
              </div>
              <StatusBeacon status={pass.registrationStatus === "CHECKED_IN" ? "live" : "open"} label={pass.registrationStatus} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Student", pass.student.name],
                ["Venue zone", `${pass.venue.name}${pass.venue.zone ? ` / ${pass.venue.zone}` : ""}`],
                ["Seat", pass.seatNumber || "Assigned at gate"],
                ["Expiry", new Date(pass.expiry).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
                  <p className="mt-1 font-black text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 rounded-xl border border-lime/20 bg-lime/10 p-4 text-sm font-bold text-lime">Single-use encrypted entry pass</p>
            {pass.specialEntryAllowed && pass.crewAccess ? (
              <div className="mt-4 rounded-xl border border-violet/25 bg-violet/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100/70">Special Event Access</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-white/45">Access type</p>
                    <p className="font-black text-white">{pass.crewAccess.accessType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/45">Assigned gate</p>
                    <p className="font-black text-white">{pass.crewAccess.gateName}</p>
                  </div>
                </div>
                {pass.crewAccess.note ? <p className="mt-3 text-sm font-bold text-violet-100">{pass.crewAccess.note}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </GlassPanel>

      <div className="mx-auto grid max-w-3xl gap-3">
        <NeonButton type="button" onClick={copyToken} variant="secondary">Copy Demo QR Token</NeonButton>
        {copied ? <SuccessAlert title="Token copied">Paste it into the volunteer scanner for the demo flow.</SuccessAlert> : null}
        <p className="rounded-2xl border border-amber/20 bg-amber/10 p-4 text-sm font-bold text-amber">
          For demo testing only. Real users should scan the QR image.
        </p>
      </div>
    </div>
  );
}
