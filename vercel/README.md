# M-Pesa Callback Handler – Independent Express Server

## Status ✅

**Standalone Server** - Run locally or deploy anywhere

## Setup

### Installation

```bash
cd vercel
pnpm install
```

### Development

```bash
pnpm dev
```

Server starts on `http://localhost:3000`

### Production Build

```bash
pnpm build
pnpm start
```

## Environment Variables

Copy `.env` and configure:

```
NODE_ENV=development
PORT=3000
MPESA_CALLBACK_URL=http://localhost:3000/api/mpesa/callback
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_ENV=sandbox
```

## Endpoints

### Health Check

```
GET /health
```

### M-Pesa Callback (STK Push)

```
POST /api/mpesa/callback
Content-Type: application/json

{
  "Body": {
    "stkCallback": {
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 500 },
          { "Name": "MpesaReceiptNumber", "Value": "QQZ269V0QV" },
          { "Name": "PhoneNumber", "Value": "254700000000" }
        ]
      }
    }
  }
}
```

**Response:**

```json
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

## Features

- ✅ Standalone Express server
- ✅ Safe JSON parsing (no crashes on malformed input)
- ✅ Full callback payload logging
- ✅ Dynamic metadata extraction
- ✅ CORS enabled
- ✅ TypeScript support
- ✅ Environment-based config

## Testing Locally

```bash
curl -X POST http://localhost:3000/api/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{
    "Body": {
      "stkCallback": {
        "ResultCode": 0,
        "ResultDesc": "Success",
        "CallbackMetadata": {
          "Item": [
            {"Name": "Amount", "Value": 500},
            {"Name": "MpesaReceiptNumber", "Value": "TEST123"},
            {"Name": "PhoneNumber", "Value": "254700000000"}
          ]
        }
      }
    }
  }'
```

## Deployment

### Deploy to Vercel (Production Serverless)

```bash
vercel --prod
```

### Deploy Anywhere (Docker, Railway, Render, etc.)

```bash
pnpm build
pnpm start
```

## File Structure

```
vercel/
├── src/
│   ├── server.ts       # Express app setup
│   └── routes/
│       └── callback.ts # M-Pesa callback handler
├── dist/               # Compiled JavaScript
├── .env                # Environment variables
├── package.json        # Dependencies & scripts
├── tsconfig.json       # TypeScript config
└── README.md           # This file
```
