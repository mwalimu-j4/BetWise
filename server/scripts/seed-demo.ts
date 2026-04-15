/// <reference types="node" />

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const demoDomain = "betwise.demo";
const demoSeed = process.env.SEED?.trim() || "betwise-demo";
const demoAdminPassword =
  process.env.DEMO_ADMIN_PASSWORD?.trim() || "DemoAdmin@123";
const demoUserPassword =
  process.env.DEMO_USER_PASSWORD?.trim() || "DemoUser@123";

type DemoOptions = {
  reset: boolean;
  adminCount: number;
  userCount: number;
  eventCount: number;
  betCount: number;
  withdrawalCount: number;
  contactCount: number;
  appealCount: number;
  newsletterCount: number;
  riskCount: number;
};

type DemoUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: "ADMIN" | "USER";
  accountStatus: "ACTIVE" | "SUSPENDED";
  bannedAt: Date | null;
  banReason: string | null;
};

type DemoEvent = {
  id: string;
  eventId: string;
  leagueName: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  status: "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
};

type OddsSelection = {
  bookmakerId: string;
  bookmakerName: string;
  marketType: string;
  side: string;
  rawOdds: number;
  displayOdds: number;
  isVisible: boolean;
};

type WalletState = {
  userId: string;
  walletId: string;
  balance: number;
};

type WithdrawalSeedStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED";

const firstNames = [
  "Amina",
  "Brian",
  "Caroline",
  "Daniel",
  "Esther",
  "Farah",
  "George",
  "Hellen",
  "Ian",
  "Joy",
  "Kevin",
  "Lilian",
  "Martin",
  "Nia",
  "Oscar",
  "Priscilla",
  "Quentin",
  "Ruth",
  "Samuel",
  "Teresa",
  "Victor",
  "Wanjiku",
  "Yusuf",
  "Zara",
];

const lastNames = [
  "Achieng",
  "Barasa",
  "Cheruiyot",
  "Davis",
  "Ekwueme",
  "Farah",
  "Githinji",
  "Hassan",
  "Ibrahim",
  "Juma",
  "Kariuki",
  "Lagat",
  "Mwangi",
  "Njoroge",
  "Omondi",
  "Patel",
  "Rono",
  "Simiyu",
  "Tanui",
  "Wafula",
];

const sports = [
  {
    sportKey: "soccer",
    leagues: ["Premier League", "La Liga", "Serie A", "UCL"],
  },
  { sportKey: "basketball", leagues: ["NBA", "EuroLeague", "AfroBasket"] },
  { sportKey: "tennis", leagues: ["ATP Tour", "WTA Tour", "Challenger"] },
  { sportKey: "rugby", leagues: ["Six Nations", "Premiership Rugby", "URC"] },
  { sportKey: "cricket", leagues: ["IPL", "The Hundred", "World Cup"] },
];

const bookmakerCatalog = [
  { bookmakerId: "betika", bookmakerName: "Betika" },
  { bookmakerId: "sportpesa", bookmakerName: "SportPesa" },
  { bookmakerId: "bet365", bookmakerName: "Bet365" },
];

const marketSides: Record<string, string[]> = {
  h2h: ["home", "away", "draw"],
  spreads: ["home", "away"],
  totals: ["over", "under"],
};

const betAuditActions = [
  "UPDATE_BLOCKED",
  "CANCEL_ATTEMPT",
  "CANCEL_SUCCESS",
  "CANCEL_BLOCKED",
  "INTEGRITY_ERROR",
] as const;

function parseOptions(argv: string[]): DemoOptions {
  const options: DemoOptions = {
    reset: argv.includes("--reset"),
    adminCount: 1,
    userCount: 18,
    eventCount: 16,
    betCount: 54,
    withdrawalCount: 12,
    contactCount: 12,
    appealCount: 3,
    newsletterCount: 16,
    riskCount: 12,
  };

  for (const entry of argv) {
    const [rawKey, rawValue] = entry.replace(/^--/, "").split("=");
    if (!rawValue) {
      continue;
    }

    const value = Number(rawValue);
    if (Number.isNaN(value)) {
      continue;
    }

    if (rawKey === "admins") options.adminCount = Math.max(1, value);
    if (rawKey === "users") options.userCount = Math.max(1, value);
    if (rawKey === "events") options.eventCount = Math.max(1, value);
    if (rawKey === "bets") options.betCount = Math.max(1, value);
    if (rawKey === "withdrawals") options.withdrawalCount = Math.max(1, value);
    if (rawKey === "contacts") options.contactCount = Math.max(1, value);
    if (rawKey === "appeals") options.appealCount = Math.max(1, value);
    if (rawKey === "newsletter") options.newsletterCount = Math.max(1, value);
    if (rawKey === "risks") options.riskCount = Math.max(1, value);
  }

  return options;
}

