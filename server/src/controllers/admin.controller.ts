import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  adminSettingsSchema,
  type AdminSettingsConfig,
  defaultAdminSettings,
} from "../lib/adminSettingsConfig";

const RECENT_ACTIVITY_LIMIT = 8;
const TREND_DAYS = 7;

function formatMoney(value: number) {
  return `KES ${value.toLocaleString()}`;
}

function toAdminStatus(status: string) {
  return status.toLowerCase() as
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "reversed";
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

const adminSettingsSelect = {
  key: true,
  platformName: true,
  environment: true,
  defaultCurrency: true,
  timezone: true,
  maintenanceMode: true,
  registrationEnabled: true,
  minDeposit: true,
  maxDeposit: true,
  minWithdrawal: true,
  maxWithdrawal: true,
  dailyTransactionLimit: true,
  maxActiveBetsPerUser: true,
  defaultUserRole: true,
  kycRequired: true,
  kycRequireId: true,
  kycRequirePhone: true,
  kycRequireEmail: true,
  withdrawalRequiresKyc: true,
  minimumAge: true,
  allowedCountries: true,
  paymentMpesaEnabled: true,
  paymentBankTransferEnabled: true,
  mpesaShortcode: true,
  mpesaConsumerKey: true,
  mpesaConsumerSecret: true,
  mpesaPasskey: true,
  mpesaCallbackUrl: true,
  mpesaTransactionFeePercent: true,
  mpesaAutoWithdrawEnabled: true,
  mpesaWithdrawalApprovalThreshold: true,
  minBetAmount: true,
  maxBetAmount: true,
  maxWinPerBet: true,
  oddsMarginPercent: true,
  betDelayMs: true,
  cashoutEnabled: true,
  cashoutMarginPercent: true,
  allowLiveBetting: true,
  maxExposurePerEvent: true,
  maxExposurePerMarket: true,
  maxPayoutPerDay: true,
  highRiskBetThreshold: true,
  autoBlockSuspiciousUsers: true,
  welcomeBonusEnabled: true,
  bonusMode: true,
  bonusAmount: true,
  bonusPercent: true,
  wageringRequirementMultiplier: true,
  bonusExpiryHours: true,
  maxBonusPerUser: true,
  cashbackRule: true,
  smsEnabled: true,
  emailEnabled: true,
  notifyDepositSuccess: true,
  notifyWithdrawalSuccess: true,
  notifyBetPlaced: true,
  notifyBetResult: true,
  notifyAdminAlerts: true,
  adminWithdrawalSoundEnabled: true,
  adminWithdrawalSoundTone: true,
  adminWithdrawalSoundVolume: true,
  sportsApiKey: true,
  oddsProviderName: true,
  primaryWebhookUrl: true,
  fallbackWebhookUrl: true,
  retryAttempts: true,
  retryBackoffMs: true,
  requestsPerMinute: true,
  adminTwoFactorRequired: true,
  passwordMinLength: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  sessionTimeoutMinutes: true,
  maxLoginAttempts: true,
  ipWhitelist: true,
  ipBlacklist: true,
  winningsTaxPercent: true,
  depositTaxPercent: true,
  commissionPercent: true,
  roundingRule: true,
  affiliateCommissionPercent: true,
  multiLevelReferralsEnabled: true,
  affiliateMinimumPayoutThreshold: true,
  affiliateWithdrawalRule: true,
  termsAndConditions: true,
  privacyPolicy: true,
  responsibleGamblingMessage: true,
  supportContactInfo: true,
  updatedBy: true,
  createdAt: true,
  updatedAt: true,
} as const;

type AdminSettingsRecord = Prisma.AdminSettingsGetPayload<{
  select: typeof adminSettingsSelect;
}>;

function toDbSettingsData(config: AdminSettingsConfig, updatedBy: string) {
  return {
    platformName: config.generalSystemConfig.platformName,
    environment: config.generalSystemConfig.environment,
    defaultCurrency: config.generalSystemConfig.defaultCurrency,
    timezone: config.generalSystemConfig.timezone,
    maintenanceMode: config.generalSystemConfig.maintenanceMode,
    registrationEnabled: config.generalSystemConfig.registrationEnabled,
    minDeposit: config.userDefaultsAndRestrictions.minDeposit,
    maxDeposit: config.userDefaultsAndRestrictions.maxDeposit,
    minWithdrawal: config.userDefaultsAndRestrictions.minWithdrawal,
    maxWithdrawal: config.userDefaultsAndRestrictions.maxWithdrawal,
    dailyTransactionLimit:
      config.userDefaultsAndRestrictions.dailyTransactionLimit,
    maxActiveBetsPerUser:
      config.userDefaultsAndRestrictions.maxActiveBetsPerUser,
    defaultUserRole: config.userDefaultsAndRestrictions.defaultUserRole,
    kycRequired: config.kycAndComplianceConfig.kycRequired,
    kycRequireId: config.kycAndComplianceConfig.requiredFields.id,
    kycRequirePhone: config.kycAndComplianceConfig.requiredFields.phone,
    kycRequireEmail: config.kycAndComplianceConfig.requiredFields.email,
    withdrawalRequiresKyc: config.kycAndComplianceConfig.withdrawalRequiresKyc,
    minimumAge: config.kycAndComplianceConfig.minimumAge,
    allowedCountries: config.kycAndComplianceConfig.allowedCountries,
    paymentMpesaEnabled: config.paymentsConfig.methods.mpesa,
    paymentBankTransferEnabled: config.paymentsConfig.methods.bankTransfer,
    mpesaShortcode: config.paymentsConfig.mpesa.shortcode,
    mpesaConsumerKey: config.paymentsConfig.mpesa.consumerKey,
    mpesaConsumerSecret: config.paymentsConfig.mpesa.consumerSecret,
    mpesaPasskey: config.paymentsConfig.mpesa.passkey,
    mpesaCallbackUrl: config.paymentsConfig.mpesa.callbackUrl,
    mpesaTransactionFeePercent:
      config.paymentsConfig.mpesa.transactionFeePercent,
    mpesaAutoWithdrawEnabled: config.paymentsConfig.mpesa.autoWithdrawEnabled,
    mpesaWithdrawalApprovalThreshold:
      config.paymentsConfig.mpesa.withdrawalApprovalThreshold,
    minBetAmount: config.bettingEngineConfig.minBetAmount,
    maxBetAmount: config.bettingEngineConfig.maxBetAmount,
    maxWinPerBet: config.bettingEngineConfig.maxWinPerBet,
    oddsMarginPercent: config.bettingEngineConfig.oddsMarginPercent,
    betDelayMs: config.bettingEngineConfig.betDelayMs,
    cashoutEnabled: config.bettingEngineConfig.cashoutEnabled,
    cashoutMarginPercent: config.bettingEngineConfig.cashoutMarginPercent,
    allowLiveBetting: config.bettingEngineConfig.allowLiveBetting,
    maxExposurePerEvent: config.riskManagementConfig.maxExposurePerEvent,
    maxExposurePerMarket: config.riskManagementConfig.maxExposurePerMarket,
    maxPayoutPerDay: config.riskManagementConfig.maxPayoutPerDay,
    highRiskBetThreshold: config.riskManagementConfig.highRiskBetThreshold,
    autoBlockSuspiciousUsers:
      config.riskManagementConfig.autoBlockSuspiciousUsers,
    welcomeBonusEnabled: config.bonusesAndPromotionsConfig.welcomeBonusEnabled,
    bonusMode: config.bonusesAndPromotionsConfig.bonusMode,
    bonusAmount: config.bonusesAndPromotionsConfig.bonusAmount,
    bonusPercent: config.bonusesAndPromotionsConfig.bonusPercent,
    wageringRequirementMultiplier:
      config.bonusesAndPromotionsConfig.wageringRequirementMultiplier,
    bonusExpiryHours: config.bonusesAndPromotionsConfig.bonusExpiryHours,
    maxBonusPerUser: config.bonusesAndPromotionsConfig.maxBonusPerUser,
    cashbackRule: config.bonusesAndPromotionsConfig.cashbackRule,
    smsEnabled: config.notificationsConfig.smsEnabled,
    emailEnabled: config.notificationsConfig.emailEnabled,
    notifyDepositSuccess: config.notificationsConfig.events.depositSuccess,
    notifyWithdrawalSuccess:
      config.notificationsConfig.events.withdrawalSuccess,
    notifyBetPlaced: config.notificationsConfig.events.betPlaced,
    notifyBetResult: config.notificationsConfig.events.betResult,
    notifyAdminAlerts: config.notificationsConfig.events.adminAlerts,
    adminWithdrawalSoundEnabled:
      config.adminQuickSettings.withdrawalSoundEnabled,
    adminWithdrawalSoundTone: config.adminQuickSettings.withdrawalSoundTone,
    adminWithdrawalSoundVolume: config.adminQuickSettings.withdrawalSoundVolume,
    sportsApiKey: config.apiAndIntegrationsConfig.sportsApiKey,
    oddsProviderName: config.apiAndIntegrationsConfig.oddsProviderName,
    primaryWebhookUrl: config.apiAndIntegrationsConfig.primaryWebhookUrl,
    fallbackWebhookUrl: config.apiAndIntegrationsConfig.fallbackWebhookUrl,
    retryAttempts: config.apiAndIntegrationsConfig.retryAttempts,
    retryBackoffMs: config.apiAndIntegrationsConfig.retryBackoffMs,
    requestsPerMinute: config.apiAndIntegrationsConfig.requestsPerMinute,
    adminTwoFactorRequired: config.securityConfig.adminTwoFactorRequired,
    passwordMinLength: config.securityConfig.passwordMinLength,
    requireUppercase: config.securityConfig.requireUppercase,
    requireNumber: config.securityConfig.requireNumber,
    requireSpecialChar: config.securityConfig.requireSpecialChar,
    sessionTimeoutMinutes: config.securityConfig.sessionTimeoutMinutes,
    maxLoginAttempts: config.securityConfig.maxLoginAttempts,
    ipWhitelist: config.securityConfig.ipWhitelist,
    ipBlacklist: config.securityConfig.ipBlacklist,
    winningsTaxPercent: config.taxAndFinancialRules.winningsTaxPercent,
    depositTaxPercent: config.taxAndFinancialRules.depositTaxPercent,
    commissionPercent: config.taxAndFinancialRules.commissionPercent,
    roundingRule: config.taxAndFinancialRules.roundingRule,
    affiliateCommissionPercent:
      config.affiliateAndAgentConfig.commissionPercent,
    multiLevelReferralsEnabled:
      config.affiliateAndAgentConfig.multiLevelReferralsEnabled,
    affiliateMinimumPayoutThreshold:
      config.affiliateAndAgentConfig.minimumPayoutThreshold,
    affiliateWithdrawalRule: config.affiliateAndAgentConfig.withdrawalRule,
    termsAndConditions: config.contentAndLegal.termsAndConditions,
    privacyPolicy: config.contentAndLegal.privacyPolicy,
    responsibleGamblingMessage:
      config.contentAndLegal.responsibleGamblingMessage,
    supportContactInfo: config.contentAndLegal.supportContactInfo,
    updatedBy,
  };
}

function toConfig(record: AdminSettingsRecord): AdminSettingsConfig {
  return {
    generalSystemConfig: {
      platformName: record.platformName,
      environment: record.environment as "sandbox" | "live",
      defaultCurrency: record.defaultCurrency,
      timezone: record.timezone,
      maintenanceMode: record.maintenanceMode,
      registrationEnabled: record.registrationEnabled,
    },
    userDefaultsAndRestrictions: {
      minDeposit: record.minDeposit,
      maxDeposit: record.maxDeposit,
      minWithdrawal: record.minWithdrawal,
      maxWithdrawal: record.maxWithdrawal,
      dailyTransactionLimit: record.dailyTransactionLimit,
      maxActiveBetsPerUser: record.maxActiveBetsPerUser,
      defaultUserRole: "USER",
    },
    kycAndComplianceConfig: {
      kycRequired: record.kycRequired,
      requiredFields: {
        id: record.kycRequireId,
        phone: record.kycRequirePhone,
        email: record.kycRequireEmail,
      },
      withdrawalRequiresKyc: record.withdrawalRequiresKyc,
      minimumAge: record.minimumAge,
      allowedCountries: record.allowedCountries,
    },
    paymentsConfig: {
      methods: {
        mpesa: record.paymentMpesaEnabled,
        bankTransfer: record.paymentBankTransferEnabled,
      },
      mpesa: {
        shortcode: record.mpesaShortcode,
        consumerKey: record.mpesaConsumerKey,
        consumerSecret: record.mpesaConsumerSecret,
        passkey: record.mpesaPasskey,
        callbackUrl: record.mpesaCallbackUrl,
        transactionFeePercent: record.mpesaTransactionFeePercent,
        autoWithdrawEnabled: record.mpesaAutoWithdrawEnabled,
        withdrawalApprovalThreshold: record.mpesaWithdrawalApprovalThreshold,
      },
    },
    bettingEngineConfig: {
      minBetAmount: record.minBetAmount,
      maxBetAmount: record.maxBetAmount,
      maxWinPerBet: record.maxWinPerBet,
      oddsMarginPercent: record.oddsMarginPercent,
      betDelayMs: record.betDelayMs,
      cashoutEnabled: record.cashoutEnabled,
      cashoutMarginPercent: record.cashoutMarginPercent,
      allowLiveBetting: record.allowLiveBetting,
    },
    riskManagementConfig: {
      maxExposurePerEvent: record.maxExposurePerEvent,
      maxExposurePerMarket: record.maxExposurePerMarket,
      maxPayoutPerDay: record.maxPayoutPerDay,
      highRiskBetThreshold: record.highRiskBetThreshold,
      autoBlockSuspiciousUsers: record.autoBlockSuspiciousUsers,
    },
    bonusesAndPromotionsConfig: {
      welcomeBonusEnabled: record.welcomeBonusEnabled,
      bonusMode: record.bonusMode as "fixed_amount" | "percentage",
      bonusAmount: record.bonusAmount,
      bonusPercent: record.bonusPercent,
      wageringRequirementMultiplier: record.wageringRequirementMultiplier,
      bonusExpiryHours: record.bonusExpiryHours,
      maxBonusPerUser: record.maxBonusPerUser,
      cashbackRule: record.cashbackRule,
    },
    notificationsConfig: {
      smsEnabled: record.smsEnabled,
      emailEnabled: record.emailEnabled,
      events: {
        depositSuccess: record.notifyDepositSuccess,
        withdrawalSuccess: record.notifyWithdrawalSuccess,
        betPlaced: record.notifyBetPlaced,
        betResult: record.notifyBetResult,
        adminAlerts: record.notifyAdminAlerts,
      },
    },
    adminQuickSettings: {
      withdrawalSoundEnabled: record.adminWithdrawalSoundEnabled,
      withdrawalSoundTone: record.adminWithdrawalSoundTone,
      withdrawalSoundVolume: record.adminWithdrawalSoundVolume,
    },
    apiAndIntegrationsConfig: {
      sportsApiKey: record.sportsApiKey,
      oddsProviderName: record.oddsProviderName,
      primaryWebhookUrl: record.primaryWebhookUrl,
      fallbackWebhookUrl: record.fallbackWebhookUrl,
      retryAttempts: record.retryAttempts,
      retryBackoffMs: record.retryBackoffMs,
      requestsPerMinute: record.requestsPerMinute,
    },
    securityConfig: {
      adminTwoFactorRequired: record.adminTwoFactorRequired,
      passwordMinLength: record.passwordMinLength,
      requireUppercase: record.requireUppercase,
      requireNumber: record.requireNumber,
      requireSpecialChar: record.requireSpecialChar,
      sessionTimeoutMinutes: record.sessionTimeoutMinutes,
      maxLoginAttempts: record.maxLoginAttempts,
      ipWhitelist: record.ipWhitelist,
      ipBlacklist: record.ipBlacklist,
    },
    taxAndFinancialRules: {
      winningsTaxPercent: record.winningsTaxPercent,
      depositTaxPercent: record.depositTaxPercent,
      commissionPercent: record.commissionPercent,
      roundingRule: record.roundingRule as
        | "nearest_1"
        | "nearest_5"
        | "nearest_10"
        | "floor"
        | "ceil",
    },
    affiliateAndAgentConfig: {
      commissionPercent: record.affiliateCommissionPercent,
      multiLevelReferralsEnabled: record.multiLevelReferralsEnabled,
      minimumPayoutThreshold: record.affiliateMinimumPayoutThreshold,
      withdrawalRule: record.affiliateWithdrawalRule,
    },
    contentAndLegal: {
      termsAndConditions: record.termsAndConditions,
      privacyPolicy: record.privacyPolicy,
      responsibleGamblingMessage: record.responsibleGamblingMessage,
      supportContactInfo: record.supportContactInfo,
    },
  };
}

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional().nullable(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(9).max(20).optional(),
  isVerified: z.boolean().optional(),
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional().nullable(),
  email: z.string().trim().email(),
  phone: z.string().trim(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  isVerified: z.boolean().optional(),
  accountStatus: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

const bettingAnalyticsTimeframeSchema = z.enum(["1w", "1m", "6m", "1y", "all"]);
const bettingAnalyticsGroupBySchema = z.enum(["week", "month", "year"]);

type BettingAnalyticsTimeframe = z.infer<
  typeof bettingAnalyticsTimeframeSchema
>;
type BettingAnalyticsGroupBy = z.infer<typeof bettingAnalyticsGroupBySchema>;

function normalizeKenyanPhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }

  if (digits.startsWith("254") && digits.length === 12) {
    return `+${digits}`;
  }

  if (
    (digits.startsWith("7") || digits.startsWith("1")) &&
    digits.length === 9
  ) {
    return `+254${digits}`;
  }

  return null;
}

function resolveBettingAnalyticsWindow(timeframe: BettingAnalyticsTimeframe) {
  const end = new Date();
  const start = new Date(end);
  let defaultGroupBy: BettingAnalyticsGroupBy = "month";

  if (timeframe === "1w") {
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    defaultGroupBy = "week";
    return { start, end, defaultGroupBy };
  }

  if (timeframe === "1m") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    defaultGroupBy = "month";
    return { start, end, defaultGroupBy };
  }

  if (timeframe === "6m") {
    start.setMonth(start.getMonth() - 5, 1);
    start.setHours(0, 0, 0, 0);
    defaultGroupBy = "month";
    return { start, end, defaultGroupBy };
  }

  if (timeframe === "1y") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    defaultGroupBy = "month";
    return { start, end, defaultGroupBy };
  }

  defaultGroupBy = "month";
  start.setFullYear(start.getFullYear() - 2, 0, 1);
  start.setHours(0, 0, 0, 0);
  return { start, end, defaultGroupBy };
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function getBucketStart(date: Date, groupBy: BettingAnalyticsGroupBy) {
  if (groupBy === "week") {
    return startOfWeek(date);
  }

  if (groupBy === "month") {
    const next = new Date(date);
    next.setDate(1);
    return startOfDay(next);
  }

  const next = new Date(date);
  next.setMonth(0, 1);
  return startOfDay(next);
}

