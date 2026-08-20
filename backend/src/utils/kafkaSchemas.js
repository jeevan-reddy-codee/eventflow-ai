const Ajv = require("ajv");

const { DLQ_TOPICS, RETRY_TOPICS, TOPICS } = require("./kafkaTopics");

class KafkaValidationError extends Error {
  constructor(topic, errors, direction = "message") {
    super(`Invalid Kafka ${direction} for ${topic}`);
    this.name = "KafkaValidationError";
    this.topic = topic;
    this.details = errors.map((error) => ({
      path: error.instancePath || "/",
      message: error.message,
      keyword: error.keyword,
      params: error.params,
    }));
  }
}

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
});

const nullableString = {
  type: ["string", "null"],
};

const metadata = {
  type: "object",
  additionalProperties: true,
};

const baseEventProperties = {
  eventId: {
    type: "string",
    minLength: 1,
  },
  userId: nullableString,
  registrationId: nullableString,
  timestamp: {
    type: "string",
    minLength: 1,
  },
  metadata,
};

function eventSchema(required = ["eventId", "timestamp", "metadata"]) {
  return {
    type: "object",
    additionalProperties: true,
    required,
    properties: baseEventProperties,
  };
}

const topicSchemas = {
  [TOPICS.REGISTRATION_CREATED]: eventSchema(),
  [TOPICS.WAITLIST_JOINED]: eventSchema(),
  [TOPICS.WAITLIST_PROMOTED]: eventSchema(),
  [TOPICS.REGISTRATION_CANCELLED]: eventSchema(),
  [TOPICS.CHECKIN_COMPLETED]: eventSchema(),
  [TOPICS.NO_SHOW_RELEASED]: eventSchema(),
  [TOPICS.CREW_ACCESS_GRANTED]: eventSchema(),
  [TOPICS.CREW_ACCESS_UPDATED]: eventSchema(),
  [TOPICS.CREW_ACCESS_REVOKED]: eventSchema(),
  [TOPICS.CREW_SPECIAL_ENTRY_USED]: eventSchema(),
  [TOPICS.SCAN_FAILED]: eventSchema(["timestamp", "metadata"]),
};

const retryEnvelopeSchema = {
  type: "object",
  additionalProperties: true,
  required: [
    "originalTopic",
    "originalPayload",
    "originalTimestamp",
    "attempt",
    "maxAttempts",
    "failedAt",
    "retryAfter",
    "error",
    "consumer",
  ],
  properties: {
    originalTopic: {
      type: "string",
      minLength: 1,
    },
    originalPayload: {
      type: "object",
      additionalProperties: true,
    },
    originalKey: nullableString,
    originalTimestamp: {
      type: "string",
      minLength: 1,
    },
    attempt: {
      type: "integer",
      minimum: 1,
    },
    maxAttempts: {
      type: "integer",
      minimum: 1,
    },
    failedAt: {
      type: "string",
      minLength: 1,
    },
    retryAfter: {
      type: "string",
      minLength: 1,
    },
    error: {
      type: "object",
      additionalProperties: true,
      required: ["name", "message"],
      properties: {
        name: {
          type: "string",
          minLength: 1,
        },
        message: {
          type: "string",
          minLength: 1,
        },
        stack: nullableString,
      },
    },
    consumer: {
      type: "object",
      additionalProperties: true,
      required: ["groupId", "category"],
      properties: {
        groupId: {
          type: "string",
          minLength: 1,
        },
        category: {
          type: "string",
          enum: ["REGISTRATION", "CHECKIN", "CREW"],
        },
      },
    },
  },
};

const validators = new Map(
  Object.entries(topicSchemas).map(([topic, schema]) => [topic, ajv.compile(schema)])
);

for (const topic of [...Object.values(RETRY_TOPICS), ...Object.values(DLQ_TOPICS)]) {
  validators.set(topic, ajv.compile(retryEnvelopeSchema));
}

function getKafkaSchema(topic) {
  return topicSchemas[topic] || null;
}

function getKnownKafkaTopics() {
  return Object.keys(topicSchemas);
}

function validateKafkaMessage(topic, payload, direction = "message") {
  const validate = validators.get(topic);

  if (!validate) {
    throw new KafkaValidationError(topic, [
      {
        instancePath: "/topic",
        message: "is not a supported EventFlow AI Kafka topic",
        keyword: "topic",
        params: {
          topic,
        },
      },
    ], direction);
  }

  if (!validate(payload)) {
    throw new KafkaValidationError(topic, validate.errors || [], direction);
  }

  return payload;
}

function formatKafkaValidationError(error) {
  if (!(error instanceof KafkaValidationError)) {
    return null;
  }

  return {
    topic: error.topic,
    message: error.message,
    details: error.details,
  };
}

module.exports = {
  KafkaValidationError,
  formatKafkaValidationError,
  getKafkaSchema,
  getKnownKafkaTopics,
  validateKafkaMessage,
};
