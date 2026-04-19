import { EventStatus, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

function isPrismaKnownRequestError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

function isMissingSportCategoriesTableError(error: unknown) {
  return (
    (isPrismaKnownRequestError(error) && error.code === "P2021") ||
    (error instanceof Error &&
      error.message.toLowerCase().includes("sport_categories"))
  );
}

type SourceDefinition =
  | {
      provider: "odds";
      sportKey: string;
    }
  | {
      provider: "apiSports";
      baseUrl: string;
      path: string;
    };

type CategoryDefinition = {
  sportKey: string;
  displayName: string;
  icon: string;
  sortOrder: number;
  aliases: string[];
  sources: SourceDefinition[];
};

type NormalizedOdd = {
  bookmakerId: string;
  bookmakerName: string;
  marketType: "h2h";
  side: string;
  rawOdds: number;
};

type NormalizedSyncEvent = {
  eventId: string;
  leagueId: string | null;
  leagueName: string | null;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  status: EventStatus;
  homeScore: number | null;
  awayScore: number | null;
  rawData: Prisma.InputJsonValue;
  odds: NormalizedOdd[];
};

export type SportCategoryListItem = {
  id: string;
  sportKey: string;
  displayName: string;
  icon: string;
  isActive: boolean;
  showInNav: boolean;
  sortOrder: number;
  eventCount: number;
  liveEventCount: number;
  upcomingEventCount: number;
  configuredCount: number;
  lastSyncedAt: string | null;
};

export type SportCategoryEventFilter =
  | "all"
  | "live"
  | "upcoming"
  | "configured"
  | "not_configured";

export type SportCategoryEventRow = {
  id: string;
  eventId: string;
  homeTeam: string;
  awayTeam: string;
  leagueName: string | null;
  commenceTime: string;
  status: EventStatus;
  configured: boolean;
  odds: {
    home: number | null;
    draw: number | null;
    away: number | null;
  };
};

const H2H_MARKET = "h2h";
const EVENT_BATCH_SIZE = 250;
const ODDS_BATCH_SIZE = 750;
const API_REGION = "eu";

export const SPORT_CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    sportKey: "soccer",
    displayName: "Football",
    icon: "football",
    sortOrder: 1,
    aliases: [
      "soccer",
      "soccer_epl",
      "soccer_italy_serie_a",
      "soccer_germany_bundesliga",
      "soccer_uefa_champs_league",
      "football",
    ],
    sources: [
      { provider: "odds", sportKey: "soccer_epl" },
      { provider: "odds", sportKey: "soccer_italy_serie_a" },
      { provider: "odds", sportKey: "soccer_germany_bundesliga" },
    ],
  },
  {
    sportKey: "basketball",
    displayName: "Basketball",
    icon: "basketball",
    sortOrder: 2,
    aliases: ["basketball", "basketball_nba"],
    sources: [{ provider: "odds", sportKey: "basketball_nba" }],
  },
  {
    sportKey: "tennis",
    displayName: "Tennis",
    icon: "tennis",
    sortOrder: 3,
    aliases: ["tennis", "tennis_atp"],
    sources: [{ provider: "odds", sportKey: "tennis_atp" }],
  },
  {
    sportKey: "americanfootball",
    displayName: "American Football",
    icon: "shield",
    sortOrder: 4,
    aliases: ["americanfootball", "americanfootball_nfl", "nfl"],
    sources: [{ provider: "odds", sportKey: "americanfootball_nfl" }],
  },
  {
    sportKey: "cricket",
    displayName: "Cricket",
    icon: "cricket",
    sortOrder: 5,
    aliases: ["cricket", "cricket_test_match"],
    sources: [{ provider: "odds", sportKey: "cricket_test_match" }],
  },
  {
    sportKey: "icehockey",
    displayName: "Ice Hockey",
    icon: "hockey",
    sortOrder: 6,
    aliases: ["icehockey", "icehockey_nhl", "hockey"],
    sources: [{ provider: "odds", sportKey: "icehockey_nhl" }],
  },
  {
    sportKey: "rugbyunion",
    displayName: "Rugby Union",
    icon: "rugby",
    sortOrder: 7,
    aliases: ["rugbyunion", "rugbyleague_nrl", "rugby", "nrl"],
    sources: [{ provider: "odds", sportKey: "rugbyleague_nrl" }],
  },
  {
    sportKey: "boxing_mma",
    displayName: "Boxing / MMA",
    icon: "combat",
    sortOrder: 8,
    aliases: ["boxing_mma", "mma_mixed_martial_arts", "mma", "boxing"],
    sources: [{ provider: "odds", sportKey: "mma_mixed_martial_arts" }],
  },
  {
    sportKey: "baseball",
    displayName: "Baseball",
    icon: "baseball",
    sortOrder: 9,
    aliases: ["baseball", "baseball_mlb", "mlb"],
    sources: [{ provider: "odds", sportKey: "baseball_mlb" }],
  },
  {
    sportKey: "volleyball",
    displayName: "Volleyball",
    icon: "volleyball",
    sortOrder: 10,
    aliases: ["volleyball"],
    sources: [
      {
        provider: "apiSports",
        baseUrl: "https://v1.volleyball.api-sports.io",
        path: "/games",
      },
    ],
  },
  {
    sportKey: "tabletennis",
    displayName: "Table Tennis",
    icon: "table-tennis",
    sortOrder: 11,
    aliases: ["tabletennis", "table_tennis"],
    sources: [
      {
        provider: "apiSports",
        baseUrl: "https://v1.table-tennis.api-sports.io",
        path: "/games",
      },
    ],
  },
  {
    sportKey: "golf",
    displayName: "Golf",
    icon: "golf",
    sortOrder: 12,
    aliases: ["golf", "golf_masters_tournament_winners"],
    sources: [{ provider: "odds", sportKey: "golf_masters_tournament_winners" }],
  },
  {
    sportKey: "snooker",
    displayName: "Snooker",
    icon: "snooker",
    sortOrder: 13,
    aliases: ["snooker"],
    sources: [
      {
        provider: "apiSports",
        baseUrl: "https://v1.snooker.api-sports.io",
        path: "/games",
      },
    ],
  },
  {
    sportKey: "darts",
    displayName: "Darts",
    icon: "darts",
    sortOrder: 14,
    aliases: ["darts"],
    sources: [
      {
        provider: "apiSports",
        baseUrl: "https://v1.darts.api-sports.io",
        path: "/games",
      },
    ],
  },
];

