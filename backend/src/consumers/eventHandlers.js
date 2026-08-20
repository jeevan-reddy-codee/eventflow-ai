const prisma = require("../config/prisma");
const { syncEventCountersFromDb } = require("../utils/eventCounters");
const { TOPICS } = require("../utils/kafkaTopics");

const COUNTER_SYNC_TOPICS = new Set([
  TOPICS.REGISTRATION_CREATED,
  TOPICS.WAITLIST_JOINED,
  TOPICS.WAITLIST_PROMOTED,
  TOPICS.REGISTRATION_CANCELLED,
  TOPICS.CHECKIN_COMPLETED,
  TOPICS.NO_SHOW_RELEASED,
]);

function requireString(value, fieldName) {
  if (!value || typeof value !== "string") {
    throw new Error(`Kafka payload missing ${fieldName}`);
  }

  return value;
}

async function assertEventExists(eventId) {
  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
    },
  });

  if (!event) {
    throw new Error(`Kafka event references missing event ${eventId}`);
  }
}

async function assertRegistrationExists(registrationId) {
  if (!registrationId) {
    return;
  }

  const registration = await prisma.registration.findUnique({
    where: {
      id: registrationId,
    },
    select: {
      id: true,
    },
  });

  if (!registration) {
    throw new Error(`Kafka event references missing registration ${registrationId}`);
  }
}

async function writeAuditLog(topic, payload, context) {
  if (!payload.eventId) {
    return null;
  }

  return prisma.eventLog.create({
    data: {
      eventId: payload.eventId,
      type: "KAFKA_EVENT_PUBLISHED",
      message: `Kafka consumer processed ${topic}`,
      metadata: {
        topic,
        consumedTopic: context.consumedTopic,
        partition: context.partition,
        offset: context.offset,
        attempt: context.attempt,
        payload,
      },
    },
  });
}

async function handleEventFlowAITopic(payload, context) {
  const topic = context.topic;
  const eventId = requireString(payload.eventId, "eventId");

  await assertEventExists(eventId);
  await assertRegistrationExists(payload.registrationId);

  if (COUNTER_SYNC_TOPICS.has(topic)) {
    await syncEventCountersFromDb(eventId, {
      emitSocketUpdate: false,
    });
  }

  await writeAuditLog(topic, payload, context);
}

async function handleScanFailed(payload, context) {
  if (payload.eventId) {
    await assertEventExists(payload.eventId);
    await writeAuditLog(context.topic, payload, context);
  }
}

function buildTopicHandlers() {
  return {
    [TOPICS.REGISTRATION_CREATED]: handleEventFlowAITopic,
    [TOPICS.WAITLIST_JOINED]: handleEventFlowAITopic,
    [TOPICS.WAITLIST_PROMOTED]: handleEventFlowAITopic,
    [TOPICS.REGISTRATION_CANCELLED]: handleEventFlowAITopic,
    [TOPICS.CHECKIN_COMPLETED]: handleEventFlowAITopic,
    [TOPICS.NO_SHOW_RELEASED]: handleEventFlowAITopic,
    [TOPICS.CREW_ACCESS_GRANTED]: handleEventFlowAITopic,
    [TOPICS.CREW_ACCESS_UPDATED]: handleEventFlowAITopic,
    [TOPICS.CREW_ACCESS_REVOKED]: handleEventFlowAITopic,
    [TOPICS.CREW_SPECIAL_ENTRY_USED]: handleEventFlowAITopic,
    [TOPICS.SCAN_FAILED]: handleScanFailed,
  };
}

module.exports = {
  buildTopicHandlers,
};
