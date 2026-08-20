const client = require("prom-client");

const prisma = require("../config/prisma");
const {
  QUEUE_NAMES,
  getAnalyticsQueue,
  getEventLifecycleQueue,
  getNotificationQueue,
} = require("../queues/queues");

const register = new client.Registry();

client.collectDefaultMetrics({
  prefix: "eventpulse_",
  register,
});

const httpRequestDuration = new client.Histogram({
  name: "eventpulse_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "eventpulse_http_requests_total",
  help: "Total HTTP requests.",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const domainEventsTotal = new client.Counter({
  name: "eventpulse_domain_events_total",
  help: "Domain events emitted by EventFlow AI services.",
  labelNames: ["event"],
  registers: [register],
});

const kafkaPublishesTotal = new client.Counter({
  name: "eventpulse_kafka_publishes_total",
  help: "Kafka publish attempts by topic and outcome.",
  labelNames: ["topic", "outcome"],
  registers: [register],
});

const outboxEventsTotal = new client.Counter({
  name: "eventpulse_outbox_events_total",
  help: "Kafka outbox events by outcome.",
  labelNames: ["outcome"],
  registers: [register],
});

const outboxEventsGauge = new client.Gauge({
  name: "eventpulse_outbox_events",
  help: "Current Kafka outbox event count by status.",
  labelNames: ["status"],
  async collect() {
    try {
      const statuses = ["PENDING", "PROCESSING", "PUBLISHED", "FAILED"];
      const counts = await prisma.outboxEvent.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      });
      const countByStatus = new Map(counts.map((row) => [row.status, row._count._all]));

      for (const status of statuses) {
        this.set({ status: status.toLowerCase() }, countByStatus.get(status) || 0);
      }
      this.set({ status: "unavailable" }, 0);
    } catch {
      this.set({ status: "unavailable" }, 1);
    }
  },
  registers: [register],
});

const outboxOldestPendingAge = new client.Gauge({
  name: "eventpulse_outbox_oldest_pending_age_seconds",
  help: "Age of the oldest pending Kafka outbox event in seconds.",
  async collect() {
    try {
      const oldest = await prisma.outboxEvent.findFirst({
        where: {
          status: "PENDING",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      });

      this.set(oldest ? Math.max((Date.now() - oldest.createdAt.getTime()) / 1000, 0) : 0);
    } catch {
      this.set(-1);
    }
  },
  registers: [register],
});

const bullmqJobsTotal = new client.Counter({
  name: "eventpulse_bullmq_jobs_total",
  help: "BullMQ jobs by queue, job name, and outcome.",
  labelNames: ["queue", "job", "outcome"],
  registers: [register],
});

const bullmqQueueJobsGauge = new client.Gauge({
  name: "eventpulse_bullmq_queue_jobs",
  help: "Current BullMQ job counts by queue and state.",
  labelNames: ["queue", "state"],
  async collect() {
    if (process.env.PROMETHEUS_BULLMQ_QUEUE_GAUGES !== "true") {
      this.set({ queue: "all", state: "disabled" }, 1);
      return;
    }

    const queueGetters = [
      [QUEUE_NAMES.EVENT_LIFECYCLE, getEventLifecycleQueue],
      [QUEUE_NAMES.NOTIFICATIONS, getNotificationQueue],
      [QUEUE_NAMES.ANALYTICS, getAnalyticsQueue],
    ];

    for (const [queueName, getQueue] of queueGetters) {
      try {
        const counts = await getQueue().getJobCounts(
          "waiting",
          "active",
          "delayed",
          "completed",
          "failed"
        );

        for (const [state, count] of Object.entries(counts)) {
          this.set({ queue: queueName, state }, count);
        }
      } catch {
        this.set({ queue: queueName, state: "unavailable" }, 1);
      }
    }
  },
  registers: [register],
});

const idempotencyRequestsTotal = new client.Counter({
  name: "eventpulse_idempotency_requests_total",
  help: "Idempotency middleware outcomes.",
  labelNames: ["outcome"],
  registers: [register],
});

function incDomainEvent(event) {
  domainEventsTotal.inc({ event });
}

function recordKafkaPublish(topic, outcome) {
  kafkaPublishesTotal.inc({ topic, outcome });
}

function recordOutboxEvent(outcome) {
  outboxEventsTotal.inc({ outcome });
}

function recordBullMQJob(queue, job, outcome) {
  bullmqJobsTotal.inc({ queue, job, outcome });
}

function recordIdempotency(outcome) {
  idempotencyRequestsTotal.inc({ outcome });
}

module.exports = {
  httpRequestDuration,
  httpRequestsTotal,
  incDomainEvent,
  recordBullMQJob,
  recordIdempotency,
  recordKafkaPublish,
  recordOutboxEvent,
  register,
};
