# Contracts: 001-beonely-mvp

Server-side HTTP entry points (Vercel). For request/response shapes, read the implementation:

| Route | Role |
|-------|------|
| [`create-order` handler](../../../api/_handlers/payments/create-order.ts) | Creates Razorpay order; enforces recruiter ownership and payable states. |
| [`verify-payment` handler](../../../api/_handlers/payments/verify-payment.ts) | Verifies signature; updates `payments` + `jobs` (initial pay or featured boost). |

**Note**: There is no separate published OpenAPI file; add `contracts/openapi.yaml` in a future task if external clients require it.
