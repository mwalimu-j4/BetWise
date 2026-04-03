import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { adminBetsRoute } from "./routes/admin/bets";
import { adminDashboardRoute } from "./routes/admin/dashboard";
import { adminEventsRoute } from "./routes/admin/events";
import { adminIndexRoute } from "./routes/admin";
import { adminOddsRoute } from "./routes/admin/odds";
import { adminReportsRoute } from "./routes/admin/reports";
import { adminRiskRoute } from "./routes/admin/risk";
import { adminRoute } from "./routes/admin/route";
import { adminSettingsRoute } from "./routes/admin/settings";
import { adminTransactionsRoute } from "./routes/admin/transactions";
import { adminUsersRoute } from "./routes/admin/users";
import { indexRoute } from "./routes";
import { rootRoute } from "./routes/root";
import { userIndexRoute } from "./routes/user";
import { userLoginRoute } from "./routes/user/login";
import { userPaymentsDepositRoute } from "./routes/user/payments-deposit";
import { userPaymentsHistoryRoute } from "./routes/user/payments-history";
import { userPaymentsRoute } from "./routes/user/payments";
import { userPaymentsWithdrawalRoute } from "./routes/user/payments-withdrawal";
import { userRegisterRoute } from "./routes/user/register";
import { userRoute } from "./routes/user/route";

const routeTree = rootRoute.addChildren([
  indexRoute,
  userRoute.addChildren([
    userIndexRoute,
    userLoginRoute,
    userRegisterRoute,
    userPaymentsRoute.addChildren([
      userPaymentsDepositRoute,
      userPaymentsWithdrawalRoute,
      userPaymentsHistoryRoute,
    ]),
  ]),
  adminRoute.addChildren([
    adminIndexRoute,
    adminDashboardRoute,
    adminUsersRoute,
    adminBetsRoute,
    adminEventsRoute,
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
