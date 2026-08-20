function calculateExpectedShowRate(noShowRate) {
  return 1 - noShowRate;
}

function calculateExpectedAttendance(registeredAttendees, noShowRate) {
  const expectedShowRate = calculateExpectedShowRate(noShowRate);
  return Math.round(registeredAttendees * expectedShowRate);
}

function calculateExpectedNoShows(registeredAttendees, noShowRate) {
  const expectedAttendance = calculateExpectedAttendance(registeredAttendees, noShowRate);
  return registeredAttendees - expectedAttendance;
}

function calculateCapacityUtilization(registeredAttendees, noShowRate, capacity) {
  const expectedAttendance = calculateExpectedAttendance(registeredAttendees, noShowRate);
  return (expectedAttendance / capacity) * 100;
}

function calculateRiskLevel(expectedAttendance, capacity) {
  if (expectedAttendance <= capacity * 0.80) {
    return { level: "LOW", message: "Expected attendance is well within venue capacity." };
  }

  if (expectedAttendance <= capacity) {
    return { level: "MODERATE", message: "Expected attendance approaches venue capacity." };
  }

  const overBy = Math.round(expectedAttendance - capacity);
  return { level: "HIGH", message: `Expected attendance exceeds venue capacity by ${overBy} attendees.` };
}

function calculateActualNoShowRate(confirmedAttendees, checkedInAttendees) {
  if (confirmedAttendees === 0) return 0;
  return ((confirmedAttendees - checkedInAttendees) / confirmedAttendees) * 100;
}

function calculatePredictionDifference(expectedNoShows, actualNoShows) {
  if (expectedNoShows === 0) return actualNoShows;
  return Math.round(((actualNoShows - expectedNoShows) / expectedNoShows) * 100);
}

const prisma = require("../../config/prisma");
const { ACTIONS, SUBJECTS, asSubject, authorize } = require("../../authorization/ability");
const { hasOverlap } = require("../../dsa/intervalScheduler");
const ApiError = require("../../utils/ApiError");
const safeUser = require("../../utils/safeUser");
const { scheduleEventLifecycleJobs } = require("../../queues/scheduler");
const { logger } = require("../../observability/logger");
const { EVENT_STATUSES } = require("./event.validation");

async function getVenueOrThrow(venueId) {
  const venue = await prisma.venue.findUnique({
    where: {
      id: venueId,
    },
  });

  if (!venue) {
    throw new ApiError(404, "Venue not found");
  }

  return venue;
}

async function assertEventRules(data, options = {}) {
  const venue = await getVenueOrThrow(data.venueId);

  if (data.startTime >= data.endTime) {
    throw new ApiError(400, "startTime must be before endTime");
  }

  if (data.registrationDeadline >= data.startTime) {
    throw new ApiError(400, "registrationDeadline must be before startTime");
  }

  if (data.capacity > venue.capacity) {
    throw new ApiError(400, "Event capacity cannot exceed venue capacity");
  }

  const existingEvents = await prisma.event.findMany({
    where: {
      venueId: data.venueId,
      id: options.excludeEventId
        ? {
            not: options.excludeEventId,
          }
        : undefined,
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  const existingIntervals = existingEvents.map((event) => ({
    id: event.id,
    start: event.startTime,
    end: event.endTime,
  }));

  if (hasOverlap(data.startTime, data.endTime, existingIntervals)) {
    throw new ApiError(409, "Venue has a conflicting event in this time range");
  }
}

async function createEvent(data, user) {
  authorize(user, ACTIONS.CREATE, SUBJECTS.EVENT);
  await assertEventRules(data);

  const event = await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        ...data,
        createdById: user.id,
      },
    });

    await tx.eventLog.create({
      data: {
        eventId: event.id,
        type: "EVENT_CREATED",
        message: "Event created",
        metadata: {
          createdById: user.id,
        },
      },
    });

    return event;
  });

  await scheduleEventLifecycleJobs(event).catch((error) => {
    logger.error({ error, eventId: event.id }, "BullMQ event lifecycle scheduling failed");
  });

  return event;
}

