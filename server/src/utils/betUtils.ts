import { randomBytes } from "node:crypto";

const BET_CODE_BYTES = 4;

export function generateBetCode() {
  // 8 hex chars gives enough entropy while staying short for UI display.
  return randomBytes(BET_CODE_BYTES).toString("hex").toUpperCase();
}

export function computePossiblePayout(stake: number, odds: number) {
  return Math.round(stake * odds * 100) / 100;
}

export function applyRoundingRule(amount: number, rule: string): number {
  switch (rule) {
    case "nearest_1":
      return Math.round(amount);
    case "nearest_5":
      return Math.round(amount / 5) * 5;
    case "nearest_10":
      return Math.round(amount / 10) * 10;
    case "floor":
      return Math.floor(amount);
    case "ceil":
      return Math.ceil(amount);
    default:
      return Math.round(amount * 100) / 100;
  }
}

export function calculatePayoutWithTax(
  potentialPayout: number,
  stake: number,
  taxPercent: number,
  roundingRule: string
): { netPayout: number; taxAmount: number } {
  const winnings = potentialPayout - stake;
  
  if (winnings <= 0) {
    return { netPayout: applyRoundingRule(potentialPayout, roundingRule), taxAmount: 0 };
  }

  const taxAmount = (winnings * taxPercent) / 100;
  const netPayout = potentialPayout - taxAmount;

  return {
    netPayout: applyRoundingRule(netPayout, roundingRule),
    taxAmount: Math.round(taxAmount * 100) / 100,
  };
}

export function getClientIp(ip: string | undefined) {
  return ip?.trim() || null;
}
