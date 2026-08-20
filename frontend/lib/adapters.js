function normalizeStatus(status) {
  const value = String(status || "OPEN").toUpperCase();
  if (value === "LIVE") return "live";
  if (value === "CLOSED" || value === "COMPLETED" || value === "CANCELLED") return "closed";
  if (value === "DRAFT") return "filling";
  return "open";
}

function denormalizeStatus(status) {
  const value = String(status || "OPEN").toUpperCase();
  if (["DRAFT", "OPEN", "CLOSED", "LIVE", "COMPLETED", "CANCELLED"].includes(value)) return value;
  if (value === "FILLING" || value === "WAITLIST") return "OPEN";
  return "OPEN";
}

function getVenueLabel(event) {
  if (event?.venue?.name) return event.venue.name;
  return event?.venueName || event?.venue || "Unassigned venue";
}

function getRegisteredCount(event) {
  return Number(event?.confirmedCount ?? event?.registeredCount ?? event?._count?.registrations ?? 0);
}

export function toUiEvent(event) {
  const registeredCount = getRegisteredCount(event);
  const checkedInCount = Number(event?.checkedInCount ?? event?._count?.checkIns ?? 0);
  const waitlistCount = Number(event?.waitlistCount ?? event?._count?.waitlistEntries ?? 0);

  return {
    ...event,
    id: event.id,
    title: event.title,
    description: event.description || "",
    venue: getVenueLabel(event),
    startTime: event.startTime,
    endTime: event.endTime,
    capacity: Number(event.capacity || 0),
    registeredCount,
    checkedInCount,
    waitlistCount,
    status: normalizeStatus(event.status),
    backendStatus: event.status,
    category: event.venue?.zone || event.category || "IIITA",
    remainingSeats: Number(event.remainingSeats ?? Math.max(Number(event.capacity || 0) - registeredCount, 0)),
  };
}

export function toUiVenue(venue) {
  const occupancy = venue.averageUtilization ?? venue.occupancy ?? 0;

  return {
    ...venue,
    id: venue.id || venue.venueId,
    name: venue.name || venue.venueName,
    building: venue.location || "IIITA",
    room: venue.zone || "Campus",
    location: venue.location || venue.zone || "IIITA Campus",
    capacity: Number(venue.capacity || 0),
    rows: Number(venue.rows || 0),
    seatsPerRow: Number(venue.seatsPerRow || 0),
    occupancy: Math.round(Number(occupancy || 0)),
    status: Number(venue.conflictCount || 0) > 0 ? "closed" : "open",
  };
}

export function unwrapData(payload, key) {
  const data = payload?.data ?? payload;
  if (key && data?.[key] !== undefined) return data[key];
  return data;
}

export function buildEventPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    venueId: form.venueId,
    startTime: new Date(form.startTime).toISOString(),
    endTime: new Date(form.endTime).toISOString(),
    capacity: Number(form.capacity),
    waitlistCapacity: Number(form.waitlistCapacity),
    registrationDeadline: new Date(form.registrationDeadline).toISOString(),
    status: denormalizeStatus(form.status),
    noShowRate: Number(form.noShowRate) || 0.4,
  };
}

