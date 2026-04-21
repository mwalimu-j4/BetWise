import { z } from "zod";

const percentageField = z.number().min(0).max(100);
const nonNegativeInt = z.number().int().min(0);

export const adminSettingsSchema = z.object({
  generalSystemConfig: z.object({
    platformName: z.string().trim().min(2).max(100),
    environment: z.enum(["sandbox", "live"]),
    defaultCurrency: z.string().trim().min(3).max(8),
    timezone: z.string().trim().min(3).max(64),
    maintenanceMode: z.boolean(),
    registrationEnabled: z.boolean(),
  }),
  userDefaultsAndRestrictions: z.object({
    minDeposit: nonNegativeInt,
    maxDeposit: nonNegativeInt,
    minWithdrawal: nonNegativeInt,
    maxWithdrawal: nonNegativeInt,
    dailyTransactionLimit: nonNegativeInt,
    maxActiveBetsPerUser: nonNegativeInt,
    defaultUserRole: z.enum(["USER"]),
  }),
  kycAndComplianceConfig: z.object({
    kycRequired: z.boolean(),
    requiredFields: z.object({
      id: z.boolean(),
      phone: z.boolean(),
      email: z.boolean(),
    }),
    withdrawalRequiresKyc: z.boolean(),
    minimumAge: z.number().int().min(13).max(30),
    allowedCountries: z.array(z.string().trim().length(2)).max(250),
  }),
  paymentsConfig: z.object({
    methods: z.object({
      mpesa: z.boolean(),
      bankTransfer: z.boolean(),
    }),
    mpesa: z.object({
      shortcode: z.string().trim().min(5).max(20),
      consumerKey: z.string().trim().min(8).max(255),
      consumerSecret: z.string().trim().min(8).max(255),
      passkey: z.string().trim().min(8).max(255),
      callbackUrl: z.string().trim().url().max(500),
      transactionFeePercent: percentageField,
      autoWithdrawEnabled: z.boolean(),
      mpesaWithdrawalApprovalThreshold: nonNegativeInt,
    }),
    paystack: z.object({
      secretKey: z.string().trim().min(8).max(512),
      publicKey: z.string().trim().min(8).max(512),
      webhookSecret: z.string().trim().min(8).max(512),
      callbackUrl: z.string().trim().url().max(500),
      webhookUrl: z.string().trim().url().max(500),
    }),
  }),
  bettingEngineConfig: z.object({
    minBetAmount: nonNegativeInt,
    maxBetAmount: nonNegativeInt,
    maxWinPerBet: nonNegativeInt,
    oddsMarginPercent: percentageField,
    betDelayMs: nonNegativeInt,
    cashoutEnabled: z.boolean(),
    cashoutMarginPercent: percentageField,
    allowLiveBetting: z.boolean(),
  }),
  riskManagementConfig: z.object({
    maxExposurePerEvent: nonNegativeInt,
    maxExposurePerMarket: nonNegativeInt,
    maxPayoutPerDay: nonNegativeInt,
    highRiskBetThreshold: nonNegativeInt,
    autoBlockSuspiciousUsers: z.boolean(),
  }),
  bonusesAndPromotionsConfig: z.object({
    welcomeBonusEnabled: z.boolean(),
    bonusMode: z.enum(["fixed_amount", "percentage"]),
    bonusAmount: nonNegativeInt,
    bonusPercent: percentageField,
    wageringRequirementMultiplier: z.number().min(1).max(100),
    bonusExpiryHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 180),
    maxBonusPerUser: nonNegativeInt,
    cashbackRule: z.string().trim().min(2).max(280),
  }),
  notificationsConfig: z.object({
    smsEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    events: z.object({
      depositSuccess: z.boolean(),
      withdrawalSuccess: z.boolean(),
      betPlaced: z.boolean(),
      betResult: z.boolean(),
      adminAlerts: z.boolean(),
    }),
  }),
  adminQuickSettings: z.object({
    withdrawalSoundEnabled: z.boolean(),
    withdrawalSoundTone: z.string().trim().min(1).max(255),
    withdrawalSoundVolume: z.number().int().min(0).max(100),
  }),
  apiAndIntegrationsConfig: z.object({
    sportsApiKey: z.string().trim().max(255),
    oddsProviderName: z.string().trim().min(2).max(100),
    primaryWebhookUrl: z.string().trim().url().max(500),
    fallbackWebhookUrl: z.string().trim().url().max(500),
    retryAttempts: z.number().int().min(0).max(15),
    retryBackoffMs: z.number().int().min(0).max(120000),
    requestsPerMinute: z.number().int().min(1).max(50000),
  }),
  securityConfig: z.object({
    adminTwoFactorRequired: z.boolean(),
    passwordMinLength: z.number().int().min(6).max(64),
    requireUppercase: z.boolean(),
    requireNumber: z.boolean(),
    requireSpecialChar: z.boolean(),
    sessionTimeoutMinutes: z
      .number()
      .int()
      .min(5)
      .max(24 * 60),
    maxLoginAttempts: z.number().int().min(3).max(20),
    ipWhitelist: z.array(z.string().trim().max(64)).max(200),
    ipBlacklist: z.array(z.string().trim().max(64)).max(500),
  }),
  taxAndFinancialRules: z.object({
    winningsTaxPercent: percentageField,
    depositTaxPercent: percentageField,
    commissionPercent: percentageField,
    roundingRule: z.enum([
      "nearest_1",
      "nearest_5",
      "nearest_10",
      "floor",
      "ceil",
    ]),
  }),
  affiliateAndAgentConfig: z.object({
    commissionPercent: percentageField,
    multiLevelReferralsEnabled: z.boolean(),
    minimumPayoutThreshold: nonNegativeInt,
    withdrawalRule: z.string().trim().min(2).max(280),
  }),
  contentAndLegal: z.object({
    termsAndConditions: z.string().trim().min(20).max(20000),
    privacyPolicy: z.string().trim().min(20).max(20000),
    responsibleGamblingMessage: z.string().trim().min(10).max(1200),
    supportContactInfo: z.string().trim().min(6).max(320),
  }),
});

