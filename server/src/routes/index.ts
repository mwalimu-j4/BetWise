import { Router } from "express";
import { betsAdminRouter } from "./admin/bets";
import { eventsAdminRouter } from "./admin/events";
import { oddsAdminRouter } from "./admin/odds";
import { authRouter } from "./auth.routes";
import { adminRouter } from "./admin";
import { healthRouter } from "./health";
import { notificationRouter } from "./notifications";
import { paymentRouter } from "./payments";
import { reportsRouter } from "./reports";
import { userBetsRouter } from "./user/bets";
import { userEventsRouter } from "./user/events";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(adminRouter);
apiRouter.use(paymentRouter);
apiRouter.use(notificationRouter);
apiRouter.use(reportsRouter);
apiRouter.use(eventsAdminRouter);
apiRouter.use(betsAdminRouter);
apiRouter.use(oddsAdminRouter);
apiRouter.use(userEventsRouter);
apiRouter.use(userBetsRouter);

export { apiRouter };
