import { prisma } from "../src/client";
import { createInvoiceForJob } from "../src/services/invoices";

// Deterministic PRNG so every seeded database is identical.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20250411);

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)] as T;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

const TECHNICIANS = [
  { name: "Rosa Vale", phone: "555-0111", tags: ["hvac", "refrigeration"], rate: 8000 },
  { name: "Dana Reyes", phone: "555-0112", tags: ["hvac", "electrical"], rate: 8000 },
  { name: "Sam Ortiz", phone: "555-0113", tags: ["plumbing"], rate: 5000 },
  { name: "June Park", phone: "555-0114", tags: ["electrical", "low-voltage"], rate: 7200 },
  { name: "Theo Brandt", phone: "555-0115", tags: ["plumbing", "gas-fitting"], rate: 6400 },
  { name: "Alice Nguyen", phone: "555-0116", tags: ["hvac"], rate: 5600 },
  { name: "Marcus Cole", phone: "555-0117", tags: ["appliance-repair", "electrical"], rate: 4800 },
  { name: "Ivy Sandoval", phone: null, tags: ["general"], rate: 4200 },
] as const;

const CUSTOMERS = [
  ["Harbor Light Bakery", "ops@harborlight.example", "18 Quay St"],
  ["Fern & Frond Florists", "hello@fernfrond.example", "204 Bloom Ave"],
  ["Cordova Dental Group", "admin@cordovadental.example", "77 Medical Plaza, Suite 3"],
  ["The Pinewood Inn", "frontdesk@pinewoodinn.example", "1 Lodge Rd"],
  ["Delgado Auto Body", "service@delgadoauto.example", "410 Industrial Way"],
  ["Two Rivers Brewing", "brewery@tworivers.example", "88 Mill St"],
  ["Casa Verde Apartments", "manager@casaverde.example", "1200 Alder Loop"],
  ["Northgate Public Library", null, "45 Civic Center Dr"],
  ["Sundial Yoga Studio", "studio@sundialyoga.example", "9 Market Ln, Unit B"],
  ["Kepler Middle School", "facilities@keplerms.example", "300 Orchard Rd"],
  ["Marnie Alcott", "marnie.alcott@mail.example", "52 Birchwood Ct"],
  ["Gus Ferreira", "gus.f@mail.example", "17 Salt Marsh Rd"],
  ["Priyanka Rao", "p.rao@mail.example", "8 Juniper Hill"],
  ["Ellsworth Hardware", "counter@ellsworthhw.example", "220 Main St"],
  ["Blue Heron Seafood", "dock@blueheron.example", "3 Pier Four"],
  ["Tomas Lindqvist", null, "961 Crescent Dr"],
  ["Aria Nakamura", "aria.n@mail.example", "14 Foxglove Terrace"],
  ["Stonebridge Vet Clinic", "care@stonebridgevet.example", "630 Ridgeline Blvd"],
  ["Meridian Print Co", "shop@meridianprint.example", "72 Foundry St"],
  ["Olive & Thyme Catering", "events@olivethyme.example", "11 Garden Walk"],
] as const;

const PARTS = [
  ["IGN-4420", "Hot surface igniter", 780, 1299],
  ["CAP-3555", "Run capacitor 35/5 uF", 620, 1150],
  ["FLT-2020", "Filter drier 20x20", 310, 650],
  ["THV-0900", "Thermostatic valve 3/4in", 2210, 3400],
  ["BLW-1180", "Blower motor 1/3 HP", 6800, 9900],
  ["CMP-7742", "Compressor contactor 40A", 940, 1675],
  ["PRV-0075", "Pressure relief valve", 1150, 1895],
  ["TRP-1500", "P-trap assembly 1.5in", 260, 545],
  ["WAX-0001", "Wax ring with sleeve", 190, 425],
  ["SUP-3838", "Supply line braided 3/8in", 210, 480],
  ["GDV-0500", "Gas shutoff valve 1/2in", 830, 1390],
  ["ANR-4400", "Anode rod 44in", 1450, 2350],
  ["ELM-4500", "Heating element 4500W", 980, 1720],
  ["BRK-0220", "Breaker 20A single pole", 540, 995],
  ["BRK-0250", "Breaker 50A double pole", 1230, 2050],
  ["GFI-0115", "GFCI outlet 15A", 890, 1540],
  ["LVT-0024", "Transformer 24V 40VA", 720, 1275],
  ["FAN-0912", "Condenser fan blade 12in", 1050, 1750],
  ["BLT-0034", "Blower belt 34in", 340, 690],
  ["PMP-0033", "Condensate pump", 2380, 3600],
  ["DCT-0808", "Duct section 8x8", 460, 899],
  ["INS-0025", "Pipe insulation 25ft", 380, 745],
  ["SNS-0007", "Flame sensor", 410, 860],
  ["RLY-0090", "Fan relay SPDT", 560, 1025],
  ["FLX-0048", "Flex connector 48in", 660, 1180],
] as const;

const JOB_TITLES = [
  "Furnace not igniting",
  "AC blowing warm air",
  "Water heater leaking",
  "Panel upgrade quote follow-up",
  "Walk-in cooler icing over",
  "Clogged main drain",
  "Thermostat replacement",
  "No hot water in unit 4",
  "Breaker trips on startup",
  "Annual boiler service",
  "Rooftop unit rattling",
  "Backflow test",
  "Kitchen outlet dead",
  "Slow drain in exam room",
  "Compressor short-cycling",
  "Gas smell near range",
  "Replace condensate pump",
  "Duct reroute for remodel",
  "Freezer door heater out",
  "Emergency: burst pipe",
] as const;