function incrementBucket(date: Date, groupBy: BettingAnalyticsGroupBy) {
  if (groupBy === "week") {
    date.setDate(date.getDate() + 7);
    return;
  }

  if (groupBy === "month") {
    date.setMonth(date.getMonth() + 1, 1);
    return;
  }

  date.setFullYear(date.getFullYear() + 1, 0, 1);
}

function formatBucketLabel(date: Date, groupBy: BettingAnalyticsGroupBy) {
  if (groupBy === "week") {
    return `Wk ${date.toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
    })}`;
  }

  if (groupBy === "month") {
    return date.toLocaleDateString("en-KE", {
      month: "short",
      year: "numeric",
    });
  }

  return date.toLocaleDateString("en-KE", {
    year: "numeric",
  });
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

export async function getAdminDashboardSummary(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const trendStart = startOfDay(new Date(todayStart));
  trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));

  const yesterdayStart = startOfDay(new Date(todayStart));
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const sevenDaysAgoStart = startOfDay(new Date(todayStart));
  sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);

  const [
    userCount,
    walletBalanceAggregate,
    pendingWithdrawals,
    completedWithdrawals,
    failedWithdrawals,
    todayDeposits,
    todayWithdrawals,
    yesterdayDeposits,
    yesterdayWithdrawals,
    sevenDayDeposits,
    sevenDayWithdrawals,
    activeUsersToday,
    activeUsersLast7Days,
    pendingWithdrawalAmount,
    averageDepositToday,
    averageWithdrawalToday,
    trendTransactions,
    recentTransactions,
    activeRiskAlerts,
    activeBets,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.wallet.aggregate({
      _sum: { balance: true },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "PENDING" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "COMPLETED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "FAILED" },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: sevenDaysAgoStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: sevenDaysAgoStart },
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.walletTransaction.findMany({
      where: { createdAt: { gte: sevenDaysAgoStart } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "DEPOSIT",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _avg: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "WITHDRAWAL",
        status: "COMPLETED",
        createdAt: { gte: todayStart },
      },
      _avg: { amount: true },
    }),
    prisma.walletTransaction.findMany({
      where: {
        status: "COMPLETED",
        type: { in: ["DEPOSIT", "WITHDRAWAL"] },
        createdAt: { gte: trendStart },
      },
      select: {
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.walletTransaction.findMany({
      where: {
        type: { in: ["DEPOSIT", "WITHDRAWAL"] },
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_ACTIVITY_LIMIT,
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    }),
    prisma.riskAlert.count({
      where: {
        status: { in: ["OPEN", "IN_REVIEW", "ESCALATED"] },
      },
    }),
    prisma.bet.count({
      where: {
        status: "PENDING",
      },
    }),
  ]);

  const trendByDate = new Map<
    string,
    {
      period: string;
      deposits: number;
      withdrawals: number;
    }
  >();

  for (let offset = 0; offset < TREND_DAYS; offset += 1) {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + offset);
    const key = formatDateKey(date);

    trendByDate.set(key, {
      period: date.toLocaleDateString("en-KE", { weekday: "short" }),
      deposits: 0,
      withdrawals: 0,
    });
  }

  for (const transaction of trendTransactions) {
    const key = formatDateKey(transaction.createdAt);
    const row = trendByDate.get(key);

    if (!row) {
      continue;
    }

    if (transaction.type === "DEPOSIT") {
      row.deposits += transaction.amount;
    }

    if (transaction.type === "WITHDRAWAL") {
      row.withdrawals += transaction.amount;
    }
  }

  const todayDepositTotal = todayDeposits._sum.amount ?? 0;
  const todayWithdrawalTotal = todayWithdrawals._sum.amount ?? 0;
  const yesterdayDepositTotal = yesterdayDeposits._sum.amount ?? 0;
  const yesterdayWithdrawalTotal = yesterdayWithdrawals._sum.amount ?? 0;
  const netFlowToday = todayDepositTotal - todayWithdrawalTotal;
  const netFlowYesterday = yesterdayDepositTotal - yesterdayWithdrawalTotal;
  const flowChange =
    netFlowYesterday === 0
      ? netFlowToday === 0
        ? 0
        : 100
      : ((netFlowToday - netFlowYesterday) / Math.abs(netFlowYesterday)) * 100;

  const sevenDayDepositTotal = sevenDayDeposits._sum.amount ?? 0;
  const sevenDayWithdrawalTotal = sevenDayWithdrawals._sum.amount ?? 0;

  const averageDeposit = Math.round(averageDepositToday._avg.amount ?? 0);
  const averageWithdrawal = Math.round(averageWithdrawalToday._avg.amount ?? 0);

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Total Users",
        value: userCount.toLocaleString(),
        tone: "blue" as const,
        helper: `${activeUsersLast7Days.length.toLocaleString()} active in last 7 days`,
      },
      {
        label: "Platform Float",
        value: formatMoney(walletBalanceAggregate._sum.balance ?? 0),
        tone: "accent" as const,
        helper: `${activeUsersToday.length.toLocaleString()} active users today`,
      },
      {
        label: "Pending Withdrawals",
        value: pendingWithdrawals.toLocaleString(),
        tone: "gold" as const,
        helper: formatMoney(pendingWithdrawalAmount._sum.amount ?? 0),
      },
      {
        label: "Net Flow Today",
        value: formatMoney(netFlowToday),
        tone: netFlowToday >= 0 ? ("accent" as const) : ("red" as const),
        helper: `${flowChange >= 0 ? "+" : ""}${flowChange.toFixed(1)}% vs yesterday`,
      },
      {
        label: "Completed Withdrawals",
        value: completedWithdrawals.toLocaleString(),
        tone: "accent" as const,
        helper: `${failedWithdrawals.toLocaleString()} failed/rejected`,
      },
      {
        label: "Deposits Today",
        value: formatMoney(todayDeposits._sum.amount ?? 0),
        tone: "blue" as const,
        helper:
          averageDeposit > 0
            ? `Avg ticket ${formatMoney(averageDeposit)}`
            : "No completed deposits yet",
      },
      {
        label: "Active Risk Alerts",
        value: activeRiskAlerts.toLocaleString(),
        tone: activeRiskAlerts > 0 ? ("red" as const) : ("blue" as const),
        helper: `${activeRiskAlerts > 0 ? "Attention required" : "All clear"}`,
      },
      {
        label: "Active Bets",
        value: activeBets.toLocaleString(),
        tone: "blue" as const,
        helper: `${activeBets > 0 ? "Pending settlement" : "No pending bets"}`,
      },
    ],
    charts: {
      depositWithdrawalTrend: Array.from(trendByDate.values()),
      totals: {
        deposits7d: sevenDayDepositTotal,
        withdrawals7d: sevenDayWithdrawalTotal,
      },
    },
    recentTransactions: recentTransactions.map((transaction) => {
      const fee =
        transaction.type === "WITHDRAWAL"
          ? ((transaction.providerCallback as { fee?: number } | null)?.fee ??
            0)
          : 0;
      const totalDebit =
        transaction.type === "WITHDRAWAL"
          ? ((transaction.providerCallback as { totalDebit?: number } | null)
              ?.totalDebit ?? transaction.amount)
          : transaction.amount;

      return {
        id: transaction.id,
        reference:
          transaction.providerReceiptNumber ??
          transaction.checkoutRequestId ??
          transaction.reference,
        mpesaCode: transaction.providerReceiptNumber,
        userEmail: transaction.user.email,
        userPhone: transaction.user.phone,
        type: transaction.type.toLowerCase(),
        amount: transaction.amount,
        fee,
        totalDebit,
        status: toAdminStatus(transaction.status),
        createdAt: transaction.createdAt.toISOString(),
        channel: transaction.channel,
      };
    }),
  });
}

