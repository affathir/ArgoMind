// =============================================================================
//  DB Seed – creates a demo device + user for local development
// =============================================================================
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Demo user
  const user = await prisma.user.upsert({
    where:  { email: "petani@demo.agrimind.local" },
    update: {},
    create: {
      email: "petani@demo.agrimind.local",
      name:  "Pak Budi (Demo)",
      role:  "FARMER",
    },
  });

  // Demo ESP32 device
  const device = await prisma.device.upsert({
    where:  { id: "device-001" },
    update: {},
    create: {
      id:          "device-001",
      name:        "Sensor Kebun Utara",
      location:    "Blok A – Garut, Jawa Barat",
      cropType:    "Tomat",
      growthStage: "vegetatif",
      ownerId:     user.id,
    },
  });

  // Seed 48 h of synthetic readings (30-min interval)
  const now = Date.now();
  const readings = [];
  for (let i = 96; i >= 0; i--) {
    const t = new Date(now - i * 30 * 60 * 1000);
    const base = 45 - (i / 96) * 20;   // simulate gradual drying
    readings.push({
      deviceId:        device.id,
      timestamp:       t,
      soilMoisture:    Math.max(5,  base + (Math.random() - 0.5) * 4),
      soilTemperature: 24 + (Math.random() - 0.5) * 3,
      airTemperature:  28 + (Math.random() - 0.5) * 4,
      airHumidity:     65 + (Math.random() - 0.5) * 10,
    });
  }

  await prisma.sensorReading.createMany({ data: readings, skipDuplicates: true });

  console.log(`✅  Seeded user "${user.email}" and device "${device.name}" with ${readings.length} readings.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
