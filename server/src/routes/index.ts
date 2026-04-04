import { Router } from "express";
import { authRouter } from "./auth.routes";
import { adminRouter } from "./admin";
import { healthRouter } from "./health";
import { notificationRouter } from "./notifications";
import { paymentRouter } from "./payments";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(adminRouter);
apiRouter.use(paymentRouter);
apiRouter.use(notificationRouter);

export { apiRouter };
