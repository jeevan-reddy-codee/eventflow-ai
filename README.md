# EventFlow AI

EventFlow AI is a full-stack campus event platform for capacity-aware registrations, waitlists, QR passes, live entry scanning, analytics, and real-time organizer/volunteer dashboards.

## Structure

- `frontend/` - Next.js App Router app.
- `backend/` - Node.js, Express, Prisma, PostgreSQL, Redis, Kafka, Socket.IO API.
- `docker-compose.yml` - Local PostgreSQL, Redis, Kafka/Zookeeper, frontend, and backend services.

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init_eventflowai_schema
npm run seed
npm run dev
```

The backend runs on `http://localhost:4000` by default.

## Docker

```bash
docker compose up -d postgres redis kafka zookeeper
docker compose up frontend backend
```

PostgreSQL is mapped to host port `5433` to avoid common local conflicts. Inside Docker, services use `postgres:5432`.

## Prisma

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed
```

## Backend Tests

Run the RBAC/ABAC authorization suite with:

```bash
cd backend
npm run test:authz
```

The suite uses Jest and Supertest against the real Express app, JWT auth middleware, CASL policies, route middleware, and Prisma-backed service ownership checks. It seeds isolated admin, organizer, volunteer, and student users plus organizer-owned events, then verifies student restrictions, organizer ownership boundaries, volunteer scan scope, and admin access. Run it against a migrated test database; the test data uses unique `authz-*` emails and cleans itself up after completion.

To avoid accidental writes to shared databases, the suite runs only when `DATABASE_URL` points to localhost, the database name clearly contains `eventpulse_test`, or `AUTHZ_TEST_DATABASE_URL` is provided:

```bash
AUTHZ_TEST_DATABASE_URL=postgresql://eventpulse:eventpulse@localhost:5433/eventpulse_test npm run test:authz
```

Remote database runs require explicit opt-in with `AUTHZ_ALLOW_REMOTE_DATABASE=true`.

## API Routes

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Venues:
- `POST /api/venues`
- `GET /api/venues`
- `GET /api/venues/:id`
- `PATCH /api/venues/:id`
- `DELETE /api/venues/:id`
- `GET /api/venues/:id/schedule`

Events:
- `POST /api/events`
- `GET /api/events`
- `GET /api/events/:id`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

Registrations and waitlist:
- `POST /api/events/:id/register`
- `POST /api/events/:id/cancel`
- `GET /api/events/:id/registration-status`
- `GET /api/events/:id/waitlist`
- `POST /api/events/:id/promote-next`

Passes and check-in:
- `GET /api/events/:id/pass`
- `POST /api/checkin/scan`
- `GET /api/events/:id/checkins`

Analytics:
- `GET /api/analytics/events/:id`
- `GET /api/analytics/venues`
- `GET /api/analytics/checkins`

Notifications:
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Health:
- `GET /health`

## Auth Flow

Users register or log in with email/password. Passwords are hashed with `bcryptjs`. Login returns a JWT with:

```json
{
  "userId": "...",
  "role": "STUDENT"
}
```

Protected routes use `Authorization: Bearer <token>`. Public registration can create `STUDENT`, `ORGANIZER`, and `VOLUNTEER`; `ADMIN` cannot be created through public registration.

## Request Validation

Backend route inputs are validated at the API boundary with Zod. Shared schemas live in `backend/src/validation/requestSchemas.js` and are applied through `backend/src/middleware/validateRequest.middleware.js` for request bodies, route params, and query strings. Invalid requests return `400` with structured field-level details before reaching service logic.

## Security Headers

The backend uses Helmet to apply security response headers before CORS and API routes. The policy includes a conservative Content Security Policy, `X-Frame-Options`/`frame-ancestors` deny framing, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and cross-origin isolation/resource policies suitable for an API backend.

`Strict-Transport-Security` is enabled only when `NODE_ENV=production` so local HTTP development keeps working. `FRONTEND_URL` is used in the CSP `connect-src` allowlist alongside the backend origin.

## Auth Rate Limiting

EventFlow AI uses Redis-backed fixed-window rate limits for sensitive routes. Login and registration are limited by IP and email to slow brute-force attempts. Authenticated limits protect QR scans, special entry, pass generation, notification mutations, and admin/organizer write routes. Responses include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.

Default limits can be tuned with environment variables:

```bash
RATE_LIMIT_AUTH_LOGIN_IP_LIMIT=20
RATE_LIMIT_AUTH_LOGIN_IP_WINDOW_SECONDS=900
RATE_LIMIT_AUTH_LOGIN_EMAIL_LIMIT=8
RATE_LIMIT_AUTH_LOGIN_EMAIL_IP_LIMIT=5
RATE_LIMIT_AUTH_REGISTER_IP_LIMIT=10
RATE_LIMIT_AUTH_REGISTER_IP_WINDOW_SECONDS=3600
RATE_LIMIT_QR_SCAN_USER_LIMIT=60
RATE_LIMIT_QR_SCAN_USER_WINDOW_SECONDS=60
RATE_LIMIT_PASS_GENERATION_USER_LIMIT=30
RATE_LIMIT_NOTIFICATION_MUTATION_USER_LIMIT=60
RATE_LIMIT_ADMIN_WRITE_USER_LIMIT=60
```

## Authorization Policies

Backend authorization is centralized with CASL in `backend/src/authorization/ability.js`. Route middleware uses coarse abilities such as `create Event`, `read GateFlow`, and `manage Venue`, while service methods use object-aware policies for ownership-sensitive records such as events, analytics, waitlists, crew access, check-ins, passes, registrations, and notifications.

Admins can manage all resources. Organizers can create events and manage owned event resources. Volunteers can scan and read operational entry data. Students can register, cancel, read their own passes, and read their own notifications. PostgreSQL remains the source of truth for ownership checks before object-level CASL authorization is evaluated.

## Idempotency Keys

High-risk write endpoints require an `Idempotency-Key` header so client retries do not repeat side effects. EventFlow AI stores the key, authenticated user, route, method, request fingerprint, response status/body, and expiry in PostgreSQL. Matching retries replay the original successful response with `Idempotency-Replayed: true`; reusing the same key with a different request returns `409`.

Protected endpoints using idempotency:
- `POST /api/events/:id/register`
- `POST /api/events/:id/cancel`
- `POST /api/events/:id/promote-next`
- `POST /api/events/:id/checkins/scan`
- `POST /api/events/:id/checkins/special-entry`
- `POST /api/events/:id/crew`
- `PATCH /api/events/:id/crew/:crewAccessId`
- `DELETE /api/events/:id/crew/:crewAccessId`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

Example:

```bash
curl -X POST http://localhost:4000/api/events/event-id/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: register-event-id-user-id-1"
```

Keys expire after `IDEMPOTENCY_KEY_TTL_SECONDS` seconds, defaulting to 24 hours. Clean expired rows with:

```bash
cd backend
npm run cleanup:idempotency
```

## Registration Flow

Students register for `OPEN` or `LIVE` events before `registrationDeadline`. Registration uses Redis lock `lock:event:{eventId}:registration` and a Prisma transaction to prevent overbooking. If capacity is available, the system allocates the first available seat and creates a `CONFIRMED` registration.

## Waitlist Flow

If an event is full and waitlist capacity remains, the student receives a `WAITLISTED` registration and a `WaitlistEntry` with the next queue position. Cancelling a confirmed registration releases the seat and promotes the first `WAITING` waitlist entry by `position ASC`.

## QR Check-In Flow

Confirmed students fetch `GET /api/events/:id/pass`. The backend signs a QR payload using HMAC with `JWT_SECRET`, stores only the token hash, and returns a QR image data URL. Volunteers, organizers, and admins scan via `POST /api/checkin/scan`. The scan path uses rate limits, QR token verification, Redis scan locks, and the unique `CheckIn.registrationId` constraint to reject duplicate entry.

## WebSocket Events

Clients join event rooms with:
- `join-event-room`
- `leave-event-room`

Room format:
- `event:{eventId}`

Server emitted events:
- `capacity-updated`
- `registration-updated`
- `waitlist-updated`
- `checkin-updated`
- `entry-rate-updated`
- `no-show-released`
- `notification-created`
- `notification-read`

## Redis Usage

Redis is used for:
- registration locks
- QR scan locks
- fixed-window rate limits
- fast live counters:
  - `event:{eventId}:registeredCount`
  - `event:{eventId}:checkedInCount`
  - `event:{eventId}:waitlistCount`

PostgreSQL remains the source of truth. Redis counters can be rebuilt with database sync helpers.

## In-App Notifications

EventFlow AI stores per-user notifications for registration confirmations, waitlist joins and promotions, cancellations, check-ins, and crew access changes. Authenticated clients can fetch `/api/notifications`, read the navbar badge count through `/api/notifications/unread-count`, and mark one or all notifications as read. Socket.IO pushes `notification-created` and `notification-read` events to each authenticated user room so the badge and `/notifications` center update live.

## Kafka Usage

Kafka is used for async streams, not source-of-truth storage. Publish failures are logged and do not crash API requests.

Domain services write Kafka messages through a transactional outbox table before Kafka publish. State changes such as registrations, cancellations, waitlist promotions, check-ins, no-show releases, and crew access updates create `OutboxEvent` rows in the same Prisma transaction as the PostgreSQL mutation. A separate publisher worker reads pending rows, publishes them to Kafka, and marks them as published only after Kafka acknowledges the send.

Run the outbox publisher locally with:

```bash
cd backend
npm run publisher:outbox
```

Outbox retries use exponential backoff. Configure them with:

```bash
OUTBOX_MAX_ATTEMPTS=10
OUTBOX_PUBLISH_BATCH_SIZE=25
OUTBOX_PUBLISH_POLL_INTERVAL_MS=2500
OUTBOX_PUBLISH_BASE_BACKOFF_MS=1000
OUTBOX_PUBLISH_MAX_BACKOFF_MS=60000
OUTBOX_PROCESSING_TIMEOUT_MS=300000
```

Published Kafka messages preserve the existing topic names and JSON payload shape. The publisher adds Kafka headers `eventpulse-outbox-id` and `eventpulse-outbox-attempt` so consumers can de-duplicate if needed. Delivery is at least once: if the process crashes after Kafka accepts a message but before PostgreSQL marks the row as published, the publisher may retry that same outbox row.

Topics:
- `eventpulse.registration.created`
- `eventpulse.waitlist.joined`
- `eventpulse.waitlist.promoted`
- `eventpulse.registration.cancelled`
- `eventpulse.checkin.completed`
- `eventpulse.security.scan_failed`
- `eventpulse.no_show.released`
- `eventpulse.crew.access_granted`
- `eventpulse.crew.access_updated`
- `eventpulse.crew.access_revoked`
- `eventpulse.crew.special_entry_used`

Kafka consumers run in dedicated consumer groups:
- `eventpulse-registration-consumer`
- `eventpulse-checkin-consumer`
- `eventpulse-crew-consumer`

Run them locally with:

```bash
cd backend
npm run consumer:kafka
```

Consumer processing keeps PostgreSQL as the source of truth. Handlers verify referenced records, resync Redis counters for capacity-affecting topics, and write event-scoped audit logs.

Retry topics:
- `eventpulse.retry.registration`
- `eventpulse.retry.checkin`
- `eventpulse.retry.crew`

Dead-letter topics:
- `eventpulse.dlq.registration`
- `eventpulse.dlq.checkin`
- `eventpulse.dlq.crew`

Failed messages are wrapped with the original topic, original payload, original timestamp, attempt count, retry timestamp, consumer group, and serialized error. After `KAFKA_CONSUMER_MAX_ATTEMPTS`, the message is moved to the matching DLQ topic.

Kafka message contracts are centralized in `backend/src/utils/kafkaSchemas.js` and enforced with AJV before publishing and before consumer handlers run. Domain messages keep the existing JSON shape:

```json
{
  "eventId": "event-id",
  "userId": "user-id-or-null",
  "registrationId": "registration-id-or-null",
  "timestamp": "2026-06-22T12:00:00.000Z",
  "metadata": {}
}
```

`eventpulse.security.scan_failed` allows `eventId` to be omitted because rejected scans may contain unusable or missing event data. Other domain topics require `eventId`, `timestamp`, and `metadata`. Validation failures are not published on the producer path; consumer-side validation failures are routed through the retry/DLQ flow with structured error details.

## Concurrency And Synchronization

Registration, cancellation, waitlist promotion, no-show release, and QR scans are protected with Redis locks and Prisma transactions. Database unique constraints provide a final safety net for one registration per user/event, one waitlist entry per user/event, and one check-in per registration.

Fenwick Tree is used for efficient time-range check-in analytics over bucketed event entry data. The optimized time-range path powers `GET /api/analytics/events/:id/time-range` without replacing PostgreSQL as the source of truth.

Trie is used for fast autocomplete across events, venues, zones, and categories.

Graph utilities are used to model venue zones and gate loads, enabling least-crowded gate recommendations and simple crowd-flow routing.

## Event Crew Access

Organizers can assign selected students as event-specific organizers, crew members, performers, speakers, volunteer helpers, or VIP entries. Access is scoped to a single event and does not change the student’s global `STUDENT` role. Each crew access record can specify a special gate and an optional note that volunteers can see during scanning. Crew access updates emit live Socket.IO events to the event room and publish best-effort Kafka stream events.

## Workers

Run manual workers or queue-backed workers:

```bash
cd backend
npm run worker:noshow
npm run worker:analytics
npm run consumer:kafka
npm run scheduler:bullmq
npm run worker:bullmq
```

`worker:noshow` marks unscanned confirmed registrations as `NO_SHOW` after a grace period, releases seats, promotes waitlisted users, updates counters, and publishes Kafka events.

`worker:analytics` computes aggregate event, venue, and check-in metrics and logs them.

## BullMQ Usage

BullMQ is used for scheduled and retryable background jobs on top of the existing Redis service. Kafka remains the async domain-event stream; BullMQ handles jobs that need retries, delays, or repeat schedules.

Queues:
- `eventpulse-event-lifecycle`
- `eventpulse-notifications`
- `eventpulse-analytics`

Job types:
- `event-no-show-release` runs after event start plus `NO_SHOW_GRACE_MINUTES`.
- `process-no-shows` repeats every `NO_SHOW_REPEAT_MS` as a safety sweep.
- `registration-deadline-reminder` creates organizer in-app reminder jobs before registration closes.
- `event-start-reminder` creates attendee in-app reminder jobs before event start.
- `create-notification` writes in-app notifications through the notification service.
- `analytics-aggregate` repeats every `ANALYTICS_REPEAT_MS`.

Run `npm run scheduler:bullmq` once during deployment or local boot to register repeatable jobs and delayed jobs for upcoming events. Run `npm run worker:bullmq` as a long-running worker process. Jobs use exponential backoff, bounded completed/failed retention, and stable job IDs for event reminders so event updates replace pending schedules.

## Observability

The backend uses Pino for structured JSON logs and OpenTelemetry for traces. Local development works without an OpenTelemetry collector because tracing is disabled by default.

Environment variables:

```bash
LOG_LEVEL=info
OTEL_ENABLED=false
OTEL_SERVICE_NAME=eventpulse-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_DIAG_LOGGING=false
```

When `OTEL_ENABLED=true`, EventFlow AI auto-instruments Node HTTP/Express, PostgreSQL, Redis/ioredis, KafkaJS, Socket.IO, and Pino where supported by the OpenTelemetry auto-instrumentation package. The backend also creates manual spans for Kafka publish/consume operations, BullMQ job processing, and Socket.IO emits. Logs include request IDs and active trace/span IDs when a trace context exists.

For local traces, start an OTLP-compatible collector and set `OTEL_ENABLED=true` plus `OTEL_EXPORTER_OTLP_ENDPOINT`. Without an endpoint, tracing can still be enabled for local context propagation, but spans are not exported.

## Prometheus Metrics

The backend exposes Prometheus metrics at `GET /metrics` using `prom-client`.

Metrics include default Node.js process metrics plus:
- HTTP request count and duration by method, normalized route pattern, and status.
- Domain counters for registrations, waitlist joins/promotions, cancellations, check-ins, scan failures, crew access changes, notifications, and no-show releases.
- Kafka publish success/failure counters by topic.
- Outbox enqueue/publish/retry/failure counters, current outbox status gauges, and oldest pending outbox age.
- BullMQ job completed/failed counters by queue and job name.
- Optional BullMQ queue state gauges when `PROMETHEUS_BULLMQ_QUEUE_GAUGES=true`.
- Idempotency started/completed/replayed/conflict/in-flight/failure counters.

Metric labels are intentionally low-cardinality and do not include user IDs, event IDs, request IDs, or raw request paths.

Local Prometheus scrape example:

```yaml
scrape_configs:
  - job_name: eventpulse-backend
    metrics_path: /metrics
    static_configs:
      - targets: ["localhost:4000"]