const STATUS_PLAN = [
  ...Array<string>(8).fill("requested"),
  ...Array<string>(8).fill("scheduled"),
  ...Array<string>(6).fill("in_progress"),
  ...Array<string>(6).fill("completed"),
  ...Array<string>(8).fill("invoiced"),
  ...Array<string>(4).fill("cancelled"),
];

const DURATIONS_MS = [3600000, 5400000, 7200000, 9000000, 10800000, 2700000] as const;

async function main(): Promise<void> {
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoiceRecord.deleteMany();
  await prisma.jobPart.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.job.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.part.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      email: "olivia@acme-dispatch.example",
      name: "Olivia Chen",
      role: "admin",
    },
  });
  await prisma.user.create({
    data: {
      email: "ray@acme-dispatch.example",
      name: "Ray Donnelly",
      role: "dispatcher",
    },
  });

  const technicians = [];
  for (const tech of TECHNICIANS) {
    technicians.push(
      await prisma.technician.create({
        data: {
          name: tech.name,
          phone: tech.phone,
          skillTags: JSON.stringify([...tech.tags].sort()),
          hourlyCostCents: tech.rate,
          isActive: tech.name !== "Ivy Sandoval",
        },
      }),
    );
  }

  const customers = [];
  for (const [name, email, address] of CUSTOMERS) {
    customers.push(
      await prisma.customer.create({
        data: {
          name,
          contactEmail: email,
          phone: rand() < 0.75 ? `555-0${randInt(200, 899)}` : null,
          serviceAddress: address,
          notes: rand() < 0.3 ? "Gate code 4415, dog on premises" : null,
        },
      }),
    );
  }

  const stockByPart = new Map<number, number>();
  const parts = [];
  for (const [sku, name, cost, price] of PARTS) {
    const onHand = randInt(6, 40);
    const part = await prisma.part.create({
      data: {
        sku,
        name,
        unitCostCents: cost,
        unitPriceCents: price,
        stockLevel: { create: { quantityOnHand: onHand } },
      },
    });
    parts.push(part);
    stockByPart.set(part.id, onHand);
  }

  // One appointment slot per (technician, day) pair keeps the calendar
  // conflict-free by construction.
  let slot = 0;
  const baseDay = Date.UTC(2025, 0, 6); // Monday 2025-01-06

  for (let i = 0; i < STATUS_PLAN.length; i++) {
    const status = STATUS_PLAN[i] as string;
    const customer = customers[i % customers.length]!;
    const job = await prisma.job.create({
      data: {
        customerId: customer.id,
        title: JOB_TITLES[i % JOB_TITLES.length] as string,
        description:
          rand() < 0.6
            ? "Reported by the customer over the phone; see appointment notes."
            : null,
        priority: rand() < 0.15 ? "urgent" : rand() < 0.2 ? "low" : "normal",
        status: "requested",
      },
    });

    const wantsAppointments =
      status !== "requested" && (status !== "cancelled" || rand() < 0.5);
    if (wantsAppointments) {
      const count = status === "invoiced" && rand() < 0.4 ? 2 : 1;
      for (let a = 0; a < count; a++) {
        const technician = technicians[slot % technicians.length]!;
        const day = Math.floor(slot / technicians.length);
        const startMs =
          baseDay + day * 86400000 + (rand() < 0.5 ? 9 : 13) * 3600000;
        const done = status === "completed" || status === "invoiced";
        await prisma.appointment.create({
          data: {
            jobId: job.id,
            technicianId: technician.id,
            scheduledStart: new Date(startMs),
            scheduledEnd: new Date(startMs + (pick(DURATIONS_MS) as number)),
            completionNotes: done ? pick([
              "Replaced the failed component and verified operation.",
              "Cleaned, tested, and cycled twice. Holding steady.",
              "Parts swapped; recommended a follow-up service in the fall.",
            ]) : null,
          },
        });
        slot++;
      }
    }

    const usesParts =
      status === "in_progress" || status === "completed" || status === "invoiced";
    if (usesParts && rand() < 0.8) {
      const howMany = randInt(1, 3);
      for (let n = 0; n < howMany; n++) {
        const part = parts[randInt(0, parts.length - 1)]!;
        const quantity = randInt(1, 3);
        const onHand = stockByPart.get(part.id) ?? 0;
        if (onHand < quantity) continue;
        stockByPart.set(part.id, onHand - quantity);
        await prisma.stockLevel.update({
          where: { partId: part.id },
          data: { quantityOnHand: onHand - quantity },
        });
        await prisma.jobPart.create({
          data: {
            jobId: job.id,
            partId: part.id,
            quantity,
            unitPriceCents: part.unitPriceCents,
          },
        });
      }
    }

    if (status !== "requested") {
      const resting = status === "invoiced" ? "completed" : status;
      await prisma.job.update({ where: { id: job.id }, data: { status: resting } });
    }
    if (status === "invoiced") {
      await createInvoiceForJob(job.id);
    }
  }

  const jobs = await prisma.job.count();
  const invoices = await prisma.invoiceRecord.count();
  console.log(`seeded ${jobs} jobs, ${invoices} invoice records`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
