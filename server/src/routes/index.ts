import { Router } from "express";
import { betsAdminRouter } from "./admin/bets";
import { eventsAdminRouter } from "./admin/events";
import { oddsAdminRouter } from "./admin/odds";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health";
import { notificationRouter } from "./notifications";
import { paymentRouter } from "./payments";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(paymentRouter);
apiRouter.use(notificationRouter);
apiRouter.use(eventsAdminRouter);
apiRouter.use(betsAdminRouter);
apiRouter.use(oddsAdminRouter);

export { apiRouter };
