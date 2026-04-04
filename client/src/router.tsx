import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { adminBetsRoute } from "./routes/admin/bets";
import { adminAnalyticsRoute } from "./routes/admin/analytics";
import { adminDashboardRoute } from "./routes/admin/dashboard";
import { adminEventsRoute } from "./routes/admin/events";
import { adminEventDetailRoute } from "./routes/admin/event-detail";
import { adminIndexRoute } from "./routes/admin";
import { adminOddsRoute } from "./routes/admin/odds";
import { adminReportsRoute } from "./routes/admin/reports";
import { adminRiskRoute } from "./routes/admin/risk";
import { adminRoute } from "./routes/admin/route";
import { adminSettingsRoute } from "./routes/admin/settings";
import { adminTransactionsRoute } from "./routes/admin/transactions";
import { adminUsersRoute } from "./routes/admin/users";
import { forgotPasswordRoute } from "./routes/forgot-password";
import { indexRoute } from "./routes";
import { loginRoute } from "./routes/login";
import { registerRoute } from "./routes/register";
import { resetPasswordRoute } from "./routes/reset-password";
import { rootRoute } from "./routes/root";
import { userIndexRoute } from "./routes/user";
import { userComingSoonRoute } from "./routes/user/coming-soon";
import { userForgotPasswordRoute } from "./routes/user/forgot-password";
import { userLoginRoute } from "./routes/user/login";
import { userPaymentsDepositRoute } from "./routes/user/payments-deposit";
import { userPaymentsHistoryRoute } from "./routes/user/payments-history";
import { userPaymentsRoute } from "./routes/user/payments";
import { userPaymentsWithdrawalRoute } from "./routes/user/payments-withdrawal";
import { userRegisterRoute } from "./routes/user/register";
import { userResetPasswordRoute } from "./routes/user/reset-password";
import { userRoute } from "./routes/user/route";

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  userRoute.addChildren([
    userIndexRoute,
    userComingSoonRoute,
    userLoginRoute,
    userRegisterRoute,
    userForgotPasswordRoute,
    userResetPasswordRoute,
    userPaymentsRoute.addChildren([
      userPaymentsDepositRoute,
      userPaymentsWithdrawalRoute,
      userPaymentsHistoryRoute,
    ]),
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminDashboardRoute,
    adminAnalyticsRoute,
    adminUsersRoute,
    adminBetsRoute,
    adminEventsRoute,
    adminEventDetailRoute,
    adminOddsRoute,
    adminTransactionsRoute,
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