function getOddsApiKey() {
  return process.env.ODDS_API_KEY?.trim() ?? "";
}

function getApiSportsKey() {
  return process.env.API_SPORTS_KEY?.trim() ?? "";
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isLiveOrUpcomingWhere(now: Date): Prisma.SportEventWhereInput {
  return {
    OR: [{ status: "LIVE" }, { status: "UPCOMING", commenceTime: { gt: now } }],
  };
}

function getCategoryDefinition(sportKey: string) {
  const category = SPORT_CATEGORY_DEFINITIONS.find(
    (item) => item.sportKey === sportKey,
  );

  if (!category) {
    throw new Error(`Unsupported sport category: ${sportKey}`);
  }

  return category;
}

function mapEventSportKeyToCategory(rawSportKey: string | null | undefined) {
  const value = (rawSportKey ?? "").toLowerCase();

  for (const definition of SPORT_CATEGORY_DEFINITIONS) {
    if (definition.aliases.some((alias) => value.includes(alias.toLowerCase()))) {
      return definition.sportKey;
    }
  }

  return "soccer";
}

function shouldPersistEvent(event: Pick<NormalizedSyncEvent, "commenceTime" | "status">, now: Date) {
  return event.status === "LIVE" || event.commenceTime > now;
}

function normalizeOutcomeSide(
  outcomeName: string,
  event: Pick<NormalizedSyncEvent, "homeTeam" | "awayTeam">,
) {
  const normalized = outcomeName.trim().toLowerCase();
  if (normalized === event.homeTeam.trim().toLowerCase()) {
    return "home";
  }
  if (normalized === event.awayTeam.trim().toLowerCase()) {
    return "away";
  }
  if (normalized === "draw" || normalized === "tie") {
    return "draw";
  }
  return outcomeName.trim();
}

function normalizeOddsApiStatus(
  commenceTime: Date,
  now: Date,
  completed?: boolean,
): EventStatus {
  if (completed) {
    return "FINISHED";
  }

  return commenceTime <= now ? "LIVE" : "UPCOMING";
}

function normalizeApiSportsStatus(statusValue: string, commenceTime: Date, now: Date): EventStatus {
  const normalized = statusValue.trim().toUpperCase();
  if (
    ["1H", "HT", "2H", "3Q", "4Q", "ET", "P", "LIVE", "IN PLAY", "INPLAY"].includes(
      normalized,
    )
  ) {
    return "LIVE";
  }
  if (["FT", "FINISHED", "ENDED", "AET", "PEN"].includes(normalized)) {
    return "FINISHED";
  }
  if (["CANC", "CANCELLED", "ABD", "ABANDONED", "PST", "POSTPONED"].includes(normalized)) {
    return "CANCELLED";
  }
  return commenceTime <= now ? "LIVE" : "UPCOMING";
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

function buildApiSportsDateUrls(source: Extract<SourceDefinition, { provider: "apiSports" }>) {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const format = (value: Date) => value.toISOString().split("T")[0];

  return [
    `${source.baseUrl}${source.path}?live=all`,
    `${source.baseUrl}${source.path}?date=${format(today)}`,
    `${source.baseUrl}${source.path}?date=${format(tomorrow)}`,
  ];
}

async function fetchOddsSource(
  source: Extract<SourceDefinition, { provider: "odds" }>,
  definition: CategoryDefinition,
  now: Date,
) {
  const apiKey = getOddsApiKey();
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const nowIso = now.toISOString();
  const url =
    `https://api.the-odds-api.com/v4/sports/${source.sportKey}/odds` +
    `?apiKey=${encodeURIComponent(apiKey)}` +
    `&regions=${API_REGION}` +
    `&markets=${H2H_MARKET}` +
    `&oddsFormat=decimal` +
    `&commenceTimeFrom=${encodeURIComponent(nowIso)}`;

  const payload = await fetchJson<
    Array<{
      id: string;
      sport_key: string;
      sport_title: string;
      commence_time: string;
      completed?: boolean;
      home_team: string;
      away_team: string;
      scores?: Array<{ name?: string; score?: number | null }>;
      bookmakers?: Array<{
        key: string;
        title: string;
        markets?: Array<{
          key: string;
          outcomes?: Array<{ name: string; price: number }>;
        }>;
      }>;
    }>
  >(url);

  return payload.map((item) => {
    const commenceTime = new Date(item.commence_time);
    const scoreMap = new Map(
      (item.scores ?? [])
        .filter((score) => typeof score.name === "string")
        .map((score) => [String(score.name), score.score ?? null]),
    );

    const odds = (item.bookmakers ?? []).flatMap((bookmaker) =>
      (bookmaker.markets ?? [])
        .filter((market) => market.key === H2H_MARKET)
        .flatMap((market) =>
          (market.outcomes ?? []).map(
            (outcome): NormalizedOdd => ({
              bookmakerId: bookmaker.key,
              bookmakerName: bookmaker.title,
              marketType: H2H_MARKET,
              side: outcome.name,
              rawOdds: outcome.price,
            }),
          ),
        ),
    );

    const normalized: NormalizedSyncEvent = {
      eventId: item.id,
      leagueId: source.sportKey,
      leagueName: item.sport_title ?? definition.displayName,
      sportKey: definition.sportKey,
      homeTeam: item.home_team,
      awayTeam: item.away_team,
      commenceTime,
      status: normalizeOddsApiStatus(commenceTime, now, item.completed),
      homeScore: (scoreMap.get(item.home_team) as number | null | undefined) ?? null,
      awayScore: (scoreMap.get(item.away_team) as number | null | undefined) ?? null,
      rawData: {
        provider: "the-odds-api",
        sourceSportKey: item.sport_key,
        event: item,
      },
      odds,
    };

    return normalized;
  });
}

function normalizeApiSportsTeams(item: Record<string, unknown>) {
  const teams = item.teams as
    | {
        home?: { name?: string };
        away?: { name?: string };
      }
    | undefined;
  const participants = item.participants as
    | Array<{ name?: string; position?: string; type?: string }>
    | undefined;

  const homeTeam =
    teams?.home?.name ??
    participants?.find((entry) =>
      ["home", "1", "player1"].includes(String(entry.position ?? "").toLowerCase()),
    )?.name ??
    participants?.[0]?.name ??
    "Home";
  const awayTeam =
    teams?.away?.name ??
    participants?.find((entry) =>
      ["away", "2", "player2"].includes(String(entry.position ?? "").toLowerCase()),
    )?.name ??
    participants?.[1]?.name ??
    "Away";

  return { homeTeam, awayTeam };
}

function normalizeApiSportsEvent(
  item: Record<string, unknown>,
  definition: CategoryDefinition,
  now: Date,
): NormalizedSyncEvent | null {
  const fixture = (item.fixture ?? item.game ?? item.event ?? item.match ?? item) as
    | Record<string, unknown>
    | undefined;
  const fixtureId =
    fixture?.id ??
    (item as { id?: string | number }).id ??
    (item as { event_id?: string | number }).event_id;
  const dateValue =
    fixture?.date ??
    fixture?.start ??
    fixture?.time ??
    (item as { date?: string }).date;

  if (!fixtureId || !dateValue) {
    return null;
  }

  const commenceTime = new Date(String(dateValue));
  if (Number.isNaN(commenceTime.getTime())) {
    return null;
  }

  const { homeTeam, awayTeam } = normalizeApiSportsTeams(item);
  const league = (item.league ?? item.tournament ?? item.competition) as
    | { id?: string | number; name?: string }
    | undefined;
  const statusShort =
    String(
      (fixture?.status as { short?: string; long?: string } | undefined)?.short ??
        (fixture?.status as { long?: string } | undefined)?.long ??
        (item as { status?: string }).status ??
        "",
    ) || "NS";
  const goals =
    (item.goals as { home?: number | null; away?: number | null } | undefined) ??
    (item.scores as { home?: number | null; away?: number | null } | undefined);

  return {
    eventId: String(fixtureId),
    leagueId: league?.id ? String(league.id) : null,
    leagueName: league?.name ?? definition.displayName,
    sportKey: definition.sportKey,
    homeTeam,
    awayTeam,
    commenceTime,
    status: normalizeApiSportsStatus(statusShort, commenceTime, now),
    homeScore: goals?.home ?? null,
    awayScore: goals?.away ?? null,
    rawData: {
      provider: "api-sports",
      event: item as Prisma.InputJsonValue,
    } as Prisma.InputJsonValue,
    odds: [],
  };
}

async function fetchApiSportsSource(
  source: Extract<SourceDefinition, { provider: "apiSports" }>,
  definition: CategoryDefinition,
  now: Date,
) {
  const apiKey = getApiSportsKey();
  if (!apiKey) {
    throw new Error("API_SPORTS_KEY is not configured");
  }

  const urls = buildApiSportsDateUrls(source);
  const responses = await Promise.allSettled(
    urls.map((url) =>
      fetchJson<{
        response?: unknown[];
        errors?: Record<string, unknown>;
      }>(url, {
        headers: {
          "x-apisports-key": apiKey,
        },
      }),
    ),
  );

  const normalized = responses.flatMap((result) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    if (result.value.errors && Object.keys(result.value.errors).length > 0) {
      return [];
    }

    return (result.value.response ?? [])
      .map((entry) =>
        normalizeApiSportsEvent(entry as Record<string, unknown>, definition, now),
      )
      .filter((entry): entry is NormalizedSyncEvent => Boolean(entry));
  });

  return normalized;
}

async function fetchSportEventsFromProviders(definition: CategoryDefinition, now: Date) {
  const settled = await Promise.allSettled(
    definition.sources.map((source) =>
      source.provider === "odds"
        ? fetchOddsSource(source, definition, now)
        : fetchApiSportsSource(source, definition, now),
    ),
  );

  const errors = settled
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => String(result.reason));
  const events = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  return { events, errors };
}

