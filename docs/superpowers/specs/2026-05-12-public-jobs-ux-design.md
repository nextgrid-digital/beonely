# Public jobs UX design (implemented)

**Date:** 2026-05-12  
**Scope:** Home (`/`), jobs list (`/jobs/`), job detail (`/jobs/$slug`), shared chrome.

## Goals

1. **Shell consistency** — No horizontal or vertical “jump” when moving between home and jobs: same header width, nav items, footer, and main column width where applicable.
2. **Loading** — Skeleton placeholders instead of a lone spinner or plain text for job lists.
3. **Empty filters** — When filters are active and no rows match, offer a clear path to reset filters.
4. **Detail page** — Reading column stays `max-w-3xl`; outer shell aligns with `max-w-5xl`. External apply remains visible while scrolling long JDs (`sticky` on `sm+`).
5. **Accessibility** — Skip link to `#main-content`; one primary `<main id="main-content">` per public page.

## Architecture

- [`../../../src/features/jobs/public-site-layout.tsx`](../../../src/features/jobs/public-site-layout.tsx) — `PublicSiteHeader` (skip link, `max-w-5xl`, Jobs / Sign in / Post a job), `PublicSiteFooter`. Jobs link search: from active `/jobs/` match when present, else optional `jobsSearchFallback` from home.
- [`../../../src/features/jobs/public-job-list-skeleton.tsx`](../../../src/features/jobs/public-job-list-skeleton.tsx) — Card-shaped skeleton grid.
- [`../../../src/features/jobs/published-jobs-filters.tsx`](../../../src/features/jobs/published-jobs-filters.tsx) — Exports `hasActivePublishedJobFilters`, `clearPublishedJobSearchPreserveSetup` for empty-state actions.

## Routes

- [`../../../src/routes/index.tsx`](../../../src/routes/index.tsx) — Uses shared header/footer; skeleton list; empty state with clear filters when applicable.
- [`../../../src/routes/jobs/route.tsx`](../../../src/routes/jobs/route.tsx) — Shell wraps `Outlet` with header + footer.
- [`../../../src/routes/jobs/index.tsx`](../../../src/routes/jobs/index.tsx) — `max-w-5xl`, `py-16`, skeletons, empty state.
- [`../../../src/routes/jobs/$slug.tsx`](../../../src/routes/jobs/$slug.tsx) — Outer `max-w-5xl`, inner `max-w-3xl`; loading skeleton; sticky apply column on `sm+`.

## Deferred (optional follow-ups)

- Card-level “Read more” for long excerpts on list cards.
- OG image for job detail.
- Further motion/reduced-motion preferences.

## Self-review

- No TBD sections; scope is public jobs only (not auth shell or dashboard).
- `clearPublishedJobSearchPreserveSetup` preserves `setup` on home for Supabase onboarding URL state.
