# M-Pesa Callback Handler – Vercel Function

## Status ✅
**Live and Deployed** at: https://mpesa-callback-5cnbi7yle-dikie001s-projects.vercel.app

## About
This is a Vercel serverless function that handles M-Pesa STK push callback notifications for the BetWise betting platform.

### Features
- POST-only endpoint accepts M-Pesa callbacks
- Safely parses JSON request body (no crashes on malformed input)
- Logs full callback payload for debugging
- Dynamically extracts callback metadata fields:
  - `Amount`
  - `PhoneNumber`
  - `MpesaReceiptNumber`
  - `ResultCode` (0 = success, non-zero = failure)
- Always returns 200 OK with accepted confirmation

## Local Development

### Setup
To fix TypeScript editor errors locally, install dependencies:

```bash
cd vercel
pnpm install
```

This installs:
- `@vercel/node` – Vercel serverless runtime types
- `@types/node` – Node.js standard library types
- `typescript` – TypeScript compiler

### Environment Variables
Set these in Vercel dashboard under **Project Settings > Environment Variables**:

```
MPESA_CALLBACK_URL=https://mpesa-callback-5cnbi7yle-dikie001s-projects.vercel.app/api/mpesa/callback
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
```

### Testing Locally (Optional)
The function works on Vercel production. Local development requires more setup (Vercel CLI, local runtime). For now, test via the live endpoint with curl or Postman.

## Deployment
```bash
cd vercel
vercel --prod
```

## Notes
- No Express.js inside Vercel function (uses native handler pattern)
- No hardcoded credentials or webhook URLs
- Production-safe error handling (safe JSON parsing)
- Vercel manages Node.js runtime and dependencies automatically