export type AdminSettingsConfig = z.infer<typeof adminSettingsSchema>;

export const defaultAdminSettings: AdminSettingsConfig = {
  generalSystemConfig: {
    platformName: "BetixPro",
    environment: "sandbox",
    defaultCurrency: "KES",
    timezone: "Africa/Nairobi",
    maintenanceMode: false,
    registrationEnabled: true,
  },
  userDefaultsAndRestrictions: {
    minDeposit: 100,
    maxDeposit: 200000,
    minWithdrawal: 100,
    maxWithdrawal: 100000,
    dailyTransactionLimit: 500000,
    maxActiveBetsPerUser: 60,
    defaultUserRole: "USER",
  },
  kycAndComplianceConfig: {
    kycRequired: true,
    requiredFields: {
      id: true,
      phone: true,
      email: true,
    },
    withdrawalRequiresKyc: true,
    minimumAge: 18,
    allowedCountries: ["KE"],
  },
  paymentsConfig: {
    methods: {
      mpesa: true,
      bankTransfer: false,
    },
    mpesa: {
      shortcode: "174379",
      consumerKey: "replace-with-consumer-key",
      consumerSecret: "replace-with-consumer-secret",
      passkey: "replace-with-passkey",
      callbackUrl: process.env.MPESA_CALLBACK_URL?.trim() || "",
      transactionFeePercent: 15,
      autoWithdrawEnabled: false,
      mpesaWithdrawalApprovalThreshold: 50000,
    },
    paystack: {
      secretKey: "sk_test_replace_me",
      publicKey: "pk_test_replace_me",
      webhookSecret: "whsec_replace_me",
      callbackUrl: "https://your-domain.com/api/payments/paystack/callback",
      webhookUrl: "https://your-domain.com/api/payments/paystack/webhook",
    },
  },
  bettingEngineConfig: {
    minBetAmount: 10,
    maxBetAmount: 200000,
    maxWinPerBet: 1000000,
    oddsMarginPercent: 7,
    betDelayMs: 1500,
    cashoutEnabled: true,
    cashoutMarginPercent: 5,
    allowLiveBetting: true,
  },
  riskManagementConfig: {
    maxExposurePerEvent: 2000000,
    maxExposurePerMarket: 800000,
    maxPayoutPerDay: 8000000,
    highRiskBetThreshold: 250000,
    autoBlockSuspiciousUsers: true,
  },
  bonusesAndPromotionsConfig: {
    welcomeBonusEnabled: true,
    bonusMode: "percentage",
    bonusAmount: 500,
    bonusPercent: 100,
    wageringRequirementMultiplier: 3,
    bonusExpiryHours: 168,
    maxBonusPerUser: 3000,
    cashbackRule:
      "5% cashback for net losses above KES 2,000, credited weekly.",
  },
  notificationsConfig: {
    smsEnabled: true,
    emailEnabled: true,
    events: {
      depositSuccess: true,
      withdrawalSuccess: true,
      betPlaced: false,
      betResult: true,
      adminAlerts: true,
    },
  },
  adminQuickSettings: {
    withdrawalSoundEnabled: true,
    withdrawalSoundTone: "/sounds/universfield-new-notification-010-352755.mp3",
    withdrawalSoundVolume: 80,
  },
  apiAndIntegrationsConfig: {
    sportsApiKey: "replace-with-sports-api-key",
    oddsProviderName: "TheOddsAPI",
    primaryWebhookUrl: "https://example.com/webhooks/sports",
    fallbackWebhookUrl: "https://example.com/webhooks/sports/fallback",
    retryAttempts: 3,
    retryBackoffMs: 5000,
    requestsPerMinute: 600,
  },
  securityConfig: {
    adminTwoFactorRequired: true,
    passwordMinLength: 6,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    ipWhitelist: [],
    ipBlacklist: [],
  },
  taxAndFinancialRules: {
    winningsTaxPercent: 20,
    depositTaxPercent: 0,
    commissionPercent: 2,
    roundingRule: "nearest_1",
  },
  affiliateAndAgentConfig: {
    commissionPercent: 5,
    multiLevelReferralsEnabled: false,
    minimumPayoutThreshold: 1500,
    withdrawalRule: "Monthly payouts after reconciliation and KYC check.",
  },
  contentAndLegal: {
    termsAndConditions:
      "By using this platform, you agree to our betting terms, fair usage policies, and anti-fraud controls.",
    privacyPolicy:
      "We process account and transactional data strictly for service operations, regulatory compliance, and fraud prevention.",
    responsibleGamblingMessage:
      "Bet responsibly. Set limits and seek support if betting affects your wellbeing.",
    supportContactInfo: "support@betixpro.com | +254700000000",
  },
};