function createRng(seedText: string) {
  let state = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    state = Math.imul(31, state) + seedText.charCodeAt(index);
  }

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = createRng(demoSeed);

function randomInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)];
}

function pickUnique<T>(items: T[], count: number) {
  const clone = [...items];
  const result: T[] = [];

  while (clone.length > 0 && result.length < count) {
    const index = randomInt(0, clone.length - 1);
    const [value] = clone.splice(index, 1);
    if (value) {
      result.push(value);
    }
  }

  return result;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pad(index: number, width = 3) {
  return String(index).padStart(width, "0");
}

function makeEmail(prefix: string, index: number) {
  return `${prefix}.${pad(index, 2)}@${demoDomain}`;
}

function makePhone(index: number) {
  return `+2547${String(10000000 + index)}`;
}

function makeReference(prefix: string, index: number) {
  return `${prefix}-${pad(index, 4)}-${randomUUID().slice(0, 8)}`;
}

function makeName(index: number) {
  const first = firstNames[index % firstNames.length];
  const last = lastNames[(index * 3) % lastNames.length];
  return `${first} ${last}`;
}

function buildEventTeams(index: number) {
  const cityPool = [
    "Nairobi",
    "Mombasa",
    "Kisumu",
    "Nakuru",
    "Eldoret",
    "Thika",
    "Meru",
    "Malindi",
    "Machakos",
    "Kakamega",
    "Kericho",
    "Embu",
  ];

  const home = `${pick(cityPool)} ${pick(["United", "Stars", "Athletic", "Rangers", "City", "Spartans"])} ${pad(index, 2)}`;
  const away = `${pick(cityPool)} ${pick(["FC", "Harbor", "Legends", "Warriors", "Blaze", "Dynamos"])} ${pad(index + 1, 2)}`;

  return { home, away };
}

function buildMarketSelections() {
  const markets = ["h2h", "spreads", "totals"];
  const selections: OddsSelection[] = [];

  for (const bookmaker of bookmakerCatalog) {
    for (const marketType of markets) {
      for (const side of marketSides[marketType]) {
        const rawOdds = Number((1.1 + rng() * 3.2).toFixed(2));
        const displayOdds = Number(
          (rawOdds * (0.96 + rng() * 0.08)).toFixed(2),
        );

        selections.push({
          bookmakerId: bookmaker.bookmakerId,
          bookmakerName: bookmaker.bookmakerName,
          marketType,
          side,
          rawOdds,
          displayOdds,
          isVisible: rng() > 0.12,
        });
      }
    }
  }

  return selections;
}

async function cleanupDemoData() {
  await prisma.contact.deleteMany({
    where: { subject: { startsWith: "Demo " } },
  });

  await prisma.riskAlert.deleteMany({
    where: { description: { startsWith: "Demo " } },
  });

  await prisma.newsletterSubscription.deleteMany({
    where: { email: { endsWith: `@${demoDomain}` } },
  });

  // Delete bets before sport_events to avoid foreign key constraint
  await prisma.bet.deleteMany({
    where: {
      betCode: { startsWith: "DEMO-BET-" },
    },
  });

  await prisma.sportEvent.deleteMany({
    where: { eventId: { startsWith: "demo-event-" } },
  });

  await prisma.user.deleteMany({
    where: { email: { endsWith: `@${demoDomain}` } },
  });
}

async function seedAdminSettings() {
  console.log("→ Seeding admin settings...");
  await prisma.adminSettings.upsert({
    where: { key: "global" },
    update: {
      platformName: "BetWise Demo",
      environment: "demo",
      maintenanceMode: false,
      registrationEnabled: true,
      adminTwoFactorRequired: false,
      welcomeBonusEnabled: true,
      notifyAdminAlerts: true,
      notifyBetPlaced: true,
      notifyBetResult: true,
      notifyDepositSuccess: true,
      notifyWithdrawalSuccess: true,
      mpesaShortcode: "174379",
      mpesaConsumerKey: "demo-consumer-key",
      mpesaConsumerSecret: "demo-consumer-secret",
      mpesaPasskey: "demo-passkey",
      mpesaCallbackUrl: "https://demo.betwise.local/api/mpesa/callback",
      sportsApiKey: "demo-sports-api-key",
      updatedBy: "demo-seed",
    },
    create: {
      key: "global",
      platformName: "BetWise Demo",
      environment: "demo",
      maintenanceMode: false,
      registrationEnabled: true,
      adminTwoFactorRequired: false,
      updatedBy: "demo-seed",
    },
  });
  console.log("✓ Admin settings configured\n");
}

async function seedUsers(options: DemoOptions) {
  console.log(
    `→ Creating ${options.adminCount} admin(s) and ${options.userCount} user(s)...`,
  );
  const admins: DemoUser[] = [];
  const regularUsers: DemoUser[] = [];

  for (let index = 1; index <= options.adminCount; index += 1) {
    admins.push({
      id: randomUUID(),
      email:
        index === 1
          ? `admin@${demoDomain}`
          : `ops.${pad(index - 1, 2)}@${demoDomain}`,
      phone: index === 1 ? "+254700000001" : makePhone(100 + index),
      fullName:
        index === 1 ? "Demo Admin" : `Operations Admin ${pad(index, 2)}`,
      role: "ADMIN",
      accountStatus: "ACTIVE",
      bannedAt: null,
      banReason: null,
    });
  }

  for (let index = 1; index <= options.userCount; index += 1) {
    const isBanned =
      index === options.userCount - 1 || index === options.userCount;
    regularUsers.push({
      id: randomUUID(),
      email: makeEmail("demo.user", index),
      phone: makePhone(index + 10),
      fullName: makeName(index),
      role: "USER",
      accountStatus: index % 11 === 0 ? "SUSPENDED" : "ACTIVE",
      bannedAt: isBanned ? new Date(Date.now() - index * 60 * 60 * 1000) : null,
      banReason: isBanned
        ? "Repeated suspicious betting patterns in demo data"
        : null,
    });
  }

  const userRecords = [...admins, ...regularUsers].map((user) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    accountStatus: user.accountStatus,
    bannedAt: user.bannedAt,
    banReason: user.banReason,
    isVerified: true,
    adminTotpEnabled: false,
    adminTotpSecret: null,
    passwordHash: bcrypt.hashSync(
      user.role === "ADMIN" ? demoAdminPassword : demoUserPassword,
      10,
    ),
  }));

  await prisma.user.createMany({ data: userRecords, skipDuplicates: true });

  console.log(`  ✓ Created ${admins.length} admin(s)`);
  console.log(`  ✓ Created ${regularUsers.length} regular user(s)\n`);

  return { admins, regularUsers, allUsers: [...admins, ...regularUsers] };
}