function buildEventWhere(query, user) {
  const where = {};

  if (query.status) {
    if (!EVENT_STATUSES.includes(query.status)) {
      throw new ApiError(400, "Invalid event status");
    }

    where.status = query.status;
  }

  if (query.venueId) {
    where.venueId = query.venueId;
  }

  if (query.search) {
    where.OR = [
      {
        title: {
          contains: query.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: query.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (query.upcoming === "true") {
    where.startTime = {
      gte: new Date(),
    };
  }

  if (query.createdByMe === "true") {
    where.createdById = user.id;
  }

  return where;
}

async function listEvents(query, user) {
  const events = await prisma.event.findMany({
    where: buildEventWhere(query, user),
    include: {
      venue: true,
      createdBy: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return events.map((event) => {
    const noShowRate = event.noShowRate ?? 0.4;
    const expectedShowRate = calculateExpectedShowRate(noShowRate);

    const confirmedCount = event.registrations.filter(
      (r) => r.status === "CONFIRMED" || r.status === "CHECKED_IN"
    ).length;

    const expectedAttendance = calculateExpectedAttendance(confirmedCount, noShowRate);
    const expectedNoShows = calculateExpectedNoShows(confirmedCount, noShowRate);

    return {
      ...event,
      createdBy: safeUser(event.createdBy),
      expectedShowRate: expectedShowRate.toFixed(2),
      expectedAttendance: Math.round(expectedAttendance),
      expectedNoShows: Math.round(expectedNoShows),
    };
  });
}

async function getEventById(id) {
  const event = await prisma.event.findUnique({
    where: {
      id,
    },
    include: {
      venue: true,
      createdBy: true,
    },
  });

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
}

async function getEventDetails(id) {
  const event = await getEventById(id);

  const confirmedCount = await prisma.registration.count({
    where: {
      eventId: id,
      status: {
        in: ["CONFIRMED", "CHECKED_IN"],
      },
    },
  });

  const waitlistCount = await prisma.waitlistEntry.count({
    where: {
      eventId: id,
      status: "WAITING",
    },
  });

  const checkedInCount = await prisma.checkIn.count({
    where: {
      eventId: id,
    },
  });

  const noShowRate = event.noShowRate ?? 0.4;
  const expectedShowRate = calculateExpectedShowRate(noShowRate);
  const expectedAttendance = calculateExpectedAttendance(confirmedCount, noShowRate);
  const expectedNoShows = calculateExpectedNoShows(confirmedCount, noShowRate);
  const capacityUtilization = calculateCapacityUtilization(
    confirmedCount,
    noShowRate,
    event.capacity
  );
  const riskLevel = calculateRiskLevel(expectedAttendance, event.capacity);

  return {
    ...event,
    createdBy: safeUser(event.createdBy),
    confirmedCount,
    waitlistCount,
    checkedInCount,
    expectedShowRate,
    expectedAttendance,
    expectedNoShows,
    remainingSeats: Math.max(event.capacity - confirmedCount, 0),
    capacityUtilization: capacityUtilization.toFixed(1),
    riskLevel: riskLevel.level,
    riskMessage: riskLevel.message,
  };
}

async function updateEvent(id, data, user) {
  const existingEvent = await getEventById(id);
  authorize(user, ACTIONS.UPDATE, asSubject(SUBJECTS.EVENT, existingEvent));

  const nextEvent = {
    ...existingEvent,
    ...data,
  };

  await assertEventRules(nextEvent, {
    excludeEventId: id,
  });

  const event = await prisma.event.update({
    where: {
      id,
    },
    data,
  });

  await scheduleEventLifecycleJobs(event).catch((error) => {
    logger.error({ error, eventId: event.id }, "BullMQ event lifecycle rescheduling failed");
  });

  return event;
}

async function deleteEvent(id, user) {
  const event = await getEventById(id);
  authorize(user, ACTIONS.DELETE, asSubject(SUBJECTS.EVENT, event));

  return prisma.$transaction(async (tx) => {
    await tx.checkIn.deleteMany({
      where: {
        eventId: id,
      },
    });
    await tx.waitlistEntry.deleteMany({
      where: {
        eventId: id,
      },
    });
    await tx.registration.deleteMany({
      where: {
        eventId: id,
      },
    });
    await tx.eventLog.deleteMany({
      where: {
        eventId: id,
      },
    });

    return tx.event.delete({
      where: {
        id,
      },
    });
  });
}

module.exports = {
  createEvent,
  listEvents,
  getEventDetails,
  updateEvent,
  deleteEvent,
};