import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/axiosConfig";

export interface AdminSettingsConfig {
  generalSystemConfig: {
    platformName: string;
    environment: "sandbox" | "live";
    defaultCurrency: string;
    timezone: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
  };
  userDefaultsAndRestrictions: {
    defaultWalletBalance: number;
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
    dailyTransactionLimit: number;
    maxActiveBetsPerUser: number;
    defaultUserRole: "USER";
    autoVerificationRule: "none" | "email" | "email_and_phone";
  };
  kycAndComplianceConfig: {
    kycRequired: boolean;
    requiredFields: {
      id: boolean;
      phone: boolean;
      email: boolean;
    };
    withdrawalRequiresKyc: boolean;
    minimumAge: number;
    allowedCountries: string[];
  };
  paymentsConfig: {
    methods: {
      mpesa: boolean;
      bankTransfer: boolean;
      paystack: boolean;
    };
    mpesa: {
      shortcode: string;
      consumerKey: string;
      consumerSecret: string;
      passkey: string;
      callbackUrl: string;
      transactionFeePercent: number;
      autoWithdrawEnabled: boolean;
      mpesaWithdrawalApprovalThreshold: number;
    };
    paystack: {
      secretKey: string;
      publicKey: string;
      webhookSecret: string;
      callbackUrl: string;
      webhookUrl: string;
    };
  };
  bettingEngineConfig: {
    minBetAmount: number;
    maxBetAmount: number;
    maxWinPerBet: number;
    oddsMarginPercent: number;
    betDelayMs: number;
    cashoutEnabled: boolean;
    cashoutMarginPercent: number;
    allowLiveBetting: boolean;
  };
  riskManagementConfig: {
    maxExposurePerEvent: number;
    maxExposurePerMarket: number;
    maxPayoutPerDay: number;
    highRiskBetThreshold: number;
    autoBlockSuspiciousUsers: boolean;
  };
  bonusesAndPromotionsConfig: {
    welcomeBonusEnabled: boolean;
    bonusMode: "fixed_amount" | "percentage";
    bonusAmount: number;
    bonusPercent: number;
    wageringRequirementMultiplier: number;
    bonusExpiryHours: number;
    maxBonusPerUser: number;
    cashbackRule: string;
  };
  notificationsConfig: {
    smsEnabled: boolean;
    emailEnabled: boolean;
    events: {
      depositSuccess: boolean;
      withdrawalSuccess: boolean;
      betPlaced: boolean;
      betResult: boolean;
      adminAlerts: boolean;
    };
  };
  adminQuickSettings: {
    withdrawalSoundEnabled: boolean;
    withdrawalSoundTone: string;
    withdrawalSoundVolume: number;
  };
  apiAndIntegrationsConfig: {
    sportsApiKey: string;
    oddsProviderName: string;
    primaryWebhookUrl: string;
    fallbackWebhookUrl: string;
    retryAttempts: number;
    retryBackoffMs: number;
    requestsPerMinute: number;
  };
  securityConfig: {
    adminTwoFactorRequired: boolean;
    passwordMinLength: number;
    requireUppercase: boolean;
    requireNumber: boolean;
    requireSpecialChar: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    ipWhitelist: string[];
    ipBlacklist: string[];
  };
  taxAndFinancialRules: {
    winningsTaxPercent: number;
    depositTaxPercent: number;
    commissionPercent: number;
    roundingRule: "nearest_1" | "nearest_5" | "nearest_10" | "floor" | "ceil";
  };
  affiliateAndAgentConfig: {
    commissionPercent: number;
    multiLevelReferralsEnabled: boolean;
    minimumPayoutThreshold: number;
    withdrawalRule: string;
  };
  contentAndLegal: {
    termsAndConditions: string;
    privacyPolicy: string;
    responsibleGamblingMessage: string;
    supportContactInfo: string;
  };
}

export interface AdminSettingsMetadata {
  key: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSettingsResponse {
  config: AdminSettingsConfig;
  metadata: AdminSettingsMetadata;
}

export interface UpdateAdminSettingsResponse extends AdminSettingsResponse {
  message: string;
}

export function useAdminSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const response = await api.get<AdminSettingsResponse>("/admin/settings");
      return response.data;
    },
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: AdminSettingsConfig) => {
      const response = await api.put<UpdateAdminSettingsResponse>(
        "/admin/settings",
        { config },
      );

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-settings"], {
        config: data.config,
        metadata: data.metadata,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });
}
