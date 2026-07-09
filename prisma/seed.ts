import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MetroGo database…");

  // ── Fare rules ────────────────────────────────────────────────────────────
  const fareMatrix: [number,number,number,number][] = [
    [1,1,10,1.0],[1,2,15,1.2],[1,3,20,1.25],[1,4,25,1.3],[1,5,30,1.3],
    [2,2,10,1.0],[2,3,15,1.2],[2,4,20,1.25],[2,5,25,1.3],
    [3,3,10,1.0],[3,4,15,1.2],[3,5,20,1.25],
    [4,4,10,1.0],[4,5,15,1.2],
    [5,5,10,1.0],
  ];
  for (const [fz,tz,base,peak] of fareMatrix) {
    await prisma.fareRule.upsert({
      where: { fromZone_toZone: { fromZone: fz, toZone: tz } },
      create: { fromZone: fz, toZone: tz, baseFare: base, peakMultiplier: peak },
      update: { baseFare: base, peakMultiplier: peak },
    });
  }
  console.log("✓ Fare rules");

  // ── Discount rules ────────────────────────────────────────────────────────
  for (const [category, pct] of [["student",25],["senior",30],["disability",50]]) {
    await prisma.discountRule.upsert({
      where: { category: category as string },
      create: { category: category as string, discountPct: pct as number, requiresVerification: true },
      update: { discountPct: pct as number },
    });
  }
  console.log("✓ Discount rules");

  // ── Helper ────────────────────────────────────────────────────────────────
  async function seedCity(city: string, lines: { name: string; color: string; stations: { name: string; zone: number; lat: number; lng: number }[] }[]) {
    const stationMap = new Map<string, string>();
    for (const lineData of lines) {
      const line = await prisma.line.upsert({
        where: { name: lineData.name },
        create: { name: lineData.name, colorHex: lineData.color },
        update: { colorHex: lineData.color },
      });
      for (let i = 0; i < lineData.stations.length; i++) {
        const s = lineData.stations[i];
        const key = `${city}::${s.name}`;
        let stationId = stationMap.get(key);
        if (!stationId) {
          const station = await prisma.station.upsert({
            where: { name_city: { name: s.name, city } },
            create: { name: s.name, city, zone: s.zone, latitude: s.lat, longitude: s.lng },
            update: { zone: s.zone },
          });
          stationId = station.id;
          stationMap.set(key, stationId);
        }
        await prisma.lineStation.upsert({
          where: { lineId_stationId: { lineId: line.id, stationId } },
          create: { lineId: line.id, stationId, sequence: i + 1 },
          update: { sequence: i + 1 },
        });
      }
    }
    console.log(`✓ ${city} (${lines.length} lines, ${stationMap.size} stations)`);
  }

  // ── Bengaluru ─────────────────────────────────────────────────────────────
  await seedCity("Bengaluru", [
    { name: "Blue Line (Bengaluru)", color: "#2563eb", stations: [
      { name: "Baiyappanahalli", zone: 1, lat: 12.9913, lng: 77.6607 },
      { name: "Swami Vivekananda Road", zone: 1, lat: 12.9898, lng: 77.6519 },
      { name: "Indiranagar", zone: 2, lat: 12.9784, lng: 77.6408 },
      { name: "Halasuru", zone: 2, lat: 12.9786, lng: 77.6229 },
      { name: "Trinity", zone: 2, lat: 12.9770, lng: 77.6124 },
      { name: "Majestic", zone: 2, lat: 12.9767, lng: 77.5993 },
      { name: "City Railway Station", zone: 2, lat: 12.9780, lng: 77.5742 },
      { name: "Magadi Road", zone: 3, lat: 12.9758, lng: 77.5521 },
      { name: "Vijayanagar", zone: 3, lat: 12.9737, lng: 77.5327 },
      { name: "Mysuru Road", zone: 3, lat: 12.9696, lng: 77.5119 },
    ]},
    { name: "Green Line (Bengaluru)", color: "#16a34a", stations: [
      { name: "Nagasandra", zone: 4, lat: 13.0531, lng: 77.5139 },
      { name: "Dasarahalli", zone: 4, lat: 13.0448, lng: 77.5178 },
      { name: "Jalahalli", zone: 3, lat: 13.0360, lng: 77.5218 },
      { name: "Peenya Industry", zone: 3, lat: 13.0281, lng: 77.5250 },
      { name: "Yeshwanthpur", zone: 2, lat: 13.0179, lng: 77.5396 },
      { name: "Rajajinagar", zone: 2, lat: 12.9940, lng: 77.5750 },
      { name: "Majestic", zone: 2, lat: 12.9767, lng: 77.5993 },
      { name: "KR Market", zone: 2, lat: 12.9619, lng: 77.5755 },
      { name: "Jayanagar", zone: 3, lat: 12.9299, lng: 77.5865 },
      { name: "JP Nagar", zone: 4, lat: 12.9060, lng: 77.5940 },
      { name: "Yelachenahalli", zone: 4, lat: 12.8930, lng: 77.5880 },
    ]},
  ]);

  // ── Chennai ───────────────────────────────────────────────────────────────
  await seedCity("Chennai", [
    { name: "Blue Line (Chennai)", color: "#0284c7", stations: [
      { name: "Wimco Nagar", zone: 1, lat: 13.1445, lng: 80.2965 },
      { name: "Thiruvotriyur", zone: 1, lat: 13.1295, lng: 80.3023 },
      { name: "Tondiarpet", zone: 2, lat: 13.1060, lng: 80.2949 },
      { name: "Washermenpet", zone: 2, lat: 13.0938, lng: 80.2908 },
      { name: "Chennai Central", zone: 2, lat: 13.0827, lng: 80.2760 },
      { name: "LIC", zone: 2, lat: 13.0759, lng: 80.2680 },
      { name: "Thousand Lights", zone: 3, lat: 13.0726, lng: 80.2626 },
      { name: "Teynampet", zone: 3, lat: 13.0560, lng: 80.2508 },
      { name: "Nandanam", zone: 3, lat: 13.0473, lng: 80.2448 },
      { name: "Saidapet", zone: 3, lat: 13.0340, lng: 80.2245 },
      { name: "Guindy", zone: 4, lat: 13.0070, lng: 80.2136 },
      { name: "Chennai Airport", zone: 5, lat: 12.9941, lng: 80.1709 },
    ]},
    { name: "Green Line (Chennai)", color: "#15803d", stations: [
      { name: "Chennai Central", zone: 2, lat: 13.0827, lng: 80.2760 },
      { name: "Egmore", zone: 2, lat: 13.0780, lng: 80.2620 },
      { name: "Ashok Nagar", zone: 3, lat: 13.0695, lng: 80.2220 },
      { name: "Vadapalani", zone: 3, lat: 13.0561, lng: 80.2123 },
      { name: "Koyambedu", zone: 4, lat: 13.0690, lng: 80.1974 },
      { name: "Porur", zone: 4, lat: 13.0360, lng: 80.1570 },
    ]},
  ]);

  // ── Delhi ─────────────────────────────────────────────────────────────────
  await seedCity("Delhi", [
    { name: "Yellow Line (Delhi)", color: "#eab308", stations: [
      { name: "Jahangirpuri", zone: 4, lat: 28.7255, lng: 77.1622 },
      { name: "Adarsh Nagar", zone: 4, lat: 28.7150, lng: 77.1690 },
      { name: "Azadpur", zone: 3, lat: 28.7050, lng: 77.1780 },
      { name: "Model Town", zone: 3, lat: 28.6978, lng: 77.1927 },
      { name: "GTB Nagar", zone: 3, lat: 28.6878, lng: 77.2052 },
      { name: "Vishwa Vidyalaya", zone: 2, lat: 28.6888, lng: 77.2107 },
      { name: "Civil Lines", zone: 2, lat: 28.6820, lng: 77.2193 },
      { name: "Kashmere Gate", zone: 2, lat: 28.6671, lng: 77.2277 },
      { name: "Chandni Chowk", zone: 1, lat: 28.6567, lng: 77.2300 },
      { name: "New Delhi", zone: 1, lat: 28.6402, lng: 77.2197 },
      { name: "Rajiv Chowk", zone: 1, lat: 28.6328, lng: 77.2197 },
      { name: "Central Secretariat", zone: 1, lat: 28.6149, lng: 77.2077 },
      { name: "AIIMS Delhi", zone: 3, lat: 28.5675, lng: 77.2098 },
      { name: "Hauz Khas", zone: 3, lat: 28.5437, lng: 77.2063 },
      { name: "Saket", zone: 4, lat: 28.5219, lng: 77.2115 },
      { name: "Qutab Minar", zone: 4, lat: 28.5074, lng: 77.1803 },
      { name: "HUDA City Centre", zone: 5, lat: 28.4597, lng: 77.0716 },
    ]},
    { name: "Blue Line (Delhi)", color: "#2563eb", stations: [
      { name: "Dwarka Sector 21", zone: 5, lat: 28.5521, lng: 77.0588 },
      { name: "Dwarka", zone: 5, lat: 28.5736, lng: 77.0730 },
      { name: "Dwarka Mor", zone: 3, lat: 28.6086, lng: 77.0963 },
      { name: "Janakpuri West", zone: 2, lat: 28.6278, lng: 77.0608 },
      { name: "Rajouri Garden", zone: 2, lat: 28.6449, lng: 77.1225 },
      { name: "Karol Bagh", zone: 1, lat: 28.6498, lng: 77.1908 },
      { name: "Rajiv Chowk", zone: 1, lat: 28.6328, lng: 77.2197 },
      { name: "Mandi House", zone: 1, lat: 28.6246, lng: 77.2333 },
      { name: "Indraprastha", zone: 2, lat: 28.6127, lng: 77.2491 },
      { name: "Akshardham", zone: 2, lat: 28.6135, lng: 77.2770 },
      { name: "Mayur Vihar Phase 1", zone: 3, lat: 28.6069, lng: 77.2944 },
      { name: "Anand Vihar", zone: 4, lat: 28.6462, lng: 77.3161 },
      { name: "Vaishali", zone: 5, lat: 28.6446, lng: 77.3441 },
    ]},
  ]);

  // ── Mumbai ────────────────────────────────────────────────────────────────
  await seedCity("Mumbai", [
    { name: "Aqua Line (Mumbai)", color: "#06b6d4", stations: [
      { name: "Versova", zone: 4, lat: 19.1309, lng: 72.8185 },
      { name: "DN Nagar", zone: 4, lat: 19.1197, lng: 72.8296 },
      { name: "Andheri", zone: 3, lat: 19.1197, lng: 72.8469 },
      { name: "Chakala", zone: 3, lat: 19.1080, lng: 72.8680 },
      { name: "Airport Road", zone: 3, lat: 19.1035, lng: 72.8752 },
      { name: "Marol Naka", zone: 3, lat: 19.0958, lng: 72.8856 },
      { name: "Saki Naka", zone: 2, lat: 19.0960, lng: 72.8920 },
      { name: "Ghatkopar", zone: 2, lat: 19.0859, lng: 72.9082 },
    ]},
    { name: "Orange Line (Mumbai)", color: "#f97316", stations: [
      { name: "BKC", zone: 1, lat: 19.0641, lng: 72.8681 },
      { name: "Dharavi", zone: 1, lat: 19.0453, lng: 72.8545 },
      { name: "Dadar", zone: 2, lat: 19.0178, lng: 72.8431 },
      { name: "Worli", zone: 1, lat: 19.0082, lng: 72.8187 },
      { name: "Lower Parel", zone: 1, lat: 18.9987, lng: 72.8342 },
      { name: "Mahalaxmi", zone: 1, lat: 18.9858, lng: 72.8209 },
    ]},
  ]);

  // ── Hyderabad ─────────────────────────────────────────────────────────────
  await seedCity("Hyderabad", [
    { name: "Red Line (Hyderabad)", color: "#dc2626", stations: [
      { name: "Miyapur", zone: 4, lat: 17.4938, lng: 78.3494 },
      { name: "KPHB Colony", zone: 4, lat: 17.4966, lng: 78.3760 },
      { name: "Kukatpally", zone: 4, lat: 17.4909, lng: 78.3946 },
      { name: "Balanagar", zone: 3, lat: 17.4858, lng: 78.4143 },
      { name: "Erragadda", zone: 3, lat: 17.4643, lng: 78.4410 },
      { name: "Ameerpet", zone: 1, lat: 17.4375, lng: 78.4483 },
      { name: "Punjagutta", zone: 1, lat: 17.4277, lng: 78.4493 },
      { name: "Khairatabad", zone: 1, lat: 17.4225, lng: 78.4574 },
      { name: "Nampally", zone: 1, lat: 17.3944, lng: 78.4700 },
      { name: "MG Bus Station", zone: 2, lat: 17.3775, lng: 78.4816 },
      { name: "Dilsukhnagar", zone: 4, lat: 17.3681, lng: 78.5371 },
      { name: "LB Nagar", zone: 5, lat: 17.3464, lng: 78.5506 },
    ]},
    { name: "Blue Line (Hyderabad)", color: "#2563eb", stations: [
      { name: "Nagole", zone: 4, lat: 17.3921, lng: 78.5697 },
      { name: "Uppal", zone: 3, lat: 17.4035, lng: 78.5595 },
      { name: "Tarnaka", zone: 2, lat: 17.4274, lng: 78.5245 },
      { name: "Secunderabad East", zone: 2, lat: 17.4399, lng: 78.5127 },
      { name: "Paradise", zone: 1, lat: 17.4483, lng: 78.4900 },
      { name: "Begumpet", zone: 1, lat: 17.4428, lng: 78.4582 },
      { name: "Ameerpet", zone: 1, lat: 17.4375, lng: 78.4483 },
      { name: "Yusufguda", zone: 2, lat: 17.4249, lng: 78.4263 },
      { name: "Madhapur", zone: 3, lat: 17.4443, lng: 78.3814 },
      { name: "HITEC City", zone: 4, lat: 17.4477, lng: 78.3671 },
    ]},
  ]);

  // ── Kolkata ───────────────────────────────────────────────────────────────
  await seedCity("Kolkata", [
    { name: "Blue Line (Kolkata)", color: "#1d4ed8", stations: [
      { name: "Noapara", zone: 4, lat: 22.6512, lng: 88.3826 },
      { name: "Dakshineswar", zone: 3, lat: 22.6330, lng: 88.3819 },
      { name: "Shyambazar", zone: 2, lat: 22.5847, lng: 88.3736 },
      { name: "Girish Park", zone: 1, lat: 22.5768, lng: 88.3600 },
      { name: "Central (Kolkata)", zone: 1, lat: 22.5703, lng: 88.3512 },
      { name: "Chandni Chowk (Kolkata)", zone: 1, lat: 22.5622, lng: 88.3464 },
      { name: "Esplanade", zone: 1, lat: 22.5567, lng: 88.3510 },
      { name: "Park Street", zone: 1, lat: 22.5516, lng: 88.3514 },
      { name: "Maidan", zone: 1, lat: 22.5467, lng: 88.3451 },
      { name: "Rabindra Sarobar", zone: 2, lat: 22.5138, lng: 88.3392 },
      { name: "Kalighat", zone: 2, lat: 22.5192, lng: 88.3439 },
      { name: "New Garia", zone: 3, lat: 22.4676, lng: 88.3950 },
    ]},
  ]);

  // ── Admin account ─────────────────────────────────────────────────────────
  const hash = bcrypt.hashSync("MetroGo@Admin2024", 10);

  await prisma.user.upsert({
    where: { email: "gowrireddy4868@gmail.com" },
    create: {
      name: "Gowri",
      email: "gowrireddy4868@gmail.com",
      passwordHash: hash,
      role: "ADMIN",
      emailVerified: true,
    },
    update: { role: "ADMIN", emailVerified: true },
  });

  console.log("✓ Admin: gowrireddy4868@gmail.com / MetroGo@Admin2024");
  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