export async function getBettingAnalytics(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const parsedTimeframe = bettingAnalyticsTimeframeSchema.safeParse(
    req.query.timeframe ?? "1m",
  );
  const timeframe = parsedTimeframe.success ? parsedTimeframe.data : "1m";
  const window = resolveBettingAnalyticsWindow(timeframe);
  const parsedGroupBy = bettingAnalyticsGroupBySchema.safeParse(
    req.query.groupBy,
  );
  const groupBy = parsedGroupBy.success
    ? parsedGroupBy.data
    : window.defaultGroupBy;

  const currentStart = window.start;
  const currentEnd = window.end;
  const currentDurationMs = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - currentDurationMs);

  const [bets, previousBets, settings, walletTransactions] = await Promise.all([
    prisma.bet.findMany({
      where: {
        placedAt: { gte: currentStart, lte: currentEnd },
      },
      select: {
        userId: true,
        stake: true,
        potentialPayout: true,
        displayOdds: true,
        status: true,
        placedAt: true,
        event: {
          select: {
            sportKey: true,
            leagueName: true,
          },
        },
      },
      orderBy: { placedAt: "asc" },
    }),
    prisma.bet.findMany({
      where: {
        placedAt: { gte: previousStart, lte: previousEnd },
      },
      select: {
        userId: true,
        stake: true,
        potentialPayout: true,
        status: true,
      },
    }),
    prisma.adminSettings.findUnique({
      where: { key: "global" },
      select: {
        commissionPercent: true,
        winningsTaxPercent: true,
      },
    }),
    prisma.walletTransaction.findMany({
      where: {
        createdAt: { gte: currentStart, lte: currentEnd },
        status: "COMPLETED",
      },
      select: {
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const commissionRate =
    settings?.commissionPercent ??
    defaultAdminSettings.taxAndFinancialRules.commissionPercent;
  const taxRate =
    settings?.winningsTaxPercent ??
    defaultAdminSettings.taxAndFinancialRules.winningsTaxPercent;

  const walletDeposits = walletTransactions
    .filter((tx) => tx.type === "DEPOSIT")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const walletWithdrawals = walletTransactions
    .filter((tx) => tx.type === "WITHDRAWAL")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const walletDepositCount = walletTransactions.filter(
    (tx) => tx.type === "DEPOSIT",
  ).length;
  const walletWithdrawalCount = walletTransactions.filter(
    (tx) => tx.type === "WITHDRAWAL",
  ).length;

  const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalPayout = bets
    .filter((bet) => bet.status === "WON")
    .reduce((sum, bet) => sum + bet.potentialPayout, 0);
  const totalRefunds = bets
    .filter((bet) => bet.status === "VOID")
    .reduce((sum, bet) => sum + bet.stake, 0);

  const wonCount = bets.filter((bet) => bet.status === "WON").length;
  const lostCount = bets.filter((bet) => bet.status === "LOST").length;
  const voidCount = bets.filter((bet) => bet.status === "VOID").length;
  const pendingCount = bets.filter((bet) => bet.status === "PENDING").length;
  const settledCount = wonCount + lostCount + voidCount;
  const betCount = bets.length;

  const activeBettors = new Set(bets.map((bet) => bet.userId)).size;
  const averageStake = betCount > 0 ? totalStake / betCount : 0;
  const averageOdds =
    betCount > 0
      ? bets.reduce((sum, bet) => sum + bet.displayOdds, 0) / betCount
      : 0;

  const ggr = totalStake - totalPayout - totalRefunds;
  const commissionProvision = ggr > 0 ? (ggr * commissionRate) / 100 : 0;
  const taxProvision = ggr > 0 ? (ggr * taxRate) / 100 : 0;
  const ngr = ggr - commissionProvision - taxProvision;

  const holdRate = totalStake > 0 ? (ggr / totalStake) * 100 : 0;
  const payoutRatio = totalStake > 0 ? (totalPayout / totalStake) * 100 : 0;
  const refundRate = totalStake > 0 ? (totalRefunds / totalStake) * 100 : 0;
  const hitRate =
    wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

  const previousStake = previousBets.reduce((sum, bet) => sum + bet.stake, 0);
  const previousPayout = previousBets
    .filter((bet) => bet.status === "WON")
    .reduce((sum, bet) => sum + bet.potentialPayout, 0);
  const previousRefunds = previousBets
    .filter((bet) => bet.status === "VOID")
    .reduce((sum, bet) => sum + bet.stake, 0);
  const previousGgr = previousStake - previousPayout - previousRefunds;
  const previousActiveBettors = new Set(previousBets.map((bet) => bet.userId))
    .size;

  const trendByBucket = new Map<
    string,
    {
      period: string;
      stake: number;
      payout: number;
      refunds: number;
      betCount: number;
      won: number;
      lost: number;
      activeBettorIds: Set<string>;
    }
  >();

  const firstBucketStart = getBucketStart(currentStart, groupBy);
  const bucketCursor = new Date(firstBucketStart);
  while (bucketCursor.getTime() <= currentEnd.getTime()) {
    const key = formatDateKey(bucketCursor);
    trendByBucket.set(key, {
      period: formatBucketLabel(bucketCursor, groupBy),
      stake: 0,
      payout: 0,
      refunds: 0,
      betCount: 0,
      won: 0,
      lost: 0,
      activeBettorIds: new Set<string>(),
    });

    incrementBucket(bucketCursor, groupBy);
  }

  const sportsMap = new Map<
    string,
    {
      sport: string;
      stake: number;
      payout: number;
      refunds: number;
      bets: number;
      won: number;
      lost: number;
      activeBettorIds: Set<string>;
    }
  >();
  const leaguesMap = new Map<
    string,
    {
      league: string;
      sport: string;
      stake: number;
      payout: number;
      refunds: number;
      bets: number;
      activeBettorIds: Set<string>;
    }
  >();

  const stakeBands = [
    { label: "0-100", min: 0, max: 100, bets: 0, handle: 0 },
    { label: "101-500", min: 101, max: 500, bets: 0, handle: 0 },
    { label: "501-1,000", min: 501, max: 1000, bets: 0, handle: 0 },
    { label: "1,001-5,000", min: 1001, max: 5000, bets: 0, handle: 0 },
    {
      label: "5,001+",
      min: 5001,
      max: Number.POSITIVE_INFINITY,
      bets: 0,
      handle: 0,
    },
  ];

  const oddsBands = [
    {
      label: "1.01-1.49",
      min: 1.01,
      max: 1.49,
      bets: 0,
      won: 0,
      stake: 0,
      payout: 0,
    },
    {
      label: "1.50-1.99",
      min: 1.5,
      max: 1.99,
      bets: 0,
      won: 0,
      stake: 0,
      payout: 0,
    },
    {
      label: "2.00-2.99",
      min: 2,
      max: 2.99,
      bets: 0,
      won: 0,
      stake: 0,
      payout: 0,
    },
    {
      label: "3.00-4.99",
      min: 3,
      max: 4.99,
      bets: 0,
      won: 0,
      stake: 0,
      payout: 0,
    },
    {
      label: "5.00+",
      min: 5,
      max: Number.POSITIVE_INFINITY,
      bets: 0,
      won: 0,
      stake: 0,
      payout: 0,
    },
  ];

  for (const bet of bets) {
    const bucketDate = getBucketStart(bet.placedAt, groupBy);
    const bucketKey = formatDateKey(bucketDate);
    const bucket = trendByBucket.get(bucketKey);

    if (bucket) {
      bucket.betCount += 1;
      bucket.stake += bet.stake;
      bucket.activeBettorIds.add(bet.userId);

      if (bet.status === "WON") {
        bucket.payout += bet.potentialPayout;
        bucket.won += 1;
      }

      if (bet.status === "LOST") {
        bucket.lost += 1;
      }

      if (bet.status === "VOID") {
        bucket.refunds += bet.stake;
      }
    }

    const sportName = bet.event?.sportKey ?? "Uncategorized";
    const sportRow = sportsMap.get(sportName) ?? {
      sport: sportName,
      stake: 0,
      payout: 0,
      refunds: 0,
      bets: 0,
      won: 0,
      lost: 0,
      activeBettorIds: new Set<string>(),
    };
    sportRow.bets += 1;
    sportRow.stake += bet.stake;
    sportRow.activeBettorIds.add(bet.userId);
    if (bet.status === "WON") {
      sportRow.won += 1;
      sportRow.payout += bet.potentialPayout;
    }
    if (bet.status === "LOST") {
      sportRow.lost += 1;
    }
    if (bet.status === "VOID") {
      sportRow.refunds += bet.stake;
    }
    sportsMap.set(sportName, sportRow);

    const leagueName = bet.event?.leagueName ?? "Other Leagues";
    const leagueKey = `${sportName}:${leagueName}`;
    const leagueRow = leaguesMap.get(leagueKey) ?? {
      league: leagueName,
      sport: sportName,
      stake: 0,
      payout: 0,
      refunds: 0,
      bets: 0,
      activeBettorIds: new Set<string>(),
    };
    leagueRow.bets += 1;
    leagueRow.stake += bet.stake;
    leagueRow.activeBettorIds.add(bet.userId);
    if (bet.status === "WON") {
      leagueRow.payout += bet.potentialPayout;
    }
    if (bet.status === "VOID") {
      leagueRow.refunds += bet.stake;
    }
    leaguesMap.set(leagueKey, leagueRow);

    const matchingStakeBand = stakeBands.find(
      (band) => bet.stake >= band.min && bet.stake <= band.max,
    );
    if (matchingStakeBand) {
      matchingStakeBand.bets += 1;
      matchingStakeBand.handle += bet.stake;
    }

    const matchingOddsBand = oddsBands.find(
      (band) => bet.displayOdds >= band.min && bet.displayOdds <= band.max,
    );
    if (matchingOddsBand) {
      matchingOddsBand.bets += 1;
      matchingOddsBand.stake += bet.stake;
      if (bet.status === "WON") {
        matchingOddsBand.won += 1;
        matchingOddsBand.payout += bet.potentialPayout;
      }
    }
  }

  const trend = Array.from(trendByBucket.values()).map((row) => {
    const rowGgr = row.stake - row.payout - row.refunds;
    const rowCommissionProvision =
      rowGgr > 0 ? (rowGgr * commissionRate) / 100 : 0;
    const rowTaxProvision = rowGgr > 0 ? (rowGgr * taxRate) / 100 : 0;
    const rowSettled = row.won + row.lost;

    return {
      period: row.period,
      stake: row.stake,
      payout: row.payout,
      refunds: row.refunds,
      ggr: rowGgr,
      ngr: rowGgr - rowCommissionProvision - rowTaxProvision,
      betCount: row.betCount,
      activeBettors: row.activeBettorIds.size,
      holdRate: row.stake > 0 ? (rowGgr / row.stake) * 100 : 0,
      hitRate: rowSettled > 0 ? (row.won / rowSettled) * 100 : 0,
    };
  });

  const sports = Array.from(sportsMap.values())
    .map((row) => {
      const rowGgr = row.stake - row.payout - row.refunds;
      const settledForHitRate = row.won + row.lost;

      return {
        sport: row.sport,
        bets: row.bets,
        activeBettors: row.activeBettorIds.size,
        stake: row.stake,
        payout: row.payout,
        refunds: row.refunds,
        ggr: rowGgr,
        shareOfHandle: totalStake > 0 ? (row.stake / totalStake) * 100 : 0,
        hitRate:
          settledForHitRate > 0 ? (row.won / settledForHitRate) * 100 : 0,
      };
    })
    .sort((left, right) => right.stake - left.stake);

  const leagues = Array.from(leaguesMap.values())
    .map((row) => ({
      league: row.league,
      sport: row.sport,
      bets: row.bets,
      activeBettors: row.activeBettorIds.size,
      stake: row.stake,
      payout: row.payout,
      refunds: row.refunds,
      ggr: row.stake - row.payout - row.refunds,
      shareOfHandle: totalStake > 0 ? (row.stake / totalStake) * 100 : 0,
    }))
    .sort((left, right) => right.stake - left.stake)
    .slice(0, 10);

  const outcomes = [
    { status: "Won", count: wonCount },
    { status: "Lost", count: lostCount },
    { status: "Void", count: voidCount },
    { status: "Pending", count: pendingCount },
  ].map((row) => ({
    ...row,
    share: betCount > 0 ? (row.count / betCount) * 100 : 0,
  }));

  const stakeDistribution = stakeBands.map((band) => ({
    band: band.label,
    bets: band.bets,
    handle: band.handle,
    share: totalStake > 0 ? (band.handle / totalStake) * 100 : 0,
  }));

  const oddsPerformance = oddsBands.map((band) => {
    const bandGgr = band.stake - band.payout;
    return {
      band: band.label,
      bets: band.bets,
      hitRate: band.bets > 0 ? (band.won / band.bets) * 100 : 0,
      stake: band.stake,
      payout: band.payout,
      ggr: bandGgr,
      holdRate: band.stake > 0 ? (bandGgr / band.stake) * 100 : 0,
    };
  });

  const recommendations: Array<{
    title: string;
    priority: "high" | "medium" | "low";
    insight: string;
    action: string;
  }> = [];

  if (holdRate < 3) {
    recommendations.push({
      title: "Low betting margin",
      priority: "high",
      insight: `Hold rate is ${holdRate.toFixed(1)}%, below healthy threshold for sustained profitability.`,
      action:
        "Review high-volume markets and tighten odds margin where exposure is concentrated.",
    });
  }

  if (refundRate > 7) {
    recommendations.push({
      title: "High void/refund exposure",
      priority: "medium",
      insight: `${refundRate.toFixed(1)}% of handle was refunded through void bets.`,
      action:
        "Audit event settlement inputs and suspend markets with frequent result reversals.",
    });
  }

  if (percentageChange(activeBettors, previousActiveBettors) < -10) {
    recommendations.push({
      title: "Bettor activity is declining",
      priority: "medium",
      insight: `Active bettors dropped ${Math.abs(percentageChange(activeBettors, previousActiveBettors)).toFixed(1)}% versus prior window.`,
      action:
        "Boost retention campaigns around top leagues and adjust limits for dormant segments.",
    });
  }

  const topSport = sports[0];
  if (topSport && topSport.shareOfHandle > 45) {
    recommendations.push({
      title: "Handle concentration risk",
      priority: "low",
      insight: `${topSport.sport} contributes ${topSport.shareOfHandle.toFixed(1)}% of total handle.`,
      action:
        "Diversify engagement by promoting underrepresented sports and cross-sell live markets.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Portfolio looks balanced",
      priority: "low",
      insight:
        "Current handle mix, hit rate, and hold are within healthy operating ranges.",
      action:
        "Maintain current risk controls and continue monitoring at weekly granularity.",
    });
  }

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    timeframe,
    groupBy,
    window: {
      start: currentStart.toISOString(),
      end: currentEnd.toISOString(),
    },
    financialSummary: {
      handle: totalStake,
      payouts: totalPayout,
      refunds: totalRefunds,
      ggr,
      commissionRate,
      commissionProvision,
      taxRate,
      taxProvision,
      ngr,
    },
    operationalSummary: {
      betCount,
      settledCount,
      activeBettors,
      averageStake,
      averageOdds,
      holdRate,
      payoutRatio,
      refundRate,
      hitRate,
      wonCount,
      lostCount,
      voidCount,
      pendingCount,
    },
    growth: {
      handleChangePct: percentageChange(totalStake, previousStake),
      ggrChangePct: percentageChange(ggr, previousGgr),
      activeBettorsChangePct: percentageChange(
        activeBettors,
        previousActiveBettors,
      ),
    },
    signalCards: [
      {
        label: "Hold Rate",
        value: `${holdRate.toFixed(1)}%`,
        tone:
          holdRate >= 8
            ? ("accent" as const)
            : holdRate >= 4
              ? ("gold" as const)
              : ("red" as const),
        helper: "Gross revenue over total handle",
      },
      {
        label: "Hit Rate",
        value: `${hitRate.toFixed(1)}%`,
        tone:
          hitRate <= 45
            ? ("accent" as const)
            : hitRate <= 55
              ? ("blue" as const)
              : ("gold" as const),
        helper: "Winning tickets among won/lost",
      },
      {
        label: "Refund Rate",
        value: `${refundRate.toFixed(1)}%`,
        tone:
          refundRate <= 3
            ? ("accent" as const)
            : refundRate <= 7
              ? ("gold" as const)
              : ("red" as const),
        helper: "Void volume as share of handle",
      },
      {
        label: "Average Odds",
        value: averageOdds > 0 ? averageOdds.toFixed(2) : "0.00",
        tone: "purple" as const,
        helper: "Mean offered odds in selected window",
      },
    ],
    trend,
    breakdowns: {
      sports,
      leagues,
      outcomes,
      stakeDistribution,
      oddsPerformance,
    },
    walletSummary: {
      totalDeposits: walletDeposits,
      totalWithdrawals: walletWithdrawals,
      depositCount: walletDepositCount,
      withdrawalCount: walletWithdrawalCount,
      netFlow: walletDeposits - walletWithdrawals,
    },
    recommendations,
  });
}

export async function createUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const parsedBody = createUserSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ message: "Invalid user payload." });
  }

  if (parsedBody.data.password !== parsedBody.data.confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  const normalizedPhone = normalizeKenyanPhone(parsedBody.data.phone);
  if (!normalizedPhone) {
    return res.status(400).json({ message: "Invalid Kenyan phone number." });
  }

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsedBody.data.email } }),
    prisma.user.findUnique({ where: { phone: normalizedPhone } }),
  ]);

  if (existingEmail) {
    return res.status(409).json({ message: "Email already exists." });
  }

  if (existingPhone) {
    return res.status(409).json({ message: "Phone already exists." });
  }

  const passwordHash = await bcrypt.hash(parsedBody.data.password, 12);

  const user = await prisma.user.create({
    data: {
      fullName: parsedBody.data.fullName ?? null,
      email: parsedBody.data.email,
      phone: normalizedPhone,
      passwordHash,
      isVerified: parsedBody.data.isVerified ?? false,
      accountStatus: parsedBody.data.accountStatus ?? "ACTIVE",
      role: "USER",
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isVerified: true,
      accountStatus: true,
      bannedAt: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: { balance: true },
      },
      transactions: {
        select: { id: true },
      },
    },
  });

  return res.status(201).json({
    id: user.id,
    name: user.fullName || "Unknown",
    email: user.email,
    phone: user.phone,
    balance: user.wallet?.balance ?? 0,
    isVerified: user.isVerified,
    status:
      user.bannedAt !== null
        ? "banned"
        : user.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    totalBets: user.transactions.length,
  });
}

