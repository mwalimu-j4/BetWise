import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { adminBetsRoute } from "./routes/admin/bets";
import { adminAnalyticsRoute } from "./routes/admin/analytics";
import { adminDashboardRoute } from "./routes/admin/dashboard";
import { adminEventsRoute } from "./routes/admin/events";
import { adminIndexRoute } from "./routes/admin";
import { adminOddsRoute } from "./routes/admin/odds";
import { adminReportsRoute } from "./routes/admin/reports";
import { adminRiskRoute } from "./routes/admin/risk";
import { adminRoute } from "./routes/admin/route";
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
import { userLiveMatchRoute } from "./routes/user/live.$matchId";
import { userLiveRoute } from "./routes/user/live";
import { userForgotPasswordRoute } from "./routes/user/forgot-password";
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  myBetsRoute.addChildren([myBetDetailRoute]),
  profileRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  userRoute.addChildren([
    userIndexRoute,
    userComingSoonRoute,
    userLiveRoute.addChildren([userLiveMatchRoute]),
    userProfileRoute,
    userForgotPasswordRoute,
    userResetPasswordRoute,
    userPaymentsRoute.addChildren([
      userPaymentsDepositRoute,
      userPaymentsWithdrawalRoute,
      userPaymentsHistoryRoute,
    ]),
    userReportsRoute,
    userHowItWorksRoute,
    userFaqsRoute,
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminDashboardRoute,
    adminAnalyticsRoute,
    adminUsersRoute,
    adminBetsRoute,
    adminEventsRoute,
    adminOddsRoute,
    adminTransactionsRoute,
    adminWithdrawalsRoute,
    adminRiskRoute,
    adminReportsRoute,
    adminSettingsRoute,
  ]),
]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: {
      queryClient,
    },
  });
}
