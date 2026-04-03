import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import RootLayout from "./layouts/root-layout";
import UserLayout from "./layouts/user-layout";
import AdminLayout from "@/features/admin/components/layout";
import UserHomePage from "./pages/user-home-page";
import LoginPage from "@/features/auth/pages/login-page";
import RegisterPage from "@/features/auth/pages/register-page";
import PaymentsPage from "@/features/payments/payments-page";
import DashboardPage from "@/features/admin/pages/dashboard-page";
import UsersPage from "@/features/admin/pages/users-page";
import BetsPage from "@/features/admin/pages/bets-page";
import EventsPage from "@/features/admin/pages/events-page";
import OddsPage from "@/features/admin/pages/odds-page";
import TransactionsPage from "@/features/admin/pages/transactions-page";
import RiskPage from "@/features/admin/pages/risk-page";
import ReportsPage from "@/features/admin/pages/reports-page";
import SettingsPage from "@/features/admin/pages/settings-page";

const rootRoute = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootLayout,
});

const appIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/user" });
  },
});

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/user",
  component: UserLayout,
});

const userIndexRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/",
  component: UserHomePage,
});

const userLoginRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/login",
  component: LoginPage,
});

const userRegisterRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/register",
  component: RegisterPage,
});

const userPaymentsRoute = createRoute({
  getParentRoute: () => userRoute,
  path: "/payments",
  component: PaymentsPage,
});

function AdminRouteLayout() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminRouteLayout,
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});

const adminDashboardRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/users",
  component: UsersPage,
});

const adminBetsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/bets",
  component: BetsPage,
});

const adminEventsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/events",
  component: EventsPage,
});

const adminOddsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/odds",
  component: OddsPage,
});

const adminTransactionsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/transactions",
  component: TransactionsPage,
});

const adminRiskRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/risk",
  component: RiskPage,
});

const adminReportsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/reports",
  component: ReportsPage,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => adminRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  appIndexRoute,
  userRoute.addChildren([
    userIndexRoute,
    userLoginRoute,
    userRegisterRoute,
    userPaymentsRoute,
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
