import { prisma } from "./prisma";
import {
  adminSettingsSchema,
  defaultAdminSettings,
  type AdminSettingsConfig,
} from "./adminSettingsConfig";

export async function getSystemSettings(): Promise<AdminSettingsConfig> {
  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { key: "global" },
    });

    if (!settings) {
      return defaultAdminSettings;
    }

    // Convert flat DB record to nested config object
    // This logic is mirrored from admin.controller.ts toConfig function
    const config: AdminSettingsConfig = {
      generalSystemConfig: {
        platformName: settings.platformName,
        environment: settings.environment as "sandbox" | "live",
        defaultCurrency: settings.defaultCurrency,
        timezone: settings.timezone,
        maintenanceMode: settings.maintenanceMode,
        registrationEnabled: settings.registrationEnabled,
      },
      userDefaultsAndRestrictions: {
        minDeposit: settings.minDeposit,
        maxDeposit: settings.maxDeposit,
        minWithdrawal: settings.minWithdrawal,
        maxWithdrawal: settings.maxWithdrawal,
        dailyTransactionLimit: settings.dailyTransactionLimit,
        maxActiveBetsPerUser: settings.maxActiveBetsPerUser,
        defaultUserRole: "USER",
      },
      kycAndComplianceConfig: {
        kycRequired: settings.kycRequired,
        requiredFields: {
          id: settings.kycRequireId,
          phone: settings.kycRequirePhone,
          email: settings.kycRequireEmail,
        },
        withdrawalRequiresKyc: settings.withdrawalRequiresKyc,
        minimumAge: settings.minimumAge,
        allowedCountries: settings.allowedCountries,
      },
      paymentsConfig: {
        methods: {
          mpesa: settings.paymentMpesaEnabled,
          bankTransfer: settings.paymentBankTransferEnabled,
          paystack: settings.paymentPaystackEnabled,
        },
        mpesa: {
          shortcode: settings.mpesaShortcode,
          consumerKey: settings.mpesaConsumerKey,
          consumerSecret: settings.mpesaConsumerSecret,
          passkey: settings.mpesaPasskey,
          callbackUrl: settings.mpesaCallbackUrl,
          transactionFeePercent: settings.mpesaTransactionFeePercent,
          autoWithdrawEnabled: settings.mpesaAutoWithdrawEnabled,
          mpesaWithdrawalApprovalThreshold:
            settings.mpesaWithdrawalApprovalThreshold,
        },
        paystack: {
          secretKey: settings.paystackSecretKey,
          publicKey: settings.paystackPublicKey,
          webhookSecret: settings.paystackWebhookSecret,
          callbackUrl: settings.paystackCallbackUrl,
          webhookUrl: settings.paystackWebhookUrl,
        },
      },
      bettingEngineConfig: {
        minBetAmount: settings.minBetAmount,
        maxBetAmount: settings.maxBetAmount,
        maxWinPerBet: settings.maxWinPerBet,
        oddsMarginPercent: settings.oddsMarginPercent,
        betDelayMs: settings.betDelayMs,
        cashoutEnabled: settings.cashoutEnabled,
        cashoutMarginPercent: settings.cashoutMarginPercent,
        allowLiveBetting: settings.allowLiveBetting,
      },
      riskManagementConfig: {
        maxExposurePerEvent: settings.maxExposurePerEvent,
        maxExposurePerMarket: settings.maxExposurePerMarket,
        maxPayoutPerDay: settings.maxPayoutPerDay,
        highRiskBetThreshold: settings.highRiskBetThreshold,
        autoBlockSuspiciousUsers: settings.autoBlockSuspiciousUsers,
      },
      bonusesAndPromotionsConfig: {
        welcomeBonusEnabled: settings.welcomeBonusEnabled,
        bonusMode: settings.bonusMode as "fixed_amount" | "percentage",
        bonusAmount: settings.bonusAmount,
        bonusPercent: settings.bonusPercent,
        wageringRequirementMultiplier: settings.wageringRequirementMultiplier,
        bonusExpiryHours: settings.bonusExpiryHours,
        maxBonusPerUser: settings.maxBonusPerUser,
        cashbackRule: settings.cashbackRule,
      },
      notificationsConfig: {
        smsEnabled: settings.smsEnabled,
        emailEnabled: settings.emailEnabled,
        events: {
          depositSuccess: settings.notifyDepositSuccess,
          withdrawalSuccess: settings.notifyWithdrawalSuccess,
          betPlaced: settings.notifyBetPlaced,
          betResult: settings.notifyBetResult,
          adminAlerts: settings.notifyAdminAlerts,
        },
      },
      adminQuickSettings: {
        withdrawalSoundEnabled: settings.adminWithdrawalSoundEnabled,
        withdrawalSoundTone: settings.adminWithdrawalSoundTone,
        withdrawalSoundVolume: settings.adminWithdrawalSoundVolume,
      },
      apiAndIntegrationsConfig: {
        sportsApiKey: settings.sportsApiKey,
        oddsProviderName: settings.oddsProviderName,
        primaryWebhookUrl: settings.primaryWebhookUrl,
        fallbackWebhookUrl: settings.fallbackWebhookUrl,
        retryAttempts: settings.retryAttempts,
        retryBackoffMs: settings.retryBackoffMs,
        requestsPerMinute: settings.requestsPerMinute,
      },
      securityConfig: {
        adminTwoFactorRequired: settings.adminTwoFactorRequired,
        passwordMinLength: settings.passwordMinLength,
        requireUppercase: settings.requireUppercase,
        requireNumber: settings.requireNumber,
        requireSpecialChar: settings.requireSpecialChar,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        maxLoginAttempts: settings.maxLoginAttempts,
        ipWhitelist: settings.ipWhitelist,
        ipBlacklist: settings.ipBlacklist,
      },
      affiliateAndAgentConfig: {
        commissionPercent: settings.affiliateCommissionPercent,
        multiLevelReferralsEnabled: settings.multiLevelReferralsEnabled,
        minimumPayoutThreshold: settings.affiliateMinimumPayoutThreshold,
        withdrawalRule: settings.affiliateWithdrawalRule,
      },
      contentAndLegal: {
        termsAndConditions: settings.termsAndConditions,
        privacyPolicy: settings.privacyPolicy,
        responsibleGamblingMessage: settings.responsibleGamblingMessage,
        supportContactInfo: settings.supportContactInfo,
      },
    };

    const parsed = adminSettingsSchema.safeParse(config);

    if (!parsed.success) {
      console.error(
        "[Settings] Validation failed for admin settings. Falling back to defaults.",
        parsed.error.format(),
      );
    }

    return parsed.success ? parsed.data : defaultAdminSettings;
  } catch (error) {
    console.error("[Settings] Error fetching system settings:", error);
    return defaultAdminSettings;
  }
}
