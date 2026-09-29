import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signToken } from '../src/lib/auth.js';

let app: FastifyInstance;
let admin: { id: string; token: string };
let john: { id: string; token: string };
let sarah: { id: string; token: string };
let roomA: { id: string };
let roomB: { id: string };

// Tomorrow at the given UTC hour - always in the future, so the "past" rule never interferes.
const at = (hour: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};

async function makeUser(name: string, role: 'ADMIN' | 'USER') {
  const user = await prisma.user.create({
    data: { name, email: `${name}@test.dev`, role, passwordHash: await bcrypt.hash('x', 4) },
  });
  return { id: user.id, token: signToken({ id: user.id, role }) };
}

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

const book = (token: string, roomId: string, startH: number, endH: number, title = 'Meeting') =>
  app.inject({
    method: 'POST',
    url: '/bookings',
    headers: auth(token),
    payload: { roomId, title, startTime: at(startH), endTime: at(endH) },
  });

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.booking.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  admin = await makeUser('admin', 'ADMIN');
  john = await makeUser('john', 'USER');
  sarah = await makeUser('sarah', 'USER');
  roomA = await prisma.room.create({ data: { name: 'Room A', capacity: 4 } });
  roomB = await prisma.room.create({ data: { name: 'Room B', capacity: 8 } });
});

describe('POST /bookings', () => {
  it('creates a valid booking', async () => {
    const res = await book(john.token, roomA.id, 10, 11);
    expect(res.statusCode).toBe(201);
    expect(res.json().booking).toMatchObject({ roomId: roomA.id, createdBy: john.id });
  });

  it('rejects end time before start time', async () => {
    const res = await book(john.token, roomA.id, 11, 10);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects bookings longer than 4 hours', async () => {
    const res = await book(john.token, roomA.id, 8, 13);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/4 hours/);
  });

  it('accepts a booking of exactly 4 hours', async () => {
    const res = await book(john.token, roomA.id, 8, 12);
    expect(res.statusCode).toBe(201);
  });

  it('rejects bookings in the past', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/bookings',
      headers: auth(john.token),
      payload: {
        roomId: roomA.id,
        title: 'Old',
        startTime: new Date(Date.now() - 2 * 3600_000).toISOString(),
        endTime: new Date(Date.now() - 3600_000).toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toMatch(/past/);
  });

  it('rejects an overlapping booking with 409 BOOKING_CONFLICT', async () => {
    expect((await book(john.token, roomA.id, 10, 11)).statusCode).toBe(201);
    const res = await book(sarah.token, roomA.id, 10, 12); // 10:00-12:00 overlaps 10:00-11:00
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('BOOKING_CONFLICT');
  });

  it('allows back-to-back bookings', async () => {
    expect((await book(john.token, roomA.id, 10, 11)).statusCode).toBe(201);
    expect((await book(sarah.token, roomA.id, 11, 12)).statusCode).toBe(201);
    expect((await book(sarah.token, roomA.id, 9, 10)).statusCode).toBe(201);
  });

  it('allows the same time in different rooms', async () => {
    expect((await book(john.token, roomA.id, 10, 11)).statusCode).toBe(201);
    expect((await book(sarah.token, roomB.id, 10, 11)).statusCode).toBe(201);
  });

  it('requires authentication', async () => {
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  // The important one: bypasses the app-level pre-check timing by firing simultaneously.
  // Only the DB exclusion constraint can make exactly one of these win.
  it('lets exactly one of many concurrent identical requests succeed', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        book(i % 2 ? john.token : sarah.token, roomA.id, 10, 11, `Race ${i}`),
      ),
    );
    const codes = results.map((r) => r.statusCode);
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 409)).toHaveLength(9);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('the database itself rejects overlapping rows, bypassing the API', async () => {
    await prisma.booking.create({
      data: {
        roomId: roomA.id,
        title: 'First',
        startTime: at(10),
        endTime: at(11),
        createdBy: john.id,
      },
    });
    await expect(
      prisma.booking.create({
        data: {
          roomId: roomA.id,
          title: 'Sneaky',
          startTime: at(10),
          endTime: at(12),
          createdBy: sarah.id,
        },
      }),
    ).rejects.toThrow();
  });
});

describe('DELETE /bookings/:id', () => {
  it('returns 404 for a nonexistent booking', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/bookings/00000000-0000-0000-0000-000000000000',
      headers: auth(john.token),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when deleted twice', async () => {
    const id = (await book(john.token, roomA.id, 10, 11)).json().booking.id;
    const del = () =>
      app.inject({ method: 'DELETE', url: `/bookings/${id}`, headers: auth(john.token) });
    expect((await del()).statusCode).toBe(204);
    expect((await del()).statusCode).toBe(404);
  });

  it("forbids deleting someone else's booking", async () => {
    const id = (await book(john.token, roomA.id, 10, 11)).json().booking.id;
    const res = await app.inject({
      method: 'DELETE',
      url: `/bookings/${id}`,
      headers: auth(sarah.token),
    });
    expect(res.statusCode).toBe(403);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('lets an admin delete any booking', async () => {
    const id = (await book(john.token, roomA.id, 10, 11)).json().booking.id;
    const res = await app.inject({
      method: 'DELETE',
      url: `/bookings/${id}`,
      headers: auth(admin.token),
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('authorization', () => {
  const newUser = { name: 'New', email: 'new@test.dev', password: 'Password123!', role: 'USER' };

  it('forbids a standard user from creating users', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      headers: auth(john.token),
      payload: newUser,
    });
    expect(res.statusCode).toBe(403);
  });

  it('lets an admin create users, without leaking the password hash', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/users',
      headers: auth(admin.token),
      payload: newUser,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().user.passwordHash).toBeUndefined();
  });

  it('forbids standard users from audit logs, system logs and room management', async () => {
    for (const [method, url] of [
      ['GET', '/admin/audit-logs'],
      ['GET', '/admin/system-logs'],
      ['GET', '/users'],
    ] as const) {
      const res = await app.inject({ method, url, headers: auth(john.token) });
      expect(res.statusCode, url).toBe(403);
    }
    const res = await app.inject({
      method: 'POST',
      url: '/rooms',
      headers: auth(john.token),
      payload: { name: 'X', capacity: 2 },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects a forged token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/rooms',
      headers: auth('not.a.token'),
    });
    expect(res.statusCode).toBe(401);
  });
});