async function seedWallets(users: DemoUser[]) {
  console.log(`→ Creating wallets for ${users.length} user(s)...`);
  const wallets: WalletState[] = [];

  for (const user of users) {
    const wallet = await prisma.wallet.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        balance: 0,
      },
    });

    wallets.push({ userId: user.id, walletId: wallet.id, balance: 0 });
  }

  console.log(`✓ Created ${wallets.length} wallet(s)\n`);

  return wallets;
}

async function seedNewsletterSubscriptions(count: number) {
  console.log(`→ Creating ${count} newsletter subscription(s)...`);
  const records = Array.from({ length: count }, (_, index) => ({
    email: `newsletter.${pad(index + 1, 2)}@${demoDomain}`,
    isActive: index % 5 !== 0,
    unsubscribedAt:
      index % 5 === 0
        ? new Date(Date.now() - index * 24 * 60 * 60 * 1000)
        : null,
  }));

  await prisma.newsletterSubscription.createMany({ data: records });
}

async function seedEvents(count: number) {
  const events: DemoEvent[] = [];
  const startTime = Date.now();

  for (let index = 1; index <= count; index += 1) {
    const sport = sports[(index - 1) % sports.length];
    const leagueName = sport.leagues[(index - 1) % sport.leagues.length];
    const { home, away } = buildEventTeams(index);
    const statusCycle = ["UPCOMING", "LIVE", "FINISHED", "CANCELLED"] as const;
    const status = statusCycle[(index - 1) % statusCycle.length];
    const commenceTime = new Date(startTime + (index - 8) * 6 * 60 * 60 * 1000);

    const event = await prisma.sportEvent.create({
      data: {
        id: randomUUID(),
        eventId: `demo-event-${pad(index, 3)}`,
        leagueId: `${toSlug(leagueName)}-${pad(index, 2)}`,
        leagueName,
        sportKey: sport.sportKey,
        homeTeam: home,
        awayTeam: away,
        commenceTime,
        status,
        homeScore:
          status === "FINISHED" || status === "LIVE" ? randomInt(0, 5) : null,
        awayScore:
          status === "FINISHED" || status === "LIVE" ? randomInt(0, 5) : null,
        rawData: {
          source: "demo-seed",
          sportKey: sport.sportKey,
          leagueName,
        },
        isActive: status !== "CANCELLED",
        houseMargin: Number((0.04 + rng() * 0.06).toFixed(3)),
        marketsEnabled: ["h2h", "spreads", "totals"],
        fetchedAt: new Date(),
      },
    });

    events.push({
      id: event.id,
      eventId: event.eventId,
      leagueName,
      sportKey: sport.sportKey,
      homeTeam: home,
      awayTeam: away,
      commenceTime,
      status,
    });
  }

  console.log(`✓ Created ${events.length} event(s)\n`);

  return events;
}

async function seedOdds(events: DemoEvent[]) {
  console.log(`→ Creating odds for ${events.length} event(s)...`);
  let oddsCount = 0;
  const selectionsByEvent = new Map<string, OddsSelection[]>();

  for (const event of events) {
    selectionsByEvent.set(event.eventId, buildMarketSelections());
  }

  for (const event of events) {
    const selections = selectionsByEvent.get(event.eventId) || [];

    for (const selection of selections) {
      await prisma.eventOdds.create({
        data: {
          id: randomUUID(),
          eventId: event.eventId,
          bookmakerId: selection.bookmakerId,
          bookmakerName: selection.bookmakerName,
          marketType: selection.marketType,
          side: selection.side,
          decimalOdds: selection.rawOdds,
        },
      });

      await prisma.displayedOdds.create({
        data: {
          id: randomUUID(),
          eventId: event.eventId,
          bookmakerId: selection.bookmakerId,
          bookmakerName: selection.bookmakerName,
          marketType: selection.marketType,
          side: selection.side,
          rawOdds: selection.rawOdds,
          displayOdds: selection.displayOdds,
          isVisible: selection.isVisible,
        },
      });
    }
  }

  console.log(`✓ Created odds across ${selectionsByEvent.size} event(s)\n`);

  return selectionsByEvent;
}