```

## Demo Credentials

All seeded users use password `password123`.

- `admin@iiita.ac.in` - `ADMIN`
- `organizer@iiita.ac.in` - `ORGANIZER`
- `volunteer@iiita.ac.in` - `VOLUNTEER`
- `student1@iiita.ac.in` - `STUDENT`
- `student2@iiita.ac.in` - `STUDENT`
- `student3@iiita.ac.in` - `STUDENT`
- `student4@iiita.ac.in` - `STUDENT`
- `student5@iiita.ac.in` - `STUDENT`

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend environment variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

The frontend keeps the futuristic EventFlow AI UI while integrating with the backend APIs. Login and registration store the JWT and user profile in local storage, attach `Authorization: Bearer <token>` to API requests, and update navigation by role.

Integrated pages:
- `/login`
- `/register`
- `/events`
- `/events/[id]`
- `/notifications`
- `/pass/[eventId]`
- `/organizer/dashboard`
- `/organizer/events/new`
- `/organizer/events/[id]`
- `/volunteer/scan`
- `/admin/venues`
- `/admin/analytics`

Role routing:
- `STUDENT` -> `/events`
- `ORGANIZER` -> `/organizer/dashboard`
- `VOLUNTEER` -> `/volunteer/scan`
- `ADMIN` -> `/admin/venues`

Unauthorized users are sent to `/login`. Authenticated users with the wrong role see an access-denied operations panel.

## Frontend Demo Flow

1. Login as `organizer@iiita.ac.in`.
2. Create an event from `/organizer/events/new`.
3. Login as `student1@iiita.ac.in`.
4. Register from `/events/[id]`.
5. Open `/pass/[eventId]` and copy the demo QR token.
6. Login as `volunteer@iiita.ac.in`.
7. Scan the copied token from `/volunteer/scan`.
8. Scan it again to verify duplicate-entry rejection.
9. Login as `admin@iiita.ac.in`.
10. View `/admin/venues` and `/admin/analytics`.
11. Open `/organizer/events/[id]` to watch live capacity and check-in updates.

WebSocket behavior:
- Organizer event control rooms and the volunteer scanner use `socket.io-client`.
- Clients join rooms with `join-event-room` and leave with `leave-event-room`.
- Live events update capacity, registration, waitlist, check-in, entry-rate, and no-show signals.

Common frontend fixes:
- If API calls fail, confirm `NEXT_PUBLIC_API_URL` points to the backend.
- If sockets stay offline, confirm `NEXT_PUBLIC_SOCKET_URL` points to the backend Socket.IO server.
- If protected pages redirect, login again and confirm the demo user has the expected role.
- If QR scan fails, generate a fresh pass because QR tokens are signed and expire at event end time.

## Manual Testing Checklist

1. Register/login.
2. Create IIITA venue.
3. Create IIITA event.
4. Detect venue conflict.
5. Register student.
6. Fill event capacity.
7. Move users to waitlist.
8. Cancel confirmed registration.
9. Auto-promote waitlisted user.
10. Generate QR pass.
11. Scan QR.
12. Reject duplicate QR scan.
13. Check live counters.
14. Verify Kafka logs.
15. Run no-show worker.
