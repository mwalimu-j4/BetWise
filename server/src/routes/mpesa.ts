import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  checkMpesaDepositStatus,
  handleMpesaDepositCallback,
  initializeMpesaDeposit,
} from "../controllers/mpesa.controller";

export const mpesaRouter = Router();

mpesaRouter.post("/initialize", authenticate, initializeMpesaDeposit);
mpesaRouter.get("/status/:transactionId", authenticate, checkMpesaDepositStatus);
mpesaRouter.post("/callback", handleMpesaDepositCallback);

export default mpesaRouter;