async function ensureSportCategoriesSeeded() {
  try {
    await prisma.sportCategory.createMany({
      data: SPORT_CATEGORY_DEFINITIONS.map((definition) => ({
        id: randomUUID(),
        sportKey: definition.sportKey,
        displayName: definition.displayName,
        icon: definition.icon,
        isActive: false,
        showInNav: true,
        sortOrder: definition.sortOrder,
        eventCount: 0,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    if (isMissingSportCategoriesTableError(error)) {
      return;
    }
    throw error;
  }
}

async function upsertSportEventsTx(
  tx: Prisma.TransactionClient,
  events: NormalizedSyncEvent[],
) {
  for (const batch of chunkArray(events, EVENT_BATCH_SIZE)) {
    const payload = JSON.stringify(
      batch.map((event) => ({
        event_id: event.eventId,
        league_id: event.leagueId,
        league_name: event.leagueName,
        sport_key: event.sportKey,
        home_team: event.homeTeam,
        away_team: event.awayTeam,
        commence_time: event.commenceTime.toISOString(),
        status: event.status,
        home_score: event.homeScore,
        away_score: event.awayScore,
        raw_data: event.rawData,
        fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    );

    await tx.$executeRawUnsafe(
      `
        INSERT INTO sport_events (
          event_id,
          league_id,
          league_name,
          sport_key,
          home_team,
          away_team,
          commence_time,
          status,
          home_score,
          away_score,
          raw_data,
          is_active,
          house_margin,
          markets_enabled,
          fetched_at,
          updated_at
        )
        SELECT
          payload.event_id,
          NULLIF(payload.league_id, ''),
          NULLIF(payload.league_name, ''),
          payload.sport_key,
          payload.home_team,
          payload.away_team,
          payload.commence_time::timestamp,
          payload.status::"EventStatus",
          payload.home_score,
          payload.away_score,
          payload.raw_data,
          false,
          0,
          ARRAY['h2h']::text[],
          payload.fetched_at::timestamp,
          payload.updated_at::timestamp
        FROM jsonb_to_recordset($1::jsonb) AS payload(
          event_id text,
          league_id text,
          league_name text,
          sport_key text,
          home_team text,
          away_team text,
          commence_time text,
          status text,
          home_score integer,
          away_score integer,
          raw_data jsonb,
          fetched_at text,
          updated_at text
        )
        ON CONFLICT (event_id) DO UPDATE
        SET
          league_id = EXCLUDED.league_id,
          league_name = EXCLUDED.league_name,
          sport_key = EXCLUDED.sport_key,
          home_team = EXCLUDED.home_team,
          away_team = EXCLUDED.away_team,
          commence_time = EXCLUDED.commence_time,
          status = EXCLUDED.status,
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          raw_data = EXCLUDED.raw_data,
          fetched_at = EXCLUDED.fetched_at,
          updated_at = EXCLUDED.updated_at
      `,
      payload,
    );
  }
}

async function replaceOddsForEventsTx(
  tx: Prisma.TransactionClient,
  events: NormalizedSyncEvent[],
) {
  const eventIds = events.map((event) => event.eventId);
  if (!eventIds.length) {
    return;
  }

  const existingMargins = new Map(
    (
      await tx.sportEvent.findMany({
        where: { eventId: { in: eventIds } },
        select: { eventId: true, houseMargin: true },
      })
    ).map((event) => [event.eventId, event.houseMargin]),
  );

  await tx.eventOdds.deleteMany({
    where: { eventId: { in: eventIds } },
  });
  await tx.displayedOdds.deleteMany({
    where: { eventId: { in: eventIds } },
  });

  const eventOddsRows = events.flatMap((event) =>
    event.odds.map((odd) => ({
      eventId: event.eventId,
      bookmakerId: odd.bookmakerId,
      bookmakerName: odd.bookmakerName,
      marketType: odd.marketType,
      side: odd.side,
      decimalOdds: odd.rawOdds,
    })),
  );

  const displayedOddsRows = events.flatMap((event) => {
    const houseMargin = existingMargins.get(event.eventId) ?? 0;
    return event.odds.map((odd) => ({
      eventId: event.eventId,
      bookmakerId: odd.bookmakerId,
      bookmakerName: odd.bookmakerName,
      marketType: odd.marketType,
      side: odd.side,
      rawOdds: odd.rawOdds,
      displayOdds: Number((odd.rawOdds / (1 + houseMargin / 100)).toFixed(3)),
      isVisible: true,
    }));
  });

  for (const batch of chunkArray(eventOddsRows, ODDS_BATCH_SIZE)) {
    if (batch.length === 0) {
      continue;
    }

    await tx.eventOdds.createMany({
      data: batch,
    });
  }

  for (const batch of chunkArray(displayedOddsRows, ODDS_BATCH_SIZE)) {
    if (batch.length === 0) {
      continue;
    }

    await tx.displayedOdds.createMany({
      data: batch,
    });
  }
}

async function buildCategorySnapshotTx(
  tx: Prisma.TransactionClient,
  sportKey: string,
) {
  const category = await tx.sportCategory.findUnique({
    where: { sportKey },
  });

  if (!category) {
    throw new Error(`Sport category ${sportKey} not found`);
  }

  const now = new Date();
  const whereBase: Prisma.SportEventWhereInput = {
    sportKey: { in: getCategoryDefinition(sportKey).aliases },
    ...isLiveOrUpcomingWhere(now),
  };

  const [eventCount, liveEventCount, upcomingEventCount, configuredCount] =
    await Promise.all([
      tx.sportEvent.count({ where: whereBase }),
      tx.sportEvent.count({
        where: {
          sportKey: { in: getCategoryDefinition(sportKey).aliases },
          status: "LIVE",
        },
      }),
      tx.sportEvent.count({
        where: {
          sportKey: { in: getCategoryDefinition(sportKey).aliases },
          status: "UPCOMING",
          commenceTime: { gt: now },
        },
      }),
      tx.sportEvent.count({
        where: {
          sportKey: { in: getCategoryDefinition(sportKey).aliases },
          isActive: true,
          ...isLiveOrUpcomingWhere(now),
        },
      }),
    ]);

  return {
    id: category.id,
    sportKey: category.sportKey,
    displayName: category.displayName,
    icon: category.icon,
    isActive: category.isActive,
    showInNav: category.showInNav,
    sortOrder: category.sortOrder,
    eventCount,
    liveEventCount,
    upcomingEventCount,
    configuredCount,
    lastSyncedAt: category.lastSyncedAt?.toISOString() ?? null,
  } satisfies SportCategoryListItem;
}

async function updateCategoryCountsTx(
  tx: Prisma.TransactionClient,
  sportKey: string,
  options?: {
    lastSyncedAt?: Date;
    isActive?: boolean;
    configuredBy?: string | null;
  },
) {
  const now = new Date();
  const aliases = getCategoryDefinition(sportKey).aliases;

  const eventCount = await tx.sportEvent.count({
    where: {
      sportKey: { in: aliases },
      ...isLiveOrUpcomingWhere(now),
    },
  });

  await tx.sportCategory.update({
    where: { sportKey },
    data: {
      eventCount,
      ...(options?.lastSyncedAt ? { lastSyncedAt: options.lastSyncedAt } : {}),
      ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      ...(options?.configuredBy !== undefined
        ? { configuredBy: options.configuredBy }
        : {}),
    },
  });
}

export async function listSportCategories() {
  await ensureSportCategoriesSeeded();

  let categories;
  try {
    categories = await prisma.sportCategory.findMany({
      orderBy: [{ sortOrder: "asc" }],
    });
  } catch (error) {
    if (isMissingSportCategoriesTableError(error)) {
      return SPORT_CATEGORY_DEFINITIONS.map((definition) => ({
        id: definition.sportKey,
        sportKey: definition.sportKey,
        displayName: definition.displayName,
        icon: definition.icon,
        isActive: false,
        showInNav: true,
        sortOrder: definition.sortOrder,
        eventCount: 0,
        liveEventCount: 0,
        upcomingEventCount: 0,
        configuredCount: 0,
        lastSyncedAt: null,
      } satisfies SportCategoryListItem));
    }
    throw error;
  }
  const now = new Date();

  const grouped = await prisma.sportEvent.groupBy({
    by: ["sportKey", "status", "isActive"],
    where: {
      ...isLiveOrUpcomingWhere(now),
    },
    _count: { id: true },
  });

  const aggregate = new Map<
    string,
    { eventCount: number; liveEventCount: number; upcomingEventCount: number; configuredCount: number }
  >();

  for (const row of grouped) {
    const categoryKey = mapEventSportKeyToCategory(row.sportKey);
    const entry =
      aggregate.get(categoryKey) ?? {
        eventCount: 0,
        liveEventCount: 0,
        upcomingEventCount: 0,
        configuredCount: 0,
      };

    entry.eventCount += row._count.id;
    if (row.status === "LIVE") {
      entry.liveEventCount += row._count.id;
    }
    if (row.status === "UPCOMING") {
      entry.upcomingEventCount += row._count.id;
    }
    if (row.isActive) {
      entry.configuredCount += row._count.id;
    }

    aggregate.set(categoryKey, entry);
  }

  return categories.map((category) => {
    const stats =
      aggregate.get(category.sportKey) ?? {
        eventCount: 0,
        liveEventCount: 0,
        upcomingEventCount: 0,
        configuredCount: 0,
      };

    return {
      id: category.id,
      sportKey: category.sportKey,
      displayName: category.displayName,
      icon: category.icon,
      isActive: category.isActive,
      showInNav: category.showInNav,
      sortOrder: category.sortOrder,
      eventCount: stats.eventCount,
      liveEventCount: stats.liveEventCount,
      upcomingEventCount: stats.upcomingEventCount,
      configuredCount: stats.configuredCount,
      lastSyncedAt: category.lastSyncedAt?.toISOString() ?? null,
    } satisfies SportCategoryListItem;
  });
}

export async function syncSportCategory(sportKey: string) {
  await ensureSportCategoriesSeeded();

  const definition = getCategoryDefinition(sportKey);
  const now = new Date();
  const { events, errors } = await fetchSportEventsFromProviders(definition, now);

  const deduped = Array.from(
    new Map(
      events
        .filter((event) => shouldPersistEvent(event, now))
        .map((event) => [event.eventId, event]),
    ).values(),
  );

  const category = await prisma.$transaction(async (tx) => {
    await upsertSportEventsTx(tx, deduped);
    await replaceOddsForEventsTx(tx, deduped);
    await updateCategoryCountsTx(tx, sportKey, { lastSyncedAt: now });
    return buildCategorySnapshotTx(tx, sportKey);
  });

  return {
    sportKey,
    displayName: definition.displayName,
    syncedCount: deduped.length,
    errorCount: errors.length,
    errors,
    category,
  };
}

export async function syncAllSportCategories() {
  const results = [];
  for (const definition of SPORT_CATEGORY_DEFINITIONS) {
    results.push(await syncSportCategory(definition.sportKey));
  }

  return results;
}

function buildEventFilterWhere(
  sportKey: string,
  filter: SportCategoryEventFilter,
): Prisma.SportEventWhereInput {
  const now = new Date();
  const baseWhere: Prisma.SportEventWhereInput = {
    sportKey: { in: getCategoryDefinition(sportKey).aliases },
    ...isLiveOrUpcomingWhere(now),
  };

  if (filter === "live") {
    return {
      sportKey: { in: getCategoryDefinition(sportKey).aliases },
      status: "LIVE",
    };
  }

  if (filter === "upcoming") {
    return {
      sportKey: { in: getCategoryDefinition(sportKey).aliases },
      status: "UPCOMING",
      commenceTime: { gt: now },
    };
  }

  if (filter === "configured") {
    return {
      ...baseWhere,
      isActive: true,
    };
  }

  if (filter === "not_configured") {
    return {
      ...baseWhere,
      isActive: false,
    };
  }

  return baseWhere;
}

export async function listSportCategoryEvents(
  sportKey: string,
  filter: SportCategoryEventFilter,
) {
  const rows = await prisma.sportEvent.findMany({
    where: buildEventFilterWhere(sportKey, filter),
    select: {
      id: true,
      eventId: true,
      homeTeam: true,
      awayTeam: true,
      leagueName: true,
      commenceTime: true,
      status: true,
      isActive: true,
      displayedOdds: {
        where: {
          marketType: H2H_MARKET,
          isVisible: true,
        },
        select: {
          bookmakerId: true,
          bookmakerName: true,
          side: true,
          displayOdds: true,
        },
        orderBy: [{ bookmakerName: "asc" }, { side: "asc" }],
      },
    },
    orderBy: [{ status: "asc" }, { commenceTime: "asc" }],
  });

  return rows.map((row) => {
    const firstBookmakerId = row.displayedOdds[0]?.bookmakerId ?? null;
    const selectedOdds = firstBookmakerId
      ? row.displayedOdds.filter((odd) => odd.bookmakerId === firstBookmakerId)
      : row.displayedOdds;
    const normalizedSides = new Map(
      selectedOdds.map((odd) => [
        normalizeOutcomeSide(odd.side, row),
        odd.displayOdds,
      ]),
    );

    return {
      id: row.id,
      eventId: row.eventId,
      homeTeam: row.homeTeam,
      awayTeam: row.awayTeam,
      leagueName: row.leagueName,
      commenceTime: row.commenceTime.toISOString(),
      status: row.status,
      configured: row.isActive,
      odds: {
        home: normalizedSides.get("home") ?? null,
        draw: normalizedSides.get("draw") ?? null,
        away: normalizedSides.get("away") ?? null,
      },
    } satisfies SportCategoryEventRow;
  });
}

export async function configureSportCategoryEvents(params: {
  sportKey: string;
  adminId: string;
  eventIds?: string[];
}) {
  await ensureSportCategoriesSeeded();

  const uniqueEventIds = Array.from(new Set(params.eventIds ?? []));
  const now = new Date();
  const where: Prisma.SportEventWhereInput = {
    sportKey: { in: getCategoryDefinition(params.sportKey).aliases },
    ...isLiveOrUpcomingWhere(now),
    ...(uniqueEventIds.length > 0 ? { eventId: { in: uniqueEventIds } } : {}),
  };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.sportEvent.updateMany({
      where,
      data: { isActive: true },
    });

    await tx.sportCategory.update({
      where: { sportKey: params.sportKey },
      data: {
        isActive: true,
        configuredBy: params.adminId,
      },
    });

    await tx.categoryConfigLog.create({
      data: {
        sportKey: params.sportKey,
        adminId: params.adminId,
        eventsConfigured: updated.count,
        action:
          uniqueEventIds.length > 0 ? "configure_selected_events" : "configure_all_events",
      },
    });

    await updateCategoryCountsTx(tx, params.sportKey, {
      isActive: true,
      configuredBy: params.adminId,
    });

    return {
      updatedCount: updated.count,
      category: await buildCategorySnapshotTx(tx, params.sportKey),
    };
  });
}

export async function configureSelectedSportCategories(params: {
  sportKeys: string[];
  adminId: string;
}) {
  await ensureSportCategoriesSeeded();

  const uniqueSportKeys = Array.from(new Set(params.sportKeys)).filter(Boolean);
  if (!uniqueSportKeys.length) {
    return { updatedCount: 0, categories: [] as SportCategoryListItem[] };
  }

  const aliases = Array.from(
    new Set(
      uniqueSportKeys.flatMap((sportKey) => getCategoryDefinition(sportKey).aliases),
    ),
  );
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.sportEvent.updateMany({
      where: {
        sportKey: { in: aliases },
        ...isLiveOrUpcomingWhere(now),
      },
      data: { isActive: true },
    });

    await tx.sportCategory.updateMany({
      where: { sportKey: { in: uniqueSportKeys } },
      data: {
        isActive: true,
        configuredBy: params.adminId,
      },
    });

    await tx.categoryConfigLog.createMany({
      data: uniqueSportKeys.map((sportKey) => ({
        id: randomUUID(),
        sportKey,
        adminId: params.adminId,
        eventsConfigured: 0,
        action: "configure_selected_categories",
      })),
    });

    for (const sportKey of uniqueSportKeys) {
      await updateCategoryCountsTx(tx, sportKey, {
        isActive: true,
        configuredBy: params.adminId,
      });
    }

    const categories = [];
    for (const sportKey of uniqueSportKeys) {
      categories.push(await buildCategorySnapshotTx(tx, sportKey));
    }

    return {
      updatedCount: updated.count,
      categories,
    };
  });
}

export async function expirePastSportEvents() {
  const now = new Date();

  return prisma.sportEvent.updateMany({
    where: {
      commenceTime: { lt: now },
      status: { notIn: ["LIVE", "FINISHED"] },
    },
    data: {
      status: "FINISHED",
    },
  });
}