export async function getAllUsers(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { search = "", status = "", page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = {};

  if (search) {
    where.OR = [
      { email: { contains: String(search), mode: "insensitive" } },
      { fullName: { contains: String(search), mode: "insensitive" } },
      { phone: { contains: String(search), mode: "insensitive" } },
    ];
  }

  if (status === "suspended") {
    where.accountStatus = "SUSPENDED";
  } else if (status === "banned") {
    where.bannedAt = { not: null };
  } else if (status === "active") {
    where.accountStatus = "ACTIVE";
    where.bannedAt = null;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER", ...where },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        isVerified: true,
        accountStatus: true,
        bannedAt: true,
        createdAt: true,
        updatedAt: true,
        wallet: {
          select: { balance: true },
        },
        transactions: {
          select: { id: true },
        },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { role: "USER", ...where } }),
  ]);

  const formattedUsers = users.map((user) => ({
    id: user.id,
    name: user.fullName || "Unknown",
    email: user.email,
    phone: user.phone,
    balance: user.wallet?.balance ?? 0,
    isVerified: user.isVerified,
    status:
      user.bannedAt !== null
        ? "banned"
        : user.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    totalBets: user.transactions.length,
  }));

  return res.status(200).json({
    users: formattedUsers,
    total,
    page: Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  });
}

