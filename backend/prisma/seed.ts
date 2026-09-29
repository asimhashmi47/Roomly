import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

// Development-only credentials. Documented in the README; never use in production.
const DEV_PASSWORD = 'Password123!';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const users = [
    { name: 'Alex Admin', email: 'admin@example.com', role: 'ADMIN' as const },
    { name: 'John Carter', email: 'john@example.com', role: 'USER' as const },
    { name: 'Sarah Lee', email: 'sarah@example.com', role: 'USER' as const },
  ];
  const created = [];
  for (const u of users) {
    created.push(
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      }),
    );
  }

  const roomDefs = [
    { name: 'Focus Room', capacity: 4 },
    { name: 'Board Room', capacity: 8 },
    { name: 'Collaboration Room', capacity: 12 },
  ];
  const rooms = [];
  for (const r of roomDefs) {
    const existing = await prisma.room.findFirst({ where: { name: r.name } });
    rooms.push(existing ?? (await prisma.room.create({ data: r })));
  }

  // A few bookings for tomorrow (UTC) so the schedule isn't empty. Skipped if they exist.
  if ((await prisma.booking.count()) === 0) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 1);
    day.setUTCHours(0, 0, 0, 0);
    const at = (h: number) => new Date(day.getTime() + h * 3600_000);
    const [, john, sarah] = created;
    const [focus, board] = rooms;
    await prisma.booking.createMany({
      data: [
        { roomId: focus!.id, title: 'Sprint Planning', startTime: at(9), endTime: at(10), createdBy: john!.id },
        { roomId: focus!.id, title: 'Design Review', startTime: at(10), endTime: at(11), createdBy: sarah!.id },
        { roomId: board!.id, title: 'Client Call', startTime: at(13), endTime: at(14.5), createdBy: sarah!.id },
      ],
    });
  }
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
