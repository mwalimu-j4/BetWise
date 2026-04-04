export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "bet-stake"
  | "bet-win"
  | "refund"
  | "bonus";

export type TransactionStatus = "completed" | "pending" | "failed" | "reversed";

export type PaymentMethodKind = "mobile-money" | "bank" | "card";

export type Transaction = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: "KES";
  channel: string;
  reference: string;
  createdAt: string;
};

export type PaymentMethod = {
  id: string;
  label: string;
  kind: PaymentMethodKind;
  account: string;
  verified: boolean;
  isDefault: boolean;
  lastUsed: string;
};

export const walletSummary = {
  balance: 18240.5,
  bonusBalance: 1290,
  lockedForOpenBets: 3750,
  totalDepositsThisMonth: 48500,
  totalWithdrawalsThisMonth: 17300,
};

export const transactions: Transaction[] = [
  {
    id: "TXN-90411",
    type: "deposit",
    status: "completed",
    amount: 3000,
    currency: "KES",
    channel: "M-Pesa STK",
    reference: "QWE2D8K3L9",
    createdAt: "2026-04-04T08:40:00Z",
  },
  {
    id: "TXN-90408",
    type: "withdrawal",
    status: "pending",
    amount: 1500,
    currency: "KES",
    channel: "M-Pesa",
    reference: "WD-20K9M3",
    createdAt: "2026-04-03T16:10:00Z",
  },
  {
    id: "TXN-90377",
    type: "bet-win",
    status: "completed",
    amount: 7250,
    currency: "KES",
    channel: "Bet Settlement",
    reference: "SET-7719",
    createdAt: "2026-04-02T20:22:00Z",
  },
  {
    id: "TXN-90364",
    type: "bet-stake",
    status: "completed",
    amount: 2200,
    currency: "KES",
    channel: "Sportsbook",
    reference: "BST-5512",
    createdAt: "2026-04-02T12:05:00Z",
  },
  {
    id: "TXN-90314",
    type: "bonus",
    status: "completed",
    amount: 500,
    currency: "KES",
    channel: "Welcome Bonus",
    reference: "BN-100W",
    createdAt: "2026-04-01T09:12:00Z",
  },
  {
    id: "TXN-90289",
    type: "deposit",
    status: "completed",
    amount: 5000,
    currency: "KES",
    channel: "M-Pesa STK",
    reference: "HJK9P8U2M1",
    createdAt: "2026-03-30T18:06:00Z",
  },
  {
    id: "TXN-90244",
    type: "withdrawal",
    status: "failed",
    amount: 2000,
    currency: "KES",
    channel: "Bank Transfer",
    reference: "WD-ERR-442",
    createdAt: "2026-03-29T11:45:00Z",
  },
  {
    id: "TXN-90197",
    type: "refund",
    status: "completed",
    amount: 1300,
    currency: "KES",
    channel: "Void Bet Refund",
    reference: "RFD-0021",
    createdAt: "2026-03-28T14:30:00Z",
  },
  {
    id: "TXN-90128",
    type: "bet-stake",
    status: "reversed",
    amount: 800,
    currency: "KES",
    channel: "Sportsbook",
    reference: "BST-R123",
    createdAt: "2026-03-27T10:18:00Z",
  },
  {
    id: "TXN-90074",
    type: "deposit",
    status: "completed",
    amount: 15000,
    currency: "KES",
    channel: "Bank Transfer",
    reference: "BNK-7118",
    createdAt: "2026-03-25T07:15:00Z",
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: "PM-01",
    label: "M-Pesa Safaricom",
    kind: "mobile-money",
    account: "+254 712 345 678",
    verified: true,
    isDefault: true,
    lastUsed: "2026-04-04T08:40:00Z",
  },
  {
    id: "PM-02",
    label: "KCB Bank",
    kind: "bank",
    account: "**** 1190",
    verified: true,
    isDefault: false,
    lastUsed: "2026-03-25T07:15:00Z",
  },
  {
    id: "PM-03",
    label: "Visa Card",
    kind: "card",
    account: "**** **** **** 4412",
    verified: false,
    isDefault: false,
    lastUsed: "2026-03-02T13:00:00Z",
  },
];

export const statementMonths = [
  "April 2026",
  "March 2026",
  "February 2026",
  "January 2026",
];

export const formatMoney = (value: number) => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const titleCase = (value: string) => {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};