export async function updateUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);
  const parsedBody = updateUserSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({ message: "Invalid user payload." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== "USER") {
    return res.status(404).json({ message: "User not found" });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName:
        parsedBody.data.fullName === undefined
          ? undefined
          : parsedBody.data.fullName,
      email: parsedBody.data.email,
      phone: parsedBody.data.phone,
      isVerified: parsedBody.data.isVerified,
      accountStatus: parsedBody.data.accountStatus,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isVerified: true,
      accountStatus: true,
      bannedAt: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: { balance: true },
      },
      transactions: {
        select: { id: true },
      },
    },
  });

  return res.status(200).json({
    id: updated.id,
    name: updated.fullName || "Unknown",
    email: updated.email,
    phone: updated.phone,
    balance: updated.wallet?.balance ?? 0,
    isVerified: updated.isVerified,
    status:
      updated.bannedAt !== null
        ? "banned"
        : updated.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    totalBets: updated.transactions.length,
  });
}

export async function getUserDetails(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      isVerified: true,
      accountStatus: true,
      bannedAt: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      wallet: {
        select: { balance: true },
      },
      transactions: {
        select: { id: true, type: true, amount: true, status: true },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({
    id: user.id,
    name: user.fullName || "Unknown",
    email: user.email,
    phone: user.phone,
    balance: user.wallet?.balance ?? 0,
    isVerified: user.isVerified,
    status:
      user.bannedAt !== null
        ? "banned"
        : user.accountStatus === "SUSPENDED"
          ? "suspended"
          : "active",
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    totalBets: user.transactions.length,
    bannedAt: user.bannedAt?.toISOString() || null,
  });
}

export async function banUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);
  const { reason } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.bannedAt) {
    return res.status(400).json({ message: "User is already banned" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      bannedAt: new Date(),
      accountStatus: "SUSPENDED",
    },
    select: {
      id: true,
      email: true,
      bannedAt: true,
    },
  });

  return res.status(200).json({
    message: "User banned successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      bannedAt: updatedUser.bannedAt?.toISOString(),
    },
  });
}

