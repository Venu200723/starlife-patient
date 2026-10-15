// Seed script — STAR LIFE CLINIC known data only.
// Per product rules: no invented doctor qualifications, services, or prices.
// The single service below is a clearly-marked demo entry (isDemo) so the
// booking flow is usable before the clinic administrator configures real ones.
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$16384$8$1$${salt}$${hash}`;
}

async function main() {
  console.log("Seeding STAR LIFE CLINIC ...");

  // 1. Clinic
  const clinic = await db.clinic.findFirst();
  const clinicData = {
    name: "STAR LIFE CLINIC",
    description: null as string | null,
    phone: "7780193811",
    address: "JF63+Q89, Tiruchanur, Andhra Pradesh 517503, India",
    mapsUrl: "https://maps.app.goo.gl/9UN9oKEp61nDgrbCA",
    timezone: "Asia/Kolkata",
    rating: 5.0,
    reviewCount: 39,
  };
  const c = clinic
    ? await db.clinic.update({ where: { id: clinic.id }, data: clinicData })
    : await db.clinic.create({ data: clinicData });

  // 2. Doctor — name only; professional details are admin-configurable.
  const doctor = await db.doctor.findFirst();
  if (!doctor) {
    await db.doctor.create({
      data: { clinicId: c.id, name: "Dr. Mahesh Kumar" },
    });
  }

  // 3. Clinic hours — Mon–Sat 4:00 PM–9:30 PM, Sun 9:00 AM–1:30 PM
  const hours = [
    { dayOfWeek: 0, openingTime: "09:00", closingTime: "13:30", isOpen: true }, // Sunday
    { dayOfWeek: 1, openingTime: "16:00", closingTime: "21:30", isOpen: true },
    { dayOfWeek: 2, openingTime: "16:00", closingTime: "21:30", isOpen: true },
    { dayOfWeek: 3, openingTime: "16:00", closingTime: "21:30", isOpen: true },
    { dayOfWeek: 4, openingTime: "16:00", closingTime: "21:30", isOpen: true },
    { dayOfWeek: 5, openingTime: "16:00", closingTime: "21:30", isOpen: true },
    { dayOfWeek: 6, openingTime: "16:00", closingTime: "21:30", isOpen: true },
  ];
  for (const h of hours) {
    await db.clinicHour.upsert({
      where: { clinicId_dayOfWeek: { clinicId: c.id, dayOfWeek: h.dayOfWeek } },
      update: { openingTime: h.openingTime, closingTime: h.closingTime, isOpen: h.isOpen },
      create: { clinicId: c.id, ...h },
    });
  }

  // 4. One clearly-labelled demo service so booking is testable end-to-end.
  const demoService = await db.service.findFirst({ where: { isDemo: true } });
  if (!demoService) {
    await db.service.create({
      data: {
        clinicId: c.id,
        name: "General Consultation",
        description:
          "Standard outpatient consultation. Demo entry — replace with the clinic's real services in the admin dashboard.",
        durationMinutes: 30,
        price: null,
        isDemo: true,
        sortOrder: 0,
      },
    });
  }

  // 5. Admin — credentials come ONLY from env (confidential; never in code,
  //    never displayed in the app). Seed fails loudly if they are not set.
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env before seeding — " +
        "staff credentials are confidential and are not defaulted in code.",
    );
  }
  const existingAdmin = await db.admin.findUnique({ where: { username } });
  if (!existingAdmin) {
    await db.admin.create({
      data: { username, passwordHash: hashPassword(password), role: "ADMIN" },
    });
    console.log(`Admin created: ${username}`);
  }

  // 6. Default settings
  const defaults: Record<string, string> = {
    slot_step_minutes: "30",
    max_advance_days: "30",
    cancellation_cutoff_hours: "2",
    auto_confirm: "false",
    notifications_enabled: "true",
    analytics_enabled: "true",
    booking_enabled: "true",
    whatsapp_enabled: "false",
    whatsapp_number: "",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await db.appSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
