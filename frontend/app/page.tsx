import { AppShell } from "@/components/AppShell";
import { NeonButton } from "@/components/NeonButton";
import { CapacityRing, ControlChip, CrowdHeatBar, GlassPanel, MetricOrb, StatusBeacon } from "@/components/OpsUI";
import { events, venues } from "@/lib/data";

const featureSignals = [
  { label: "Capacity Control", tone: "cyan" as const },
  { label: "QR Access", tone: "lime" as const },
  { label: "Waitlist Flow", tone: "violet" as const },
  { label: "Venue Grid", tone: "amber" as const },
  { label: "Live Crowd Pulse", tone: "cyan" as const },
];

export default function Home() {
  const focusEvent = events[3] ?? events[0];
  const crowd = Math.round((focusEvent.registeredCount / focusEvent.capacity) * 100);

  return (
    <AppShell>
      <section className="relative py-8 sm:py-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-5 flex justify-center">
            <ControlChip tone="lime">Live campus operations grid</ControlChip>
          </div>
          <p className="text-6xl font-extrabold normal-case leading-none tracking-tight text-white sm:text-8xl lg:text-9xl">
            EventFlow AI
          </p>
          <h1 className="mt-5 text-3xl font-black normal-case leading-tight tracking-wide text-cyan-100 sm:text-4xl lg:text-5xl">
            Live Campus Flow Intelligence
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/62 sm:text-lg">
            Track event capacity, venue pressure, gate movement, waitlists, and access passes in real time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <NeonButton href="/events">Open Event Radar</NeonButton>
            <NeonButton href="/volunteer/scan" variant="secondary">Gate Scanner</NeonButton>
            <NeonButton href="/admin/analytics" variant="ghost">Analytics Core</NeonButton>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <GlassPanel className="relative min-h-[560px] overflow-hidden p-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.10)_1px,transparent_1px)] [background-size:54px_54px]" />
          <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
          <div className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet/14" />
          <div className="absolute left-[16%] top-[24%] h-px w-[68%] rotate-[12deg] bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
          <div className="absolute left-[20%] top-[68%] h-px w-[62%] -rotate-[9deg] bg-gradient-to-r from-transparent via-lime/25 to-transparent" />

          <div className="relative grid min-h-[560px] gap-5 p-5 lg:grid-cols-[260px_1fr_260px]">
            <div className="grid content-between gap-5">
              <GlassPanel className="bg-void/45">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/55">Primary signal</p>
                <h2 className="mt-3 text-2xl font-black text-white">{focusEvent.title}</h2>
                <p className="mt-2 text-sm text-white/55">{focusEvent.venue}</p>
                <div className="mt-5">
                  <CrowdHeatBar value={crowd} />
                </div>
              </GlassPanel>
              <GlassPanel className="bg-void/45">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/55">Gate movement</p>
                <div className="mt-4 grid gap-3">
                  {["Main Gate", "North Entry", "Overflow"].map((gate, index) => (
                    <div key={gate} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-sm font-bold text-white/70">{gate}</span>
                      <StatusBeacon status={index === 2 ? "filling" : "live"} label={index === 2 ? "Queue" : "Open"} />
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>

            <div className="relative grid place-items-center">
              <div className="absolute h-72 w-72 rounded-full border border-cyan-300/20 shadow-glow" style={{ animation: "beacon 3.2s ease-in-out infinite" }} />
              <div className="absolute h-48 w-48 rounded-full border border-lime/20" />
              <CapacityRing value={crowd} label="campus load" size="lg" />
              {venues.slice(0, 6).map((venue, index) => {
                const positions = [
                  "left-[6%] top-[14%]",
                  "right-[8%] top-[16%]",
                  "left-[12%] bottom-[18%]",
                  "right-[11%] bottom-[20%]",
                  "left-[42%] top-[5%]",
                  "left-[42%] bottom-[6%]",
                ];
                return (
                  <div key={venue.id} className={`absolute ${positions[index]} w-36 rounded-2xl border border-cyan-200/12 bg-void/72 p-3 backdrop-blur-xl`}>
                    <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-white/55">{venue.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-lg font-black text-white">{venue.occupancy}%</span>
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-glow" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid content-between gap-5">
              <GlassPanel className="bg-void/45">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/55">Event pressure</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MetricOrb label="Reg" value={String(focusEvent.registeredCount)} tone="cyan" />
                  <MetricOrb label="Queue" value={String(focusEvent.waitlistCount)} tone="violet" />
                </div>
              </GlassPanel>
              <GlassPanel className="bg-void/45">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/55">Access pass state</p>
                <div className="mt-4 rounded-2xl border border-lime/20 bg-lime/10 p-4">
                  <p className="text-3xl font-black text-white">VALID</p>
                  <p className="mt-1 text-sm font-bold text-lime">Single-use encrypted entry lane active</p>
                </div>
              </GlassPanel>
            </div>
          </div>
        </GlassPanel>

        <div className="grid gap-5">
          {featureSignals.map((feature) => (
            <GlassPanel key={feature.label} className="flex items-center justify-between gap-4 p-4">
              <ControlChip tone={feature.tone}>{feature.label}</ControlChip>
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-glow" />
            </GlassPanel>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