export async function unbanUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (!user.bannedAt) {
    return res.status(400).json({ message: "User is not banned" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      bannedAt: null,
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      bannedAt: true,
    },
  });

  return res.status(200).json({
    message: "User unbanned successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      bannedAt: updatedUser.bannedAt?.toISOString() || null,
    },
  });
}

export async function suspendUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);
  const { reason } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.accountStatus === "SUSPENDED") {
    return res.status(400).json({ message: "User is already suspended" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "SUSPENDED",
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
    },
  });

  return res.status(200).json({
    message: "User suspended successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      accountStatus: updatedUser.accountStatus,
    },
  });
}

export async function unsuspendUser(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const userId = String(req.params.userId);

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (user.accountStatus !== "SUSPENDED") {
    return res.status(400).json({ message: "User is not suspended" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      accountStatus: true,
    },
  });

  return res.status(200).json({
    message: "User unsuspended successfully",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      accountStatus: updatedUser.accountStatus,
    },
  });
}

// Get admin payments (deposits and transactions)
export async function getAdminPayments(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const limit = parseInt(String(req.query.limit ?? 50), 10);
  const offset = parseInt(String(req.query.offset ?? 0), 10);
  const status = String(req.query.status ?? "").toUpperCase();
  const type = String(req.query.type ?? "").toUpperCase();

  const whereFilters: any = {
    type: { in: ["DEPOSIT", "WITHDRAWAL"] },
  };

  if (
    status &&
    ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REVERSED"].includes(
      status,
    )
  ) {
    whereFilters.status = status;
  }

  if (type && ["DEPOSIT", "WITHDRAWAL"].includes(type)) {
    whereFilters.type = type;
  }

  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: whereFilters,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.walletTransaction.count({ where: whereFilters }),
  ]);

  const formattedTransactions = transactions.map((transaction) => ({
    id: transaction.id,
    userId: transaction.userId,
    userEmail: transaction.user.email,
    userPhone: transaction.user.phone,
    userName: transaction.user.fullName,
    type: transaction.type.toLowerCase(),
    amount: transaction.amount,
    status: toAdminStatus(transaction.status),
    reference:
      transaction.providerReceiptNumber ??
      transaction.checkoutRequestId ??
      transaction.reference,
    channel: transaction.channel,
    mpesaCode: transaction.providerReceiptNumber,
    phone: transaction.phone,
    createdAt: transaction.createdAt.toISOString(),
    processedAt: transaction.processedAt?.toISOString() ?? null,
    fee:
      transaction.type === "WITHDRAWAL"
        ? ((transaction.providerCallback as { fee?: number } | null)?.fee ?? 0)
        : 0,
    totalDebit:
      transaction.type === "WITHDRAWAL"
        ? ((transaction.providerCallback as { totalDebit?: number } | null)
            ?.totalDebit ?? transaction.amount)
        : transaction.amount,
  }));

  return res.status(200).json({
    transactions: formattedTransactions,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  });
}

