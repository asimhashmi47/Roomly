-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "bookings_room_id_start_time_idx" ON "bookings"("room_id", "start_time");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");

-- Data integrity checks live in triggers because SQLite cannot add CHECKs via ALTER TABLE.
-- THE double-booking guarantee.
-- No two bookings in the same room may overlap on the half-open range [start, end):
--   existing.start < new.end AND new.start < existing.end
-- so 10:00-11:00 and 11:00-12:00 do not conflict. SQLite allows a single writer at a
-- time, so this check and the INSERT it guards cannot interleave with another write.
CREATE TRIGGER "bookings_no_room_overlap_insert"
BEFORE INSERT ON "bookings"
WHEN EXISTS (
  SELECT 1 FROM "bookings"
  WHERE "room_id" = NEW."room_id"
    AND "start_time" < NEW."end_time"
    AND NEW."start_time" < "end_time"
)
BEGIN
  SELECT RAISE(ABORT, 'bookings_no_room_overlap');
END;

CREATE TRIGGER "bookings_end_after_start"
BEFORE INSERT ON "bookings"
WHEN NEW."end_time" <= NEW."start_time"
BEGIN
  SELECT RAISE(ABORT, 'bookings_end_after_start');
END;

CREATE TRIGGER "rooms_capacity_positive"
BEFORE INSERT ON "rooms"
WHEN NEW."capacity" <= 0
BEGIN
  SELECT RAISE(ABORT, 'rooms_capacity_positive');
END;
