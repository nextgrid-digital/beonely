# ReadCV Template — design system (Beonely app)

## Context and goals

**Intent:** Token-driven UI for a dashboard web app that stays consistent, meets **WCAG 2.2 AA**, and ships quickly using shared foundations and shadcn primitives.

- **Product surface:** authenticated dashboard and public job flows in this repository.
- **Reference:** [ReadCV Template Figma site](https://mince-sign-gig.figma.site/) (visual reference; implementation uses CSS variables mapped below).
- **Cursor agents:** For Tailwind / shadcn UI work, follow **[`.cursor/skills/readcv-beonely-ui/SKILL.md`](../.cursor/skills/readcv-beonely-ui/SKILL.md)** after this doc and [`docs/skills.md`](skills.md) (checklist, scope order, motion and focus rules).

## Mission

Create implementation-ready, token-driven UI guidance optimized for consistency, accessibility, and fast delivery across the dashboard web app.

## Brand (reference)

- **Template name:** ReadCV Template (design doc); **live product:** Beonely.
- **Audience:** authenticated users and operators, plus public job seekers.

## Style foundations (source values and resolved semantics)

### Typography

| Token | Value | Implementation |
|-------|--------|----------------|
| `font.family.primary` | Inter Regular | `--font-inter`; `body` uses Inter-first stack via Tailwind `font-sans`. |
| `font.family.stack` | Inter, sans-serif | `@theme` / `html` class from `FontProvider` (`font-inter` default). |
| `font.size.base` | 14px | `body` `font-size: 0.875rem` (`--font-size-readcv-sm`). |
| `font.weight.base` | 400 | `body` `font-weight: 400`. |
| `font.lineHeight.base` | 25.2px (on 14px) | `--leading-readcv-base: 1.8`. |
| `font.size.xs` | 12px | `--font-size-readcv-xs` → `text-xs`. |
| `font.size.sm` | 14px | `--font-size-readcv-sm` (default body). |
| `font.size.md` | 16px | `--font-size-readcv-md` → `text-base`. |
| `font.size.lg` | 20px | `--font-size-readcv-lg` → `text-xl` mapping in doc; use `text-xl` (1.25rem) for headings where appropriate. |

### Color (Figma extraction corrected for contrast)

Raw extraction mixed roles (e.g. dark `#111` “secondary” text on `#000` surface is unusable). **Resolved semantics:**

| Semantic role | Light (`:root`) | Dark (`.dark`) | CSS variable |
|---------------|-----------------|----------------|--------------|
| Surface base | Near-white | Near-black | `--background` |
| Text primary | `#111111` | `#ffffff` | `--foreground` |
| Text muted | `#6d6d6d` | Light gray (~4.5:1 on black) | `--muted-foreground` |
| Text on primary button | Light on dark btn | Dark on light btn | `--primary-foreground` |
| Elevated surface | Card / popover | Slightly lifted from base | `--card`, `--popover` |
| Border / input | Subtle neutral | Low-contrast white alpha | `--border`, `--input` |
| Focus ring | Visible on both themes | | `--ring` |

Implementation uses **OKLCH** in [`src/styles/theme.css`](../src/styles/theme.css) tuned to these roles. Teams **must** not use raw hex in new components; use `bg-background`, `text-foreground`, `text-muted-foreground`, etc.

### Spacing

Figma reported `space.1=0.69px` (unusable as a global rhythm). **Implementation:** use Tailwind spacing scale and shadcn defaults; treat `space.1` as “minimal hairline” only if a dedicated token is added later.

### Radius and motion (manual)

| Token | Value |
|-------|--------|
| `--radius-readcv` | Alias of `--radius` (0.625rem) unless product overrides. |
| `--motion-duration-fast` | 150ms |
| `--motion-duration-base` | 200ms |
| `--motion-duration-slow` | 300ms |

Interactive transitions **should** use these for enter/exit where custom CSS is written.

## Accessibility

- **Target:** WCAG 2.2 AA.
- **Keyboard-first:** all controls reachable in logical order; no keyboard traps in modals except intentional focus scope.
- **Focus-visible:** every focusable control **must** show a visible focus indicator (`ring` / `focus-visible:ring-*`); never `outline-none` without a replacement.
- **Contrast:** normal text **must** meet 4.5:1 against its surface; large text 3:1; UI components and graphics where applicable per WCAG.

## Writing tone

Concise, confident, implementation-focused.

## Rules: Do

- Use **semantic tokens** (Tailwind mapped to CSS variables), not raw hex, in component guidance and code.
- Every interactive component **must** define states: default, hover, focus-visible, active, disabled; data-driven UI **should** add loading and error.
- Document responsive behavior and edge cases (empty, overflow, long labels) for new patterns.
- Document keyboard, pointer, and touch behavior for composite widgets.

## Rules: Don't

- Do not ship low-contrast text or invisible focus for keyboard users.
- Do not introduce one-off spacing or typography exceptions without a token ADR.
- Do not use ambiguous control labels (“Click here”, “Submit” without context).

## Guideline authoring workflow

1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required output structure (for new feature specs)

- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component rule expectations

- Keyboard, pointer, and touch behavior documented.
- Spacing and typography token requirements stated.
- Long content, overflow, and empty states covered.
- Known density notes (e.g. global nav): treat as product metrics, refresh when IA changes.

## Quality gates

- Every non-negotiable rule **must** use “must”.
- Every recommendation **should** use “should”.
- Every accessibility rule **must** be testable in implementation (contrast ratio, focus ring presence, axe rules where applicable).
- Teams **should** prefer system consistency over local visual exceptions.

---

## Token mapping table (design name → code)

| Design semantic | Tailwind / variable |
|-----------------|---------------------|
| `surface.base` | `bg-background` |
| `surface.elevated` | `bg-card`, `bg-popover` |
| `text.primary` | `text-foreground` |
| `text.muted` | `text-muted-foreground` |
| `text.inverse` (on inverted chip) | `text-primary-foreground` on `bg-primary` |
| `border.default` | `border-border` |
| `focus.ring` | `ring-ring`, `focus-visible:ring-2` |
| `destructive` | `text-destructive`, `bg-destructive` (as per shadcn) |

---

## QA checklist (run before merge for UI-heavy PRs)

- [ ] **Keyboard:** Tab through new UI; order matches visual order; Esc closes dialogs/menus.
- [ ] **Focus-visible:** Every interactive element shows a visible focus state.
- [ ] **Contrast:** `text-foreground` / `text-muted-foreground` on `bg-background` and on `bg-card` in both light and `.dark`.
- [ ] **Touch:** Hit targets at least ~44px where primary actions are touch-first (mobile nav).
- [ ] **Loading / error:** Async views show skeleton or spinner; failures show inline alert, not silent blank.
- [ ] **Overflow:** Long user names, emails, and job titles truncate or wrap without breaking layout.
- [ ] **Motion:** Respects `prefers-reduced-motion` where custom animation is added.

## App shell alignment

These entry points **should** use semantic surfaces and readable type on top of global `body` styles:

- [`src/features/jobs/public-site-layout.tsx`](../src/features/jobs/public-site-layout.tsx) — public header/footer.
- [`src/components/layout/authenticated-layout.tsx`](../src/components/layout/authenticated-layout.tsx) — authenticated chrome.
- [`src/components/layout/header.tsx`](../src/components/layout/header.tsx) — secondary app header row.
- [`src/components/layout/main.tsx`](../src/components/layout/main.tsx) — primary scrollable content column.

Run the **QA checklist** above after changing any of these.

---

## Anti-patterns

- Hard-coded `#fff` / `#000` in JSX or arbitrary Tailwind hex when semantic tokens exist.
- Removing focus outline on links styled as buttons.
- `font-size` below 14px for body copy (except legal footnotes with enhanced contrast).

## Migration notes

- Legacy template pages (tasks, chats, apps) **should** adopt tokens opportunistically when touched; do not block shipping on full-template refit.

## Extraction diagnostics

Audience and product surface were inferred for this monorepo; update this doc if the product split changes.