// Get admin wallet transactions summary
export async function getAdminPaymentsStats(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    completedDeposits,
    completedWithdrawals,
    failedDeposits,
    failedWithdrawals,
    totalDepositValue,
    totalWithdrawalValue,
    pendingDepositValue,
    pendingWithdrawalValue,
  ] = await Promise.all([
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL" },
    }),
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT", status: "PENDING" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "PENDING" },
    }),
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT", status: "COMPLETED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "COMPLETED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "DEPOSIT", status: "FAILED" },
    }),
    prisma.walletTransaction.count({
      where: { type: "WITHDRAWAL", status: "FAILED" },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "DEPOSIT" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "DEPOSIT", status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);

  return res.status(200).json({
    stats: {
      deposits: {
        total: totalDeposits,
        pending: pendingDeposits,
        completed: completedDeposits,
        failed: failedDeposits,
        totalValue: totalDepositValue._sum.amount ?? 0,
        pendingValue: pendingDepositValue._sum.amount ?? 0,
      },
      withdrawals: {
        total: totalWithdrawals,
        pending: pendingWithdrawals,
        completed: completedWithdrawals,
        failed: failedWithdrawals,
        totalValue: totalWithdrawalValue._sum.amount ?? 0,
        pendingValue: pendingWithdrawalValue._sum.amount ?? 0,
      },
    },
  });
}

