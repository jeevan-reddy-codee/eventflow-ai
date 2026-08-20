const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = require("../src/config/prisma");

const PASSWORD = "password123";

const users = [
  { name: "Admin", email: "admin@iiita.ac.in", role: "ADMIN" },
  { name: "Organizer", email: "organizer@iiita.ac.in", role: "ORGANIZER" },
  { name: "Volunteer", email: "volunteer@iiita.ac.in", role: "VOLUNTEER" },
  { name: "Student One", email: "student1@iiita.ac.in", role: "STUDENT" },
  { name: "Student Two", email: "student2@iiita.ac.in", role: "STUDENT" },
  { name: "Student Three", email: "student3@iiita.ac.in", role: "STUDENT" },
  { name: "Student Four", email: "student4@iiita.ac.in", role: "STUDENT" },
  { name: "Student Five", email: "student5@iiita.ac.in", role: "STUDENT" },
];

const venues = [
  ["Main Auditorium", "IIITA Campus", "AUD-MAIN", 800, 40, 20],
  ["CC3 5006", "CC3, 5th Floor", "CC3-5006", 120, 12, 10],
  ["CC3 5007", "CC3, 5th Floor", "CC3-5007", 120, 12, 10],
  ["CC3 5054", "CC3, 5th Floor", "CC3-5054", 80, 8, 10],
  ["CC3 5055", "CC3, 5th Floor", "CC3-5055", 80, 8, 10],
  ["SAC", "Student Activity Centre", "SAC", 300, 20, 15],
  ["Pavillion", "IIITA Sports Pavillion", "PAV", 400, 20, 20],
  ["CC3 Lab 5404", "CC3 Lab Block", "CC3-LAB-5404", 100, 10, 10],
  ["CC3 Lab 5041", "CC3 Lab Block", "CC3-LAB-5041", 80, 8, 10],
  ["CC3 Lab 5042", "CC3 Lab Block", "CC3-LAB-5042", 80, 8, 10],
].map(([name, location, zone, capacity, rows, seatsPerRow]) => ({
  name,
  location,
  zone,
  capacity,
  rows,
  seatsPerRow,
}));

const events = [
  ["Innovation", "Main Auditorium", "Technical", "2026-07-01T10:00:00.000Z", "2026-07-01T12:00:00.000Z", 700, 100],
  ["Mime", "Main Auditorium", "Cultural", "2026-07-01T14:00:00.000Z", "2026-07-01T16:00:00.000Z", 750, 100],
  ["CrossRoads", "CC3 5006", "Informal", "2026-07-01T10:00:00.000Z", "2026-07-01T11:00:00.000Z", 100, 40],
  ["Model United Nations - Committee Room 1", "CC3 5054", "Literary", "2026-07-01T10:00:00.000Z", "2026-07-01T13:00:00.000Z", 75, 25],
  ["Model United Nations - Committee Room 2", "CC3 5055", "Literary", "2026-07-01T10:00:00.000Z", "2026-07-01T13:00:00.000Z", 75, 25],
  ["Carpe Diem", "Main Auditorium", "Cultural", "2026-07-02T10:00:00.000Z", "2026-07-02T12:00:00.000Z", 750, 100],
  ["IIITA's Got Latent", "SAC", "Cultural", "2026-07-01T16:00:00.000Z", "2026-07-01T18:00:00.000Z", 250, 50],
  ["Dumb Charades", "Pavillion", "Informal", "2026-07-01T10:00:00.000Z", "2026-07-01T12:00:00.000Z", 250, 80],
  ["Psychedelia", "SAC", "Cultural", "2026-07-02T16:00:00.000Z", "2026-07-02T18:00:00.000Z", 250, 50],
  ["Face Painting", "Pavillion", "Art", "2026-07-02T10:00:00.000Z", "2026-07-02T12:00:00.000Z", 200, 50],
  ["GeekCamp Classes - Batch A", "CC3 5006", "Technical", "2026-07-02T10:00:00.000Z", "2026-07-02T12:00:00.000Z", 100, 40],
  ["GeekCamp Classes - Batch B", "CC3 5007", "Technical", "2026-07-02T10:00:00.000Z", "2026-07-02T12:00:00.000Z", 100, 40],
  ["IIITA Coding League", "CC3 Lab 5404", "Coding", "2026-07-01T10:00:00.000Z", "2026-07-01T13:00:00.000Z", 90, 40],
  ["CodeGuerra - Lab A", "CC3 Lab 5041", "Coding", "2026-07-01T10:00:00.000Z", "2026-07-01T12:00:00.000Z", 75, 25],
  ["CodeGuerra - Lab B", "CC3 Lab 5042", "Coding", "2026-07-01T10:00:00.000Z", "2026-07-01T12:00:00.000Z", 75, 25],
  ["CodeQueen - Lab A", "CC3 Lab 5041", "Coding", "2026-07-01T14:00:00.000Z", "2026-07-01T16:00:00.000Z", 75, 25],
  ["CodeQueen - Lab B", "CC3 Lab 5042", "Coding", "2026-07-01T14:00:00.000Z", "2026-07-01T16:00:00.000Z", 75, 25],
  ["AlgoArena - Lab A", "CC3 Lab 5041", "Coding", "2026-07-02T10:00:00.000Z", "2026-07-02T12:00:00.000Z", 75, 25],
  ["AlgoArena - Lab B", "CC3 Lab 5042", "Coding", "2026-07-02T10:00:00.000Z", "2026-07-02T12:00:00.000Z", 75, 25],
].map(([title, venueName, category, startTime, endTime, capacity, waitlistCapacity]) => ({
  title,
  venueName,
  category,
  startTime: new Date(startTime),
  endTime: new Date(endTime),
  capacity,
  waitlistCapacity,
}));

