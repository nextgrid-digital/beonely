# Contracts: 001-beonely-mvp

Server-side HTTP entry points (Vercel). For request/response shapes, read the implementation:

| Route | Role |
|-------|------|
| [`api/create-order.ts`](../../api/create-order.ts) | Creates Razorpay order; enforces recruiter ownership and payable states. |
| [`api/verify-payment.ts`](../../api/verify-payment.ts) | Verifies signature; updates `payments` + `jobs` (initial pay or featured boost). |

**Note**: There is no separate published OpenAPI file; add `contracts/openapi.yaml` in a future task if external clients require it.