export async function getAdminSettings(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const settings = await prisma.adminSettings.upsert({
    where: { key: "global" },
    update: {},
    create: {
      key: "global",
      ...toDbSettingsData(defaultAdminSettings, req.user.id),
    },
    select: adminSettingsSelect,
  });

  const parsedConfig = adminSettingsSchema.safeParse(toConfig(settings));

  if (!parsedConfig.success) {
    const repaired = await prisma.adminSettings.update({
      where: { key: "global" },
      data: {
        ...toDbSettingsData(defaultAdminSettings, req.user.id),
      },
      select: adminSettingsSelect,
    });

    return res.status(200).json({
      config: toConfig(repaired),
      metadata: {
        key: repaired.key,
        updatedBy: repaired.updatedBy,
        createdAt: repaired.createdAt.toISOString(),
        updatedAt: repaired.updatedAt.toISOString(),
      },
    });
  }

  return res.status(200).json({
    config: parsedConfig.data,
    metadata: {
      key: settings.key,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    },
  });
}

export async function updateAdminSettings(req: Request, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const parsedBody = z
    .object({
      config: adminSettingsSchema,
    })
    .safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({
      message: "Invalid admin settings payload.",
      issues: parsedBody.error.flatten(),
    });
  }

  const updated = await prisma.adminSettings.upsert({
    where: { key: "global" },
    update: toDbSettingsData(parsedBody.data.config, req.user.id),
    create: {
      key: "global",
      ...toDbSettingsData(parsedBody.data.config, req.user.id),
    },
    select: adminSettingsSelect,
  });

  return res.status(200).json({
    message: "Admin settings updated successfully.",
    config: toConfig(updated),
    metadata: {
      key: updated.key,
      updatedBy: updated.updatedBy,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

// Risk Management Functions

export async function getRiskAlerts(req: Request, res: Response) {
  if (!req.user?.id || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(
    1,
    Math.min(50, parseInt(req.query.limit as string) || 20),
  );
  const offset = (page - 1) * limit;

  const status = req.query.status as string | undefined;
  const severity = req.query.severity as string | undefined;
  const alertType = req.query.alertType as string | undefined;

  const where: Prisma.RiskAlertWhereInput = {};
  if (status) where.status = status as any;
  if (severity) where.severity = severity as any;
  if (alertType) where.alertType = alertType as any;

  const [alerts, total] = await Promise.all([
    prisma.riskAlert.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.riskAlert.count({ where }),
  ]);

  return res.status(200).json({
    alerts,
    pagination: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
      page,
    },
  });
}

export async function getRiskAlertDetail(req: Request, res: Response) {
  if (!req.user?.id || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { alertId } = req.params as { alertId: string };

  const alert = await prisma.riskAlert.findUnique({
    where: { id: alertId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          accountStatus: true,
          createdAt: true,
        },
      },
    },
  });

  if (!alert) {
    return res.status(404).json({ message: "Risk alert not found." });
  }

  return res.status(200).json({ alert });
}

export async function updateRiskAlert(req: Request, res: Response) {
  if (!req.user?.id || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const { alertId } = req.params as { alertId: string };
  const { status, actionTaken, resolvedBy } = req.body;

  const schema = z.object({
    status: z
      .enum(["OPEN", "IN_REVIEW", "ESCALATED", "RESOLVED", "DISMISSED"])
      .optional(),
    actionTaken: z.string().optional(),
    resolvedBy: z.string().optional(),
  });

  const parsed = schema.safeParse({ status, actionTaken, resolvedBy });
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body.",
      issues: parsed.error.flatten(),
    });
  }

  const updateData: any = {};
  if (parsed.data.status) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }
  }
  if (parsed.data.actionTaken !== undefined)
    updateData.actionTaken = parsed.data.actionTaken;
  if (parsed.data.resolvedBy !== undefined)
    updateData.resolvedBy = parsed.data.resolvedBy;

  const updated = await prisma.riskAlert.update({
    where: { id: alertId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
        },
      },
    },
  });

  return res.status(200).json({
    message: "Risk alert updated successfully.",
    alert: updated,
  });
}

export async function getRiskSummary(req: Request, res: Response) {
  if (!req.user?.id || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Admin access required." });
  }

  const [
    openCount,
    inReviewCount,
    escalatedCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    alertsByType,
  ] = await Promise.all([
    prisma.riskAlert.count({ where: { status: "OPEN" } }),
    prisma.riskAlert.count({ where: { status: "IN_REVIEW" } }),
    prisma.riskAlert.count({ where: { status: "ESCALATED" } }),
    prisma.riskAlert.count({ where: { severity: "CRITICAL" } }),
    prisma.riskAlert.count({ where: { severity: "HIGH" } }),
    prisma.riskAlert.count({ where: { severity: "MEDIUM" } }),
    prisma.riskAlert.count({ where: { severity: "LOW" } }),
    prisma.riskAlert.groupBy({
      by: ["alertType"],
      _count: true,
      orderBy: { _count: { alertType: "desc" } },
    }),
  ]);

  // Get recent alerts (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentAlerts = await prisma.riskAlert.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, severity: true },
    orderBy: { createdAt: "desc" },
  });

  // Group by date
  const alertsByDate: Record<string, number> = {};
  recentAlerts.forEach((alert) => {
    const date = alert.createdAt.toISOString().split("T")[0];
    alertsByDate[date] = (alertsByDate[date] || 0) + 1;
  });

  // Get high-risk users
  const highRiskUsers = await prisma.riskAlert.groupBy({
    by: ["userId"],
    _count: true,
    where: { userId: { not: null } },
    orderBy: { _count: { userId: "desc" } },
    take: 5,
  });

  const userIds = highRiskUsers.filter((u) => u.userId).map((u) => u.userId!);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, fullName: true },
  });

  const highRiskUsersWithDetails = highRiskUsers
    .filter((u) => u.userId)
    .map((item) => {
      const user = users.find((u) => u.id === item.userId);
      return {
        userId: item.userId,
        email: user?.email,
        fullName: user?.fullName,
        alertCount: item._count,
      };
    });

  return res.status(200).json({
    summary: {
      byStatus: {
        open: openCount,
        inReview: inReviewCount,
        escalated: escalatedCount,
      },
      bySeverity: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    },
    alertsByType: alertsByType.map((item) => ({
      type: item.alertType,
      count: item._count,
    })),
    alertsByDate,
    highRiskUsers: highRiskUsersWithDetails,
  });
}