async function createWithdrawalNotifications(args: {
  userId: string;
  transactionId: string;
  amount: number;
  fee: number;
  balance: number;
  phone: string;
  status: WithdrawalSeedStatus;
  failureReason?: string;
}) {
  const [userProfile, adminUsers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: args.userId },
      select: { phone: true, email: true },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    }),
  ]);

  const userIdentifier =
    userProfile?.phone ?? userProfile?.email ?? args.userId;
  const netAmount = args.amount - args.fee;

  let userTitle = "";
  let userMessage = "";
  let adminTitle = "";
  let adminMessage = "";
  let notificationType: "WITHDRAWAL_SUCCESS" | "WITHDRAWAL_FAILED" | "SYSTEM" =
    "SYSTEM";

  if (args.status === "PENDING") {
    userTitle = "Withdrawal Request Submitted";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} (KES ${args.fee.toLocaleString()} fee) is pending admin approval. You'll receive KES ${netAmount.toLocaleString()}.`;
    adminTitle = "New Withdrawal Request";
    adminMessage = `${userIdentifier} requested a withdrawal of KES ${args.amount.toLocaleString()} to ${args.phone} (Fee: KES ${args.fee.toLocaleString()}).`;
    notificationType = "SYSTEM";
  } else if (args.status === "PROCESSING") {
    userTitle = "Withdrawal Processing";
    userMessage = `Your withdrawal of KES ${args.amount.toLocaleString()} is being processed for ${args.phone}. Fee charged: KES ${args.fee.toLocaleString()}. Current balance: KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Processing";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} for ${userIdentifier} is being processed for ${args.phone}.`;
    notificationType = "SYSTEM";
  } else if (args.status === "COMPLETED") {
    userTitle = "Withdrawal Successful";
    userMessage = `Your withdrawal of KES ${args.amount.toLocaleString()} has been processed to ${args.phone}. Fee charged: KES ${args.fee.toLocaleString()}. New balance: KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Completed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} to ${userIdentifier} (${args.phone}) completed successfully.`;
    notificationType = "WITHDRAWAL_SUCCESS";
  } else if (args.status === "FAILED") {
    userTitle = "Withdrawal Failed";
    userMessage = `Your withdrawal request for KES ${args.amount.toLocaleString()} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance remains unchanged at KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Failed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} failed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
    notificationType = "WITHDRAWAL_FAILED";
  } else if (args.status === "REVERSED") {
    userTitle = "Withdrawal Reversed";
    userMessage = `Your withdrawal of KES ${args.amount.toLocaleString()} was reversed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""} Your balance is KES ${args.balance.toLocaleString()}.`;
    adminTitle = "Withdrawal Reversed";
    adminMessage = `Withdrawal of KES ${args.amount.toLocaleString()} for ${userIdentifier} to ${args.phone} was reversed.${args.failureReason ? ` Reason: ${args.failureReason}.` : ""}`;
    notificationType = "WITHDRAWAL_FAILED";
  }

  const createPayload = [
    {
      id: randomUUID(),
      userId: args.userId,
      audience: "USER" as const,
      type: notificationType,
      title: userTitle,
      message: userMessage,
      transactionId: args.transactionId,
      amount: args.amount,
      balance: args.balance,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...adminUsers.map((admin) => ({
      id: randomUUID(),
      userId: admin.id,
      audience: "ADMIN" as const,
      type: notificationType,
      title: adminTitle,
      message: adminMessage,
      transactionId: args.transactionId,
      amount: args.amount,
      balance: args.balance,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  ];

  await prisma.notification.createMany({
    data: createPayload,
    skipDuplicates: true,
  });
}

async function seedTransactionsAndBets(
  users: DemoUser[],
  wallets: WalletState[],
  events: DemoEvent[],
  oddsByEvent: Map<string, OddsSelection[]>,
  betCount: number,
) {
  console.log(`→ Creating ${betCount} bet(s) with deposits and bonuses...`);
  const activeUsers = users.filter(
    (user) =>
      user.role === "USER" && user.accountStatus === "ACTIVE" && !user.bannedAt,
  );
  const walletByUserId = new Map(
    wallets.map((wallet) => [wallet.userId, wallet]),
  );
  const walletBalance = new Map(wallets.map((wallet) => [wallet.walletId, 0]));

  console.log(
    `  ▪ Generating deposits and bonuses for ${activeUsers.length} active user(s)...`,
  );
  let depositCount = 0;
  let bonusCount = 0;

  for (const user of activeUsers) {
    const wallet = walletByUserId.get(user.id);
    if (!wallet) {
      continue;
    }

    const openingDeposit = randomInt(15000, 60000);
    walletBalance.set(
      wallet.walletId,
      (walletBalance.get(wallet.walletId) || 0) + openingDeposit,
    );

    await prisma.walletTransaction.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        walletId: wallet.walletId,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: openingDeposit,
        currency: "KES",
        channel: "M-PESA",
        reference: makeReference("DEMO-TXN-DEPOSIT", randomInt(1, 9999)),
        phone: user.phone,
        accountReference: user.fullName,
        description: "Demo opening deposit",
        providerReceiptNumber: makeReference("RCPT", randomInt(1, 9999)),
        providerResponseCode: "0",
        providerResponseDescription: "Accepted",
        processedAt: new Date(Date.now() - randomInt(2, 24) * 60 * 60 * 1000),
      },
    });

    if (rng() > 0.4) {
      const bonusAmount = randomInt(500, 5000);
      walletBalance.set(
        wallet.walletId,
        (walletBalance.get(wallet.walletId) || 0) + bonusAmount,
      );

      await prisma.walletTransaction.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          walletId: wallet.walletId,
          type: "BONUS",
          status: "COMPLETED",
          amount: bonusAmount,
          currency: "KES",
          channel: "SYSTEM",
          reference: makeReference("DEMO-TXN-BONUS", randomInt(1, 9999)),
          description: "Demo welcome bonus",
          providerResponseCode: "0",
          providerResponseDescription: "Credited",
          processedAt: new Date(
            Date.now() - randomInt(1, 10) * 24 * 60 * 60 * 1000,
          ),
        },
      });
    }
  }

  console.log(`  ✓ ${depositCount} deposit(s), ${bonusCount} bonus(es)`);
  console.log(`  ▪ Placing ${betCount} bet(s)...`);
  let betPlacedCount = 0;
  let winCount = 0;
  let lossCount = 0;

  const availableEvents = events.filter((event) =>
    oddsByEvent.get(event.eventId)?.some((selection) => selection.isVisible),
  );

  for (let index = 0; index < betCount; index += 1) {
    const user = pick(activeUsers);
    const wallet = walletByUserId.get(user.id);
    const event = availableEvents[index % availableEvents.length];
    const oddsSelections = (oddsByEvent.get(event.eventId) || []).filter(
      (selection) => selection.isVisible,
    );

    if (!wallet || oddsSelections.length === 0) {
      continue;
    }

    const selection = pick(oddsSelections);
    const stake = randomInt(100, 2500);
    const placedAt = new Date(Date.now() - randomInt(1, 14) * 60 * 60 * 1000);
    const settled = event.status === "FINISHED";
    const status = settled ? pick(["WON", "LOST", "VOID"] as const) : "PENDING";
    const potentialPayout = Number((stake * selection.displayOdds).toFixed(2));
    const betCode = `DEMO-BET-${pad(index + 1, 4)}-${randomUUID().slice(0, 6)}`;

    walletBalance.set(
      wallet.walletId,
      (walletBalance.get(wallet.walletId) || 0) - stake,
    );

    await prisma.walletTransaction.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        walletId: wallet.walletId,
        type: "BET_STAKE",
        status: "COMPLETED",
        amount: stake,
        currency: "KES",
        channel: "BETTING",
        reference: makeReference("DEMO-TXN-STAKE", index + 1),
        description: `Stake for ${event.homeTeam} vs ${event.awayTeam}`,
        providerResponseCode: "0",
        providerResponseDescription: "Deducted",
        processedAt: placedAt,
      },
    });

    if (status === "WON") {
      walletBalance.set(
        wallet.walletId,
        (walletBalance.get(wallet.walletId) || 0) + potentialPayout,
      );
      await prisma.walletTransaction.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          walletId: wallet.walletId,
          type: "BET_WIN",
          status: "COMPLETED",
          amount: potentialPayout,
          currency: "KES",
          channel: "BETTING",
          reference: makeReference("DEMO-TXN-WIN", index + 1),
          description: `Winnings from ${event.homeTeam} vs ${event.awayTeam}`,
          providerResponseCode: "0",
          providerResponseDescription: "Credited",
          processedAt: new Date(placedAt.getTime() + 2 * 60 * 60 * 1000),
        },
      });
    }

    if (status === "VOID") {
      walletBalance.set(
        wallet.walletId,
        (walletBalance.get(wallet.walletId) || 0) + stake,
      );
      await prisma.walletTransaction.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          walletId: wallet.walletId,
          type: "REFUND",
          status: "COMPLETED",
          amount: stake,
          currency: "KES",
          channel: "SYSTEM",
          reference: makeReference("DEMO-TXN-REFUND", index + 1),
          description: `Refund for voided bet on ${event.homeTeam} vs ${event.awayTeam}`,
          providerResponseCode: "0",
          providerResponseDescription: "Refunded",
          processedAt: new Date(placedAt.getTime() + 90 * 60 * 1000),
        },
      });
    }

    const createdBet = await prisma.bet.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        eventId: event.eventId,
        bookmakerId: selection.bookmakerId,
        betCode,
        betType: "NORMAL",
        marketType: selection.marketType,
        side: selection.side,
        isPromoted: rng() > 0.9,
        selectionsSnapshot: {
          eventId: event.eventId,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          bookmakerId: selection.bookmakerId,
          bookmakerName: selection.bookmakerName,
          marketType: selection.marketType,
          side: selection.side,
          odds: selection.displayOdds,
        },
        stake,
        displayOdds: selection.displayOdds,
        potentialPayout,
        status,
        placedAt,
        settledAt: settled
          ? new Date(placedAt.getTime() + 2 * 60 * 60 * 1000)
          : null,
        lastStatusChangeAt: new Date(),
      },
    });

    if (rng() > 0.7) {
      await prisma.betAuditLog.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          betId: createdBet.id,
          action: pick([...betAuditActions]),
          attemptedData: {
            betCode,
            status,
            stake,
          },
          ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(2, 250)}`,
        },
      });
    }

    await prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        audience: "USER",
        type: "SYSTEM",
        title: `Demo bet ${status.toLowerCase()}`,
        message: `Bet ${betCode} on ${event.homeTeam} vs ${event.awayTeam} was marked ${status.toLowerCase()}.`,
        transactionId: createdBet.id,
        amount: stake,
        balance: walletBalance.get(wallet.walletId) || 0,
      },
    });
  }

  for (const wallet of wallets) {
    const balance = Math.max(
      0,
      Math.round(walletBalance.get(wallet.walletId) || 0),
    );
    await prisma.wallet.update({
      where: { id: wallet.walletId },
      data: {
        balance,
      },
    });

    wallet.balance = balance;
  }
}

