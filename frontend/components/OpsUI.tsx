import Link from "next/link";
import type { ReactNode } from "react";
import { CapacityBar } from "./CapacityBar";
import { NeonButton } from "./NeonButton";
import type { EventRecord, Status, VenueRecord } from "@/lib/data";

const statusStyles: Record<Status | "allowed" | "denied", string> = {
  open: "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.7)]",
  filling: "bg-amber shadow-[0_0_18px_rgba(245,158,11,0.65)]",
  waitlist: "bg-violet shadow-[0_0_18px_rgba(167,139,250,0.7)]",
  closed: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.7)]",
  live: "bg-lime shadow-[0_0_18px_rgba(163,230,53,0.7)]",
  allowed: "bg-lime shadow-[0_0_18px_rgba(163,230,53,0.7)]",
  denied: "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,0.7)]",
};

export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-cyan-200/12 bg-panel p-5 shadow-soft backdrop-blur-xl ${className}`}>
      {children}
    </section>
  );
}

export function ControlHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-cyan-200/75">{eyebrow}</p> : null}
        <h1 className="max-w-4xl text-3xl font-black uppercase tracking-wide text-white sm:text-5xl">{title}</h1>
      </div>
      {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
    </div>
  );
}

export function StatusBeacon({ status, label }: { status: Status | "allowed" | "denied"; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/85">
      <span className={`relative h-2.5 w-2.5 rounded-full ${statusStyles[status]}`}>
        <span className={`absolute inset-0 rounded-full ${statusStyles[status]}`} style={{ animation: "beacon 1.7s ease-in-out infinite" }} />
      </span>
      {label ?? status}
    </span>
  );
}

export function ControlChip({ children, tone = "cyan" }: { children: ReactNode; tone?: "cyan" | "violet" | "lime" | "amber" | "rose" }) {
  const tones = {
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    violet: "border-violet/25 bg-violet/10 text-violet-100",
    lime: "border-lime/25 bg-lime/10 text-lime",
    amber: "border-amber/25 bg-amber/10 text-amber",
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-100",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${tones[tone]}`}>{children}</span>;
}

export function CapacityRing({ value, label = "capacity", size = "md" }: { value: number; label?: string; size?: "sm" | "md" | "lg" }) {
  const pct = Math.max(0, Math.min(value, 100));
  const sizeClass = size === "lg" ? "h-40 w-40" : size === "sm" ? "h-24 w-24" : "h-32 w-32";
  return (
    <div className={`relative grid shrink-0 place-items-center rounded-full ${sizeClass}`} style={{ background: `conic-gradient(#00e5ff ${pct * 3.6}deg, rgba(255,255,255,0.10) 0deg)` }}>
      <div className="absolute inset-2 rounded-full bg-void/90 shadow-inner" />
      <div className="relative text-center">
        <div className="text-2xl font-black text-white">{pct}%</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100/60">{label}</div>
      </div>
    </div>
  );
}

export function CapacityRadar({ current, capacity }: { current: number; capacity: number }) {
  const pct = Math.round((current / capacity) * 100);
  return (
    <GlassPanel className="overflow-hidden">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/55">Capacity Radar</p>
          <p className="mt-1 text-2xl font-black text-white">{current} / {capacity}</p>
        </div>
        <CapacityRing value={pct} />
      </div>
      <div className="relative h-28 overflow-hidden rounded-xl border border-cyan-300/10 bg-cyan-300/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(0,229,255,0.22)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet/20" />
        <div className="absolute bottom-0 left-0 h-1 bg-lime shadow-[0_0_20px_rgba(163,230,53,0.6)]" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </GlassPanel>
  );
}

export function PulseMetric({ label, value, delta, tone = "cyan" }: { label: string; value: string; delta: string; tone?: "cyan" | "violet" | "lime" | "amber" }) {
  const glow = {
    cyan: "from-cyan-300/18 text-cyan-100",
    violet: "from-violet/18 text-violet-100",
    lime: "from-lime/18 text-lime",
    amber: "from-amber/18 text-amber",
  };
  return (
    <GlassPanel className={`bg-gradient-to-br ${glow[tone]} to-transparent`}>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className={`mt-2 text-sm font-semibold ${glow[tone].split(" ")[1]}`}>{delta}</p>
    </GlassPanel>
  );
}

export function MetricOrb({ label, value, tone = "cyan" }: { label: string; value: string; tone?: "cyan" | "violet" | "lime" | "amber" }) {
  const colors = {
    cyan: "border-cyan-300/30 text-cyan-100 shadow-glow",
    violet: "border-violet/30 text-violet-100 shadow-violet",
    lime: "border-lime/30 text-lime shadow-[0_0_28px_rgba(163,230,53,0.16)]",
    amber: "border-amber/30 text-amber shadow-[0_0_28px_rgba(245,158,11,0.16)]",
  };
  return (
    <div className={`grid aspect-square min-h-32 place-items-center rounded-full border bg-white/5 p-4 text-center backdrop-blur ${colors[tone]}`}>
      <div>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em]">{label}</p>
      </div>
    </div>
  );
}

