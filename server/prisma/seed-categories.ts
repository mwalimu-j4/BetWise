import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SPORT_CATEGORIES = [
  { sportKey: "soccer", displayName: "Football", icon: "⚽", apiSportId: "soccer", sortOrder: 1 },
  { sportKey: "basketball", displayName: "Basketball", icon: "🏀", apiSportId: "basketball", sortOrder: 2 },
  { sportKey: "tennis", displayName: "Tennis", icon: "🎾", apiSportId: "tennis", sortOrder: 3 },
  { sportKey: "americanfootball", displayName: "American Football", icon: "🏈", apiSportId: "americanfootball", sortOrder: 4 },
  { sportKey: "cricket", displayName: "Cricket", icon: "🏏", apiSportId: "cricket", sortOrder: 5 },
  { sportKey: "icehockey", displayName: "Ice Hockey", icon: "🏒", apiSportId: "icehockey", sortOrder: 6 },
  { sportKey: "rugbyunion", displayName: "Rugby Union", icon: "🏉", apiSportId: "rugbyleague", sortOrder: 7 },
  { sportKey: "boxing_mma", displayName: "Boxing / MMA", icon: "🥊", apiSportId: "mma", sortOrder: 8 },
  { sportKey: "baseball", displayName: "Baseball", icon: "⚾", apiSportId: "baseball", sortOrder: 9 },
  { sportKey: "volleyball", displayName: "Volleyball", icon: "🏐", apiSportId: "volleyball", sortOrder: 10 },
  { sportKey: "tabletennis", displayName: "Table Tennis", icon: "🏓", apiSportId: "tabletennis", sortOrder: 11 },
  { sportKey: "golf", displayName: "Golf", icon: "⛳", apiSportId: "golf", sortOrder: 12 },
  { sportKey: "snooker", displayName: "Snooker", icon: "🎱", apiSportId: "snooker", sortOrder: 13 },
  { sportKey: "darts", displayName: "Darts", icon: "🎯", apiSportId: "darts", sortOrder: 14 },
];

async function main() {
  console.log("[Seed] Seeding sport categories...");

  await prisma.$transaction(async (tx) => {
    for (const category of SPORT_CATEGORIES) {
      await tx.sportCategory.upsert({
        where: { sportKey: category.sportKey },
        update: {
          displayName: category.displayName,
          icon: category.icon,
          apiSportId: category.apiSportId,
          sortOrder: category.sortOrder,
        },
        create: {
          sportKey: category.sportKey,
          displayName: category.displayName,
          icon: category.icon,
          apiSportId: category.apiSportId,
          sortOrder: category.sortOrder,
          isActive: false,
          showInNav: true,
          eventCount: 0,
        },
      });
    }
  });

  console.log(`[Seed] ${SPORT_CATEGORIES.length} sport categories seeded.`);
}

main()
  .catch((error) => {
    console.error("[Seed] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