async function seedWithdrawals(
  users: DemoUser[],
  wallets: WalletState[],
  count: number,
) {
  const activeUsers = users.filter(
    (user) =>
      user.role === "USER" && !user.bannedAt && user.accountStatus === "ACTIVE",
  );
  const walletByUserId = new Map(
    wallets.map((wallet) => [wallet.userId, wallet]),
  );
  const withdrawalStatuses: WithdrawalSeedStatus[] = [
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "REVERSED",
  ];
  const feePercent = 5;

  for (let index = 0; index < count; index += 1) {
    const eligibleUsers = activeUsers.filter((user) => {
      const wallet = walletByUserId.get(user.id);
      return Boolean(wallet && wallet.balance >= 500);
    });

    if (eligibleUsers.length === 0) {
      break;
    }

    const user = pick(eligibleUsers);
    const wallet = walletByUserId.get(user.id);

    if (!wallet) {
      continue;
    }

    const maxAffordableAmount = Math.max(
      500,
      Math.min(60000, Math.floor(wallet.balance / 1.05)),
    );
    let withdrawalAmount = randomInt(500, maxAffordableAmount);
    let feeAmount = Math.ceil((withdrawalAmount * feePercent) / 100);

    while (
      withdrawalAmount + feeAmount > wallet.balance &&
      withdrawalAmount > 500
    ) {
      withdrawalAmount -= 1;
      feeAmount = Math.ceil((withdrawalAmount * feePercent) / 100);
    }

    if (withdrawalAmount + feeAmount > wallet.balance) {
      continue;
    }

    const totalDebit = withdrawalAmount + feeAmount;
    const status = withdrawalStatuses[index % withdrawalStatuses.length];
    const requestedAt = new Date(
      Date.now() - randomInt(1, 20) * 60 * 60 * 1000,
    );
    const finalizedAt = new Date(
      requestedAt.getTime() + randomInt(20, 180) * 60 * 1000,
    );
    const phone = user.phone;

    wallet.balance -= totalDebit;

    const transaction = await prisma.walletTransaction.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        walletId: wallet.walletId,
        type: "WITHDRAWAL",
        status,
        amount: withdrawalAmount,
        currency: "KES",
        channel: "M-Pesa",
        reference: makeReference("DEMO-TXN-WITHDRAWAL", index + 1),
        phone,
        accountReference: "BET-WITHDRAWAL",
        description: `Withdrawal to M-Pesa (${phone})`,
        providerReceiptNumber:
          status === "COMPLETED" ? makeReference("MPESA", index + 1) : null,
        providerResponseCode:
          status === "COMPLETED"
            ? "0"
            : status === "FAILED"
              ? "1"
              : status === "REVERSED"
                ? "2"
                : null,
        providerResponseDescription:
          status === "COMPLETED"
            ? "Withdrawal processed successfully"
            : status === "PROCESSING"
              ? "Withdrawal request accepted for processing"
              : status === "REVERSED"
                ? "Withdrawal reversed and funds returned"
                : status === "FAILED"
                  ? "Withdrawal failed during processing"
                  : "Withdrawal request submitted",
        providerCallback: {
          fee: feeAmount,
          totalDebit,
          requestedAt: requestedAt.toISOString(),
          disbursementState:
            status === "PENDING"
              ? "PENDING_APPROVAL"
              : status === "PROCESSING"
                ? "PROCESSING"
                : status === "COMPLETED"
                  ? "COMPLETED"
                  : status === "FAILED"
                    ? "FAILED"
                    : "REVERSED",
          finalizedAt: status === "PENDING" ? null : finalizedAt.toISOString(),
        } as never,
        processedAt: status === "PENDING" ? null : finalizedAt,
      },
    });

    if (status === "FAILED" || status === "REVERSED") {
      wallet.balance += totalDebit;
    }

    await prisma.wallet.update({
      where: { id: wallet.walletId },
      data: { balance: wallet.balance },
    });

    await createWithdrawalNotifications({
      userId: user.id,
      transactionId: transaction.id,
      amount: withdrawalAmount,
      fee: feeAmount,
      balance: wallet.balance,
      phone,
      status,
      failureReason:
        status === "FAILED"
          ? "M-Pesa disbursement was rejected"
          : status === "REVERSED"
            ? "Provider reversed the payout"
            : undefined,
    });
  }
}

