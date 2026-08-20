"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorAlert, SuccessAlert } from "@/components/Alert";
import { FormInput } from "@/components/FormInput";
import { NeonButton } from "@/components/NeonButton";
import { GlassPanel } from "@/components/OpsUI";
import { get, post } from "@/lib/api";
import { buildEventPayload, toUiVenue, unwrapData } from "@/lib/adapters";
import { useAutocomplete } from "@/lib/useAutocomplete";
import type { VenueRecord } from "@/lib/data";

const initialForm = {
  title: "",
  description: "",
  venueId: "",
  startTime: "",
  endTime: "",
  capacity: "100",
  waitlistCapacity: "25",
  noShowRate: "0.4",
  registrationDeadline: "",
  status: "OPEN",
};

export function NewEventClient({ fallbackVenues }: { fallbackVenues: VenueRecord[] }) {
  const router = useRouter();
  const [venues, setVenues] = useState(fallbackVenues);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedVenue = venues.find((venue) => venue.id === form.venueId);
  const [venueSearch, setVenueSearch] = useState("");
  const { suggestions: venueSuggestions } = useAutocomplete(venueSearch, { limit: 6 });

  useEffect(() => {
    let active = true;
    get("/api/venues")
      .then((payload) => {
        const records = unwrapData(payload, "venues");
        if (active && Array.isArray(records)) setVenues(records.map(toUiVenue));
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Venue sync failed. Cached venues are available.");
      });
    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setNotice("");

    try {
      const payload = await post("/api/events", buildEventPayload(form));
      const created = unwrapData(payload, "event") || unwrapData(payload);
      setNotice("Event launched successfully.");
      router.push(created?.id ? `/organizer/events/${created.id}` : "/organizer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to launch event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      {error ? <ErrorAlert title="Launch warning">{error}</ErrorAlert> : null}
      {notice ? <SuccessAlert title="Event created">{notice}</SuccessAlert> : null}
      <GlassPanel>
        <h2 className="mb-5 text-xl font-black text-white">Event Identity</h2>
        <div className="grid gap-5">
          <FormInput label="Title" value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Campus Innovation Expo" required />
          <label className="grid gap-2 text-sm font-bold text-white/75">
            Description
            <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} className="min-h-32 rounded-xl border border-cyan-200/14 bg-white/6 px-3 py-3 text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10" placeholder="Describe the event signal." />
          </label>
        </div>
      </GlassPanel>
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <h2 className="mb-5 text-xl font-black text-white">Venue Assignment</h2>
          <label className="grid gap-2 text-sm font-bold text-white/75">
            Venue
            <select value={form.venueId} onChange={(event) => updateField("venueId", event.target.value)} className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none transition focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10" required>
              <option value="">Select venue</option>
              {venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name} / {venue.room}</option>)}
            </select>
          </label>
          <label className="relative mt-4 grid gap-2 text-sm font-bold text-white/75">
            Venue autocomplete
            <input
              value={venueSearch}
              onChange={(event) => setVenueSearch(event.target.value)}
              placeholder={selectedVenue ? selectedVenue.name : "Search venue or zone"}
              className="min-h-11 rounded-xl border border-cyan-200/14 bg-white/6 px-3 text-white outline-none placeholder:text-white/28 focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10"
            />
            {venueSuggestions.filter((suggestion: any) => ["VENUE", "ZONE"].includes(suggestion.type)).length > 0 ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 grid gap-2 rounded-2xl border border-violet/20 bg-void/95 p-3 shadow-violet backdrop-blur-xl">
                {venueSuggestions.filter((suggestion: any) => ["VENUE", "ZONE"].includes(suggestion.type)).map((suggestion: any, index) => (
                  <button
                    key={`${suggestion.label}-${index}`}
                    type="button"
                    onClick={() => {
                      updateField("venueId", suggestion.metadata?.venueId || "");
                      setVenueSearch(suggestion.label);
                    }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/6 px-3 py-2 text-left transition hover:border-violet/35 hover:bg-violet/10"
                  >
                    <span className="font-black text-white">{suggestion.label}</span>
                    <span className="rounded-full border border-violet/20 bg-violet/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100">{suggestion.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </GlassPanel>
        <GlassPanel>
          <h2 className="mb-5 text-xl font-black text-white">Capacity Rules</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput label="Capacity" type="number" value={form.capacity} onChange={(event) => updateField("capacity", event.target.value)} min={1} required />
            <FormInput label="Waitlist capacity" type="number" value={form.waitlistCapacity} onChange={(event) => updateField("waitlistCapacity", event.target.value)} min={0} required />
            <FormInput label="No-show rate" type="number" value={form.noShowRate} onChange={(event) => updateField("noShowRate", event.target.value)} min={0} max={1} step={0.1} required />
          </div>
        </GlassPanel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <h2 className="mb-5 text-xl font-black text-white">Registration Window</h2>
          <div className="grid gap-5">
            <FormInput label="Start time" type="datetime-local" value={form.startTime} onChange={(event) => updateField("startTime", event.target.value)} required />
            <FormInput label="End time" type="datetime-local" value={form.endTime} onChange={(event) => updateField("endTime", event.target.value)} required />
            <FormInput label="Registration deadline" type="datetime-local" value={form.registrationDeadline} onChange={(event) => updateField("registrationDeadline", event.target.value)} required />
          </div>
        </GlassPanel>
        <GlassPanel>
          <h2 className="mb-5 text-xl font-black text-white">Launch Status</h2>
          <label className="grid gap-2 text-sm font-bold text-white/75">
            Status
            <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="min-h-11 rounded-xl border border-cyan-200/14 bg-void px-3 text-white outline-none transition focus:border-cyan-300/45 focus:ring-4 focus:ring-cyan-300/10">
              {["DRAFT", "OPEN", "LIVE", "CLOSED"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <NeonButton type="submit" disabled={isSubmitting} className="mt-6 w-full">{isSubmitting ? "Launching..." : "Launch Event"}</NeonButton>
        </GlassPanel>
      </div>
    </form>
  );
}