function tokenHash(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

async function upsertVenue(venue) {
  const existingVenue = await prisma.venue.findFirst({
    where: { zone: venue.zone },
  });

  if (existingVenue) {
    return prisma.venue.update({
      where: { id: existingVenue.id },
      data: venue,
    });
  }

  return prisma.venue.create({ data: venue });
}

async function upsertEvent(event, venue, organizer) {
  const data = {
    title: event.title,
    description: `Category: ${event.category}. Seeded IIITA event for EventFlow AI demos.`,
    venueId: venue.id,
    startTime: event.startTime,
    endTime: event.endTime,
    capacity: event.capacity,
    waitlistCapacity: event.waitlistCapacity,
    registrationDeadline: new Date(event.startTime.getTime() - 60 * 60 * 1000),
    status: "OPEN",
    createdById: organizer.id,
  };
  const existingEvent = await prisma.event.findFirst({
    where: { title: event.title },
  });

  if (existingEvent) {
    return prisma.event.update({
      where: { id: existingEvent.id },
      data,
    });
  }

  return prisma.event.create({ data });
}

async function addRegistration(event, user, status, seatNumber, volunteer, index) {
  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      userId: user.id,
      status,
      seatNumber,
      qrTokenHash: ["CONFIRMED", "CHECKED_IN"].includes(status)
        ? tokenHash(`${event.id}:${user.id}:${status}`)
        : null,
      checkedInAt: status === "CHECKED_IN" ? new Date(event.startTime.getTime() + 20 * 60 * 1000) : null,
    },
  });

  await prisma.eventLog.create({
    data: {
      eventId: event.id,
      type: "REGISTRATION_CREATED",
      message: `Seed ${status.toLowerCase()} registration created`,
      metadata: {
        registrationId: registration.id,
        userId: user.id,
        seatNumber,
      },
    },
  });

  if (status === "CHECKED_IN") {
    const checkIn = await prisma.checkIn.create({
      data: {
        eventId: event.id,
        userId: user.id,
        registrationId: registration.id,
        scannedById: volunteer.id,
        gateName: index % 2 === 0 ? "Gate A" : "Gate B",
        scannedAt: registration.checkedInAt,
      },
    });

    await prisma.eventLog.create({
      data: {
        eventId: event.id,
        type: "CHECKIN_SUCCESS",
        message: "Seed check-in completed",
        metadata: {
          checkInId: checkIn.id,
          registrationId: registration.id,
          userId: user.id,
        },
      },
    });
  }

  return registration;
}

