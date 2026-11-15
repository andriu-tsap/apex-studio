# Integrated distribution validation

Recorded on 2026-11-14. This document describes actual checks, not assumed deployment success.

| Check                                               | Result                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint / TypeScript syntax and no-explicit-any rule | Passed                                                                                                                                            |
| Strict TypeScript and Angular template compilation  | Passed                                                                                                                                            |
| Next.js production export                           | Passed, 27 generated static routes, Next.js 15.5.29                                                                                               |
| Angular production build                            | Passed, Angular 20; ExcelJS is loaded lazily                                                                                                      |
| Web unit checks                                     | 5 passed                                                                                                                                          |
| API unit and real PostgreSQL integration checks     | 10 passed against migrated PostgreSQL 16                                                                                                          |
| Python pytest                                       | 5 passed                                                                                                                                          |
| Playwright Chromium                                 | 6 passed, including the scenarios listed below                                                                                                    |
| Controlled price monitor CLI                        | Snapshot JSON and numeric XLSX generated successfully                                                                                             |
| WordPress plugin PHP syntax                         | Passed using PHP 8.3                                                                                                                              |
| Docker Compose configuration                        | Passed                                                                                                                                            |
| Docker API image                                    | Built successfully, including filtered production dependency install and Prisma generation                                                        |
| Full Compose runtime                                | Not verified end-to-end: the managed 8 GB environment with Docker VFS exhausted its disk quota when starting a container from the built API image |
| Stripe-hosted payment                               | Not executed: no user-owned Stripe test credentials were supplied. Validation, authoritative pricing and missing-key behavior were tested         |
| Public hosting                                      | Not performed; this delivery is a source ZIP with local static previews                                                                           |

## Mobile Lighthouse

Lighthouse **12.8.2**, default mobile emulation, Chromium, local gzip-enabled static preview, English home route. Mobile starts with the lightweight SVG and enables 3D on user request; this is the normal product behavior for low-power/mobile devices.

| Performance | Accessibility | Best practices | SEO     |
| ----------- | ------------- | -------------- | ------- |
| **94**      | **100**       | **96**         | **100** |

Full evidence: `docs/lighthouse-mobile.json`. The same recorded scores appear in Under the hood. `scripts/check-lighthouse.mjs` enforces 90 in every category, and CI includes the actual Lighthouse run. Hosting, hardware and network conditions can change results.

## Browser scenarios that passed

1. Track configuration transfers into the booking form; validated demo submission produces confirmation and email preview.
2. Cart survives reload; an explicitly unpaid demo order appears in the demo account.
3. Angular demo admin enters the calendar, filters customers, respects manager restrictions and downloads a real XLSX.
4. Keyboard command palette works and the page fits a 360 px viewport without horizontal overflow.
5. A cached booking page opens offline, queues a request, downloads a PDF and confirms the demo request after reconnection.
6. The included GLB loads, PNG export produces a valid image and actual desktop/mobile screenshots are captured.

## API integration checks that passed

- Staff endpoints reject unauthenticated and customer requests; untrusted origins cannot mutate sessions.
- Refresh token rotation accepts one use and rejects replay.
- Repeating a booking UUID returns the original booking; another request cannot reserve the same active slot.
- A customer cannot download another customer's estimate.
- SQL report executes JOIN, aggregate and cumulative window operations and returns numeric values.
- Unknown catalog IDs are rejected; Stripe without test configuration returns an explicit unavailable result.
- The Python-backed estimate matches the shared local calculation.

## Explicit external-input limits

The user's Blender model was not supplied. `gt-class-demo.glb` is original procedural demo geometry (~236 KB), accompanied by its reproducible generator; it is not presented as the user's Blender work. A production URL, real payment credentials and full hosted WordPress/payment verification require the corresponding external accounts and deployment configuration.

The build emits a nonfatal ExcelJS CommonJS optimisation warning and notes that the custom ESLint config does not use Next's optional plugin. Neither was treated as a passed external integration. Python's test client emits a dependency deprecation warning; all tests pass.