async function seedContacts(users: DemoUser[], count: number) {
  const activeUsers = users.filter(
    (user) =>
      user.role === "USER" && !user.bannedAt && user.accountStatus === "ACTIVE",
  );

  for (let index = 0; index < count; index += 1) {
    const user = index % 2 === 0 ? pick(activeUsers) : null;

    await prisma.contact.create({
      data: {
        id: randomUUID(),
        userId: user?.id ?? null,
        fullName: user?.fullName ?? makeName(index + 31),
        phone: user?.phone ?? makePhone(index + 200),
        subject: `Demo support request ${pad(index + 1, 2)}`,
        message: `Demo contact message ${index + 1}. This message exists so the support inbox has realistic examples to filter and manage.`,
        status: pick(["SUBMITTED", "READ", "RESOLVED"] as const),
      },
    });
  }
}

async function seedBanAppeals(
  users: DemoUser[],
  admins: DemoUser[],
  count: number,
) {
  const bannedUsers = users.filter((user) => user.bannedAt);
  const appealUsers = bannedUsers.slice(0, Math.min(count, bannedUsers.length));

  for (let index = 0; index < appealUsers.length; index += 1) {
    const user = appealUsers[index];
    const appealText = `Demo appeal from ${user.fullName}. The account owner requests a review of the ban decision and provides a detailed explanation for moderation testing.`;

    const appeal = await prisma.banAppeal.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        appealText,
        status: index === 0 ? "PENDING" : "REJECTED",
        responseText:
          index === 0
            ? null
            : "After review, the ban remains in place for demo moderation coverage.",
        reviewedAt: index === 0 ? null : new Date(),
        reviewedBy: index === 0 ? null : (admins[0]?.id ?? null),
      },
    });

    if (index === 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          id: randomUUID(),
          userId: admin.id,
          audience: "ADMIN" as const,
          type: "SYSTEM" as const,
          title: "Demo ban appeal received",
          message: `A demo user submitted appeal ${appeal.id}.`,
          transactionId: appeal.id,
        })),
        skipDuplicates: true,
      });
    }
  }
}