export function CompactMetric({ label, value, delta, tone = "cyan" }: { label: string; value: string; delta?: string; tone?: "cyan" | "violet" | "lime" | "amber" }) {
  const colors = {
    cyan: "border-cyan-300/20 text-cyan-100",
    violet: "border-violet/20 text-violet-100",
    lime: "border-lime/20 text-lime",
    amber: "border-amber/20 text-amber",
  };
  return (
    <div className={`rounded-2xl border bg-white/[0.045] p-4 ${colors[tone]}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {delta ? <p className="mt-1 truncate text-xs font-bold">{delta}</p> : null}
    </div>
  );
}

export function CrowdHeatBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(value, 100));
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.14em] text-white/55">
        <span>Crowd heat</span>
        <span>{pct}%</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/8">
        <div className="bg-gradient-to-r from-cyan-300 via-lime to-amber shadow-[0_0_18px_rgba(250,204,21,0.28)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function RiskBadge({ value }: { value: number }) {
  const risk = value >= 90 ? "high" : value >= 75 ? "medium" : "low";
  const tone = risk === "high" ? "rose" : risk === "medium" ? "amber" : "lime";
  return <ControlChip tone={tone}>{risk} risk</ControlChip>;
}

export function EventRadarCard({ event }: { event: EventRecord }) {
  const crowd = Math.round((event.registeredCount / event.capacity) * 100);
  const flow = event.checkedInCount > 0 ? Math.round((event.checkedInCount / event.registeredCount) * 100) : 0;
  return (
    <GlassPanel className="group relative overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-cyan-200/28 hover:shadow-glow">
      <div className="absolute right-[-2rem] top-[-2rem] h-28 w-28 rounded-full border border-cyan-300/15" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/55">{event.category}</p>
          <h2 className="mt-2 text-2xl font-black text-white">{event.title}</h2>
          <p className="mt-2 text-sm text-white/55">{event.venue}</p>
        </div>
        <StatusBeacon status={event.status} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-5">
        <CapacityRing value={crowd} size="sm" />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-white/6 p-3"><p className="font-black text-white">{event.registeredCount}</p><p className="text-white/45">reg</p></div>
          <div className="rounded-xl bg-white/6 p-3"><p className="font-black text-white">{event.checkedInCount}</p><p className="text-white/45">in</p></div>
          <div className="rounded-xl bg-white/6 p-3"><p className="font-black text-white">{event.waitlistCount}</p><p className="text-white/45">queue</p></div>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <CrowdHeatBar value={crowd} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RiskBadge value={crowd} />
          <ControlChip tone="cyan">entry flow {flow}%</ControlChip>
        </div>
        <NeonButton href={`/events/${event.id}`} variant="ghost" className="w-full">Open Event Panel</NeonButton>
      </div>
    </GlassPanel>
  );
}

export function QueueFlowLane({ label, count, tone = "violet" }: { label: string; count: number; tone?: "cyan" | "violet" | "lime" | "amber" }) {
  const width = Math.min(100, Math.max(12, count * 3));
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-bold">
        <span className="text-white/70">{label}</span>
        <span className="text-white">{count}</span>
      </div>
      <div className="h-3 rounded-full bg-white/8">
        <div className={`h-3 rounded-full ${tone === "lime" ? "bg-lime" : tone === "amber" ? "bg-amber" : tone === "cyan" ? "bg-cyan-300" : "bg-violet"}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AccessPassCard({ event }: { event: EventRecord }) {
  return (
    <GlassPanel className="relative mx-auto max-w-3xl overflow-hidden p-0">
      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        <div className="relative grid min-h-80 place-items-center border-b border-cyan-200/12 bg-cyan-300/8 p-8 md:border-b-0 md:border-r">
          <div className="absolute inset-8 rounded-full border border-cyan-300/18" style={{ animation: "beacon 2.4s ease-in-out infinite" }} />
          <div className="grid aspect-square w-52 grid-cols-7 gap-2 rounded-2xl border border-white/10 bg-void/80 p-5 shadow-glow">
            {Array.from({ length: 49 }).map((_, index) => (
              <span key={index} className={`rounded-sm ${index % 3 === 0 || index % 7 === 0 || index % 11 === 0 ? "bg-cyan-100" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/65">EventFlow AI Access</p>
              <h2 className="mt-3 text-3xl font-black text-white">{event.title}</h2>
            </div>
            <StatusBeacon status={event.status === "closed" ? "waitlist" : "open"} label={event.status === "closed" ? "pending" : "valid"} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Student", "Jordan Lee"],
              ["Venue zone", event.venue],
              ["Time window", `${new Date(event.startTime).toLocaleString()} - ${new Date(event.endTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`],
              ["Seat", `A-${event.id.length + 14}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{label}</p>
                <p className="mt-1 font-black text-white">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-xl border border-lime/20 bg-lime/10 p-4 text-sm font-bold text-lime">Single-use encrypted entry pass</p>
        </div>
      </div>
    </GlassPanel>
  );
}

export function ScannerCockpit({ children }: { children: ReactNode }) {
  return (
    <GlassPanel className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-300/10 to-transparent" />
      <div className="relative">{children}</div>
    </GlassPanel>
  );
}

export function GateFlowPanel({ stats }: { stats: { label: string; value: string; delta: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {stats.map((stat, index) => <PulseMetric key={stat.label} {...stat} tone={index === 0 ? "lime" : index === 1 ? "amber" : index === 2 ? "violet" : "cyan"} />)}
    </div>
  );
}

export function AccessResultPanel({ status, message, detail }: { status?: "ALLOWED" | "REJECTED"; message?: string; detail?: string }) {
  if (!status) {
    return <GlassPanel><p className="text-sm leading-6 text-white/58">Awaiting scan signal. Tokens containing <span className="font-black text-white">valid</span> grant access.</p></GlassPanel>;
  }
  const allowed = status === "ALLOWED";
  return (
    <GlassPanel className={allowed ? "border-lime/35 shadow-[0_0_34px_rgba(163,230,53,0.16)]" : "border-rose-300/35 shadow-[0_0_34px_rgba(251,113,133,0.16)]"}>
      <StatusBeacon status={allowed ? "allowed" : "denied"} label={allowed ? "ACCESS GRANTED" : "ACCESS DENIED"} />
      <p className="mt-4 text-2xl font-black text-white">{message}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-white/60">{detail}</p> : null}
    </GlassPanel>
  );
}

export function ActivityTimeline({ items }: { items: { title: string; meta: string; tone?: "cyan" | "violet" | "lime" | "amber" }[] }) {
  return (
    <GlassPanel>
      <h2 className="mb-5 text-xl font-black text-white">Activity Timeline</h2>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={`${item.title}-${item.meta}`} className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
            <span className={`mt-1 h-3 w-3 rounded-full ${item.tone === "lime" ? "bg-lime" : item.tone === "amber" ? "bg-amber" : item.tone === "violet" ? "bg-violet" : "bg-cyan-300"}`} />
            <div>
              <p className="font-bold text-white">{item.title}</p>
              <p className="mt-1 text-sm text-white/55">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function VenueNode({ venue }: { venue: VenueRecord }) {
  return (
    <GlassPanel className="transition duration-300 hover:-translate-y-1 hover:border-violet/30 hover:shadow-violet">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100/60">Infrastructure node</p>
          <h2 className="mt-2 text-2xl font-black text-white">{venue.name}</h2>
          <p className="mt-1 text-sm text-white/55">{venue.location}</p>
        </div>
        <StatusBeacon status={venue.status} label={venue.status === "closed" ? "conflict" : venue.status} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/6 p-3"><p className="font-black text-white">{venue.capacity}</p><p className="text-xs text-white/45">cap</p></div>
        <div className="rounded-xl bg-white/6 p-3"><p className="font-black text-white">{venue.rows}</p><p className="text-xs text-white/45">rows</p></div>
        <div className="rounded-xl bg-white/6 p-3"><p className="font-black text-white">{venue.seatsPerRow}</p><p className="text-xs text-white/45">seats</p></div>
      </div>
      <div className="mt-5">
        <CrowdHeatBar value={venue.occupancy} />
      </div>
      <NeonButton href="/admin/analytics" variant="ghost" className="mt-5 w-full">Schedule Preview</NeonButton>
    </GlassPanel>
  );
}

export function VenueMapGrid({ venues }: { venues: VenueRecord[] }) {
  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{venues.map((venue) => <VenueNode key={venue.id} venue={venue} />)}</div>;
}

export function AnalyticsMatrix({ values, compact = false }: { values: number[]; compact?: boolean }) {
  return (
    <GlassPanel className={compact ? "p-4" : ""}>
      <h2 className={compact ? "text-base font-black text-white" : "text-xl font-black text-white"}>Signal Matrix</h2>
      <div className={compact ? "mt-4 grid grid-cols-7 gap-1.5" : "mt-5 grid grid-cols-7 gap-2"}>
        {values.map((value, index) => (
          <div key={index} className={compact ? "aspect-square rounded-lg border border-white/10 bg-white/5 p-1.5" : "aspect-square rounded-xl border border-white/10 bg-white/5 p-2"}>
            <div className="h-full rounded-md bg-cyan-300/20" style={{ opacity: Math.max(0.25, value / 100) }} />
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function SignalCard({ title, children, action }: { title: string; children: ReactNode; action?: { href: string; label: string } }) {
  return (
    <GlassPanel>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-black text-white">{title}</h2>
        {action ? <Link href={action.href} className="text-sm font-bold text-cyan-100 hover:text-white">{action.label}</Link> : null}
      </div>
      <div className="mt-5">{children}</div>
    </GlassPanel>
  );
}