async function addWaitlist(event, user, position) {
  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      userId: user.id,
      status: "WAITLISTED",
    },
  });
  const waitlistEntry = await prisma.waitlistEntry.create({
    data: {
      eventId: event.id,
      userId: user.id,
      position,
      status: "WAITING",
    },
  });

  await prisma.eventLog.create({
    data: {
      eventId: event.id,
      type: "WAITLIST_JOINED",
      message: "Seed waitlist entry created",
      metadata: {
        registrationId: registration.id,
        waitlistEntryId: waitlistEntry.id,
        userId: user.id,
        position,
      },
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const userByEmail = {};
  const venueByName = {};
  const eventByTitle = {};

  for (const user of users) {
    userByEmail[user.email] = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
      },
      create: {
        ...user,
        passwordHash,
      },
    });
  }

  for (const venue of venues) {
    venueByName[venue.name] = await upsertVenue(venue);
  }

  for (const event of events) {
    eventByTitle[event.title] = await upsertEvent(
      event,
      venueByName[event.venueName],
      userByEmail["organizer@iiita.ac.in"]
    );
  }

  const seededEventIds = Object.values(eventByTitle).map((event) => event.id);

  await prisma.checkIn.deleteMany({ where: { eventId: { in: seededEventIds } } });
  await prisma.waitlistEntry.deleteMany({ where: { eventId: { in: seededEventIds } } });
  await prisma.registration.deleteMany({ where: { eventId: { in: seededEventIds } } });
  await prisma.eventLog.deleteMany({ where: { eventId: { in: seededEventIds } } });

  for (const event of Object.values(eventByTitle)) {
    await prisma.eventLog.create({
      data: {
        eventId: event.id,
        type: "EVENT_CREATED",
        message: "Seed event created",
        metadata: {
          title: event.title,
          createdById: event.createdById,
        },
      },
    });
  }

  const volunteer = userByEmail["volunteer@iiita.ac.in"];
  const student1 = userByEmail["student1@iiita.ac.in"];
  const student2 = userByEmail["student2@iiita.ac.in"];
  const student3 = userByEmail["student3@iiita.ac.in"];
  const student4 = userByEmail["student4@iiita.ac.in"];
  const student5 = userByEmail["student5@iiita.ac.in"];

  await addRegistration(eventByTitle.Innovation, student1, "CHECKED_IN", "A1", volunteer, 0);
  await addRegistration(eventByTitle.Innovation, student2, "CONFIRMED", "A2", volunteer, 1);
  await addWaitlist(eventByTitle.Innovation, student3, 1);
  await addWaitlist(eventByTitle.Innovation, student4, 2);

  await addRegistration(eventByTitle["Carpe Diem"], student3, "CHECKED_IN", "A1", volunteer, 2);
  await addRegistration(eventByTitle["Carpe Diem"], student5, "CONFIRMED", "A2", volunteer, 3);
  await addWaitlist(eventByTitle["Carpe Diem"], student4, 1);

  await addRegistration(eventByTitle["CodeGuerra - Lab A"], student1, "CHECKED_IN", "A1", volunteer, 4);
  await addRegistration(eventByTitle["CodeGuerra - Lab A"], student2, "CONFIRMED", "A2", volunteer, 5);
  await addWaitlist(eventByTitle["CodeGuerra - Lab A"], student3, 1);

  await addRegistration(eventByTitle["CodeQueen - Lab A"], student4, "CONFIRMED", "A1", volunteer, 6);
  await addWaitlist(eventByTitle["CodeQueen - Lab A"], student5, 1);

  await addRegistration(eventByTitle["AlgoArena - Lab A"], student5, "CONFIRMED", "A1", volunteer, 7);
  await addWaitlist(eventByTitle["AlgoArena - Lab A"], student1, 1);

  await addRegistration(eventByTitle.Mime, student2, "CONFIRMED", "A1", volunteer, 8);
  await addRegistration(eventByTitle.CrossRoads, student3, "CONFIRMED", "A1", volunteer, 9);

  console.log("Seed complete.");
  console.log("Demo password for all users:", PASSWORD);
  console.log("Seeded users:", users.map((user) => user.email).join(", "));
  console.log(`Seeded venues: ${venues.length}`);
  console.log(`Seeded events: ${events.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