async function seedRiskAlerts(
  users: DemoUser[],
  events: DemoEvent[],
  count: number,
) {
  const activeUsers = users.filter(
    (user) =>
      user.role === "USER" && !user.bannedAt && user.accountStatus === "ACTIVE",
  );
  const alertTypes = [
    "HIGH_RISK_BET",
    "EXPOSURE_LIMIT_EXCEEDED",
    "SUSPICIOUS_PATTERN",
    "RAPID_ACCOUNT_ACTIVITY",
    "UNUSUAL_ODDS_MOVEMENT",
    "SELF_EXCLUSION_BREACH",
    "DUPLICATE_ACCOUNT",
    "FRAUD_INDICATOR",
    "BLACKLIST_MATCH",
    "CUSTOM_RULE_VIOLATION",
  ] as const;
  const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  const statuses = [
    "OPEN",
    "IN_REVIEW",
    "ESCALATED",
    "RESOLVED",
    "DISMISSED",
  ] as const;

  for (let index = 0; index < count; index += 1) {
    const user = activeUsers.length > 0 ? pick(activeUsers) : null;
    const event = events[index % events.length];
    const status = statuses[index % statuses.length];
    const severity = severities[index % severities.length];

    await prisma.riskAlert.create({
      data: {
        id: randomUUID(),
        alertType: alertTypes[index % alertTypes.length],
        severity,
        status,
        description: `Demo risk alert ${pad(index + 1, 2)} for moderation workflows and review queues.`,
        userId: user?.id ?? null,
        betId: null,
        eventId: event?.eventId ?? null,
        triggeredValue: Number((1000 + rng() * 75000).toFixed(2)),
        threshold: Number((500 + rng() * 50000).toFixed(2)),
        details: {
          source: "demo-seed",
          riskBand: severity.toLowerCase(),
        },
        actionTaken:
          status === "RESOLVED"
            ? "Reviewed and cleared"
            : status === "DISMISSED"
              ? "Dismissed as false positive"
              : "Queued for analyst review",
        resolvedAt:
          status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
        resolvedBy:
          status === "RESOLVED" || status === "DISMISSED" ? "demo-seed" : null,
      },
    });
  }
}

async function seedAdminNotifications(admins: DemoUser[]) {
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        id: randomUUID(),
        userId: admin.id,
        audience: "ADMIN",
        type: "SYSTEM",
        title: "Demo admin overview",
        message:
          "Your demo workspace contains seeded users, events, bets, and moderation items.",
      },
    });
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));

  console.log(`Seeding demo data with seed ${demoSeed}...`);

  if (options.reset) {
    console.log("Removing existing demo records...");
    await cleanupDemoData();
  }

  await seedAdminSettings();

  const { admins, regularUsers, allUsers } = await seedUsers(options);
  const wallets = await seedWallets(allUsers);
  await seedNewsletterSubscriptions(options.newsletterCount);
  const events = await seedEvents(options.eventCount);
  const oddsByEvent = await seedOdds(events);
  await seedTransactionsAndBets(
    allUsers,
    wallets,
    events,
    oddsByEvent,
    options.betCount,
  );
  await seedWithdrawals(allUsers, wallets, options.withdrawalCount);
  await seedContacts(allUsers, options.contactCount);
  await seedBanAppeals(allUsers, admins, options.appealCount);
  await seedRiskAlerts(allUsers, events, options.riskCount);
  await seedAdminNotifications(admins);

  console.log("Demo seed complete.");
  console.log(
    `Admin login: ${admins[0]?.phone || "n/a"} / ${demoAdminPassword}`,
  );
  console.log(
    `User login: ${regularUsers[0]?.phone || "n/a"} / ${demoUserPassword}`,
  );
  console.log(
    `Created ${allUsers.length} users, ${events.length} events, ${options.betCount} bets, and ${options.withdrawalCount} withdrawals.`,
  );
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
