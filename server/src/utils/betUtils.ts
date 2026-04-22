import { randomBytes } from "node:crypto";

const BET_CODE_BYTES = 4;

export function generateBetCode() {
  // 8 hex chars gives enough entropy while staying short for UI display.
  return randomBytes(BET_CODE_BYTES).toString("hex").toUpperCase();
}

export function computePossiblePayout(stake: number, odds: number) {
  return Math.round(stake * odds * 100) / 100;
}


export function getClientIp(ip: string | undefined) {
  return ip?.trim() || null;
}
