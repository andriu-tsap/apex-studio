# Delivery map

All requested application modules are represented by working implementations in this source distribution. This is a concept/demo product, not an operating automotive business.

| Area              | Implementation                                                               |
| ----------------- | ---------------------------------------------------------------------------- |
| Public experience | Next.js 15, 3 locales, themes, GLB configuration, PNG, static fallback       |
| Booking           | Form validation, pricing fallback, server slot availability, demo receipts   |
| Backend           | Express, JWT rotation, bcrypt, owner/staff permissions, OpenAPI              |
| Persistence       | PostgreSQL migrations, seeds, partial unique slot index, SQL reports         |
| CRM               | Angular 20 standalone/signals, Material table, CDK calendar, roles, XLSX     |
| Automation        | Python estimates, PDF, Excel and controlled price parser                     |
| E-commerce        | Persistent local cart, explicit unpaid demo orders, Stripe test integration  |
| Content           | WordPress REST, Realizacje plugin, safe text rendering and demo fallback     |
| Embedding         | Vanilla JS Shadow DOM booking widget                                         |
| Support           | Local/rules FAQ with slot suggestion                                         |
| Offline           | Service Worker precache and IndexedDB idempotent booking queue               |
| Delivery          | Docker Compose, CI, unit/integration/e2e checks, static previews, source ZIP |

## External inputs and verification limits

- The user's Blender asset was not supplied. The included, reproducible GLB is original procedural demo geometry.
- A real public deployment needs hosting/account configuration. No deployed URL is invented.
- A Stripe-hosted test payment requires user-owned test credentials; an unpaid local demo order is explicitly distinct.
- Full-stack container runtime checks may depend on available disk and Docker storage driver. See VALIDATION.md for actual results.
- Lighthouse scores are measurements for the recorded local build and test conditions, not a universal hosting guarantee.

## Integrity rules

API failure does not turn a real write into a successful demo write. Server prices and permissions are authoritative. Offline real requests are tied to the originating user and use UUID idempotency keys. Availability is rechecked online; conflicts remain visible. Database reports use joins, aggregates and cumulative window functions.
