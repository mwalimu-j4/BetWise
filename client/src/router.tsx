import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setRouter } from "@/lib/router-instance";
import { adminBetsRoute } from "./routes/admin/bets";
import { adminAnalyticsRoute } from "./routes/admin/analytics";
import { adminAppealsRoute } from "./routes/admin/appeals";
import { adminAppealDetailRoute } from "./routes/admin/appeals.$appealId";
import { adminContactsRoute } from "./routes/admin/contacts";
import { adminDashboardRoute } from "./routes/admin/dashboard";
import { adminEventsRoute } from "./routes/admin/events";
import { adminIndexRoute } from "./routes/admin";
import { adminNewsletterRoute } from "./routes/admin/newsletter";
import { adminOddsRoute } from "./routes/admin/odds";
import { adminQuickSettingsRoute } from "./routes/admin/quick-settings";
import { adminReportsRoute } from "./routes/admin/reports";
import { adminRiskRoute } from "./routes/admin/risk";
import { adminRoute } from "./routes/admin/route";
import { adminSecurityRoute } from "./routes/admin/security";
import { adminSettingsRoute } from "./routes/admin/settings";
import { adminTransactionsRoute } from "./routes/admin/transactions";
import { adminWithdrawalsRoute } from "./routes/admin/withdrawals";
import { adminUsersRoute } from "./routes/admin/users";
import { forgotPasswordRoute } from "./routes/forgot-password";
import { indexRoute } from "./routes";
import { myBetDetailRoute } from "./routes/my-bets.$betId";
import { myBetsRoute } from "./routes/my-bets";
import { profileRoute } from "./routes/profile";
import { resetPasswordRoute } from "./routes/reset-password";
import { rootRoute } from "./routes/root";
import { userIndexRoute } from "./routes/user";
import { userComingSoonRoute } from "./routes/user/coming-soon";
import { userContactRoute } from "./routes/user/contact";
import { userPaymentsDepositRoute } from "./routes/user/payments-deposit";
import { userPaymentsHistoryRoute } from "./routes/user/payments-history";
import { userPaymentsRoute } from "./routes/user/payments";
import { userPaymentsWithdrawalRoute } from "./routes/user/payments-withdrawal";
import { userProfileRoute } from "./routes/user/profile";
import { userReportsRoute } from "./routes/user/reports";
import { userResetPasswordRoute } from "./routes/user/reset-password";
import { userRoute } from "./routes/user/route";
import { userHowItWorksRoute } from "./routes/user/how-it-works";
import { userFaqsRoute } from "./routes/user/faqs";
import { userLiveRoute } from "./routes/user/live";
import { userLiveMatchRoute } from "./routes/user/live.$matchId";
import { userTermsRoute } from "./routes/user/terms";
import { userPrivacyRoute } from "./routes/user/privacy";

const routeTree = rootRoute.addChildren([
  indexRoute,
  forgotPasswordRoute,
  myBetsRoute.addChildren([myBetDetailRoute]),
  profileRoute,
  resetPasswordRoute,
  userRoute.addChildren([
    userIndexRoute,
    userLiveRoute.addChildren([userLiveMatchRoute]),
    userComingSoonRoute,
    userContactRoute,
    userProfileRoute,
    userResetPasswordRoute,
    userPaymentsRoute.addChildren([
      userPaymentsDepositRoute,
      userPaymentsWithdrawalRoute,
      userPaymentsHistoryRoute,
    ]),
    userReportsRoute,
    userHowItWorksRoute,
    userFaqsRoute,
    userTermsRoute,
    userPrivacyRoute,
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminDashboardRoute,
    adminAnalyticsRoute,
    adminUsersRoute,
    adminBetsRoute,
    adminAppealsRoute.addChildren([adminAppealDetailRoute]),
    adminContactsRoute,
    adminEventsRoute,
    adminOddsRoute,
    adminTransactionsRoute,
    adminWithdrawalsRoute,
    adminRiskRoute,
    adminReportsRoute,
    adminNewsletterRoute,
    adminQuickSettingsRoute,
    adminSecurityRoute,
    adminSettingsRoute,
  ]),
]);

export function createAppRouter(queryClient: QueryClient) {
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
    },
  });
  setRouter(router);
  return router;
}
