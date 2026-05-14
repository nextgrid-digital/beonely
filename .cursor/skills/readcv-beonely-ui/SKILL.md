---
name: readcv-beonely-ui
description: >
  Apply ReadCV / Beonely token-first Tailwind and shadcn UI rules for dashboards: semantic
  colors (bg-background, text-foreground), focus-visible rings, motion tokens, WCAG 2.2 AA,
  typography (14px base, Inter). Use when editing Tailwind, shadcn components, layout,
  forms, tables, accessibility, design tokens, ReadCV, or Beonely UI.
---

## When to use

Use this skill for any task that adds or changes **UI** in this repo: Tailwind classes, `src/components/ui/*`, layout shells, forms, data tables, dialogs, or visual accessibility.

## Before writing code

1. **Read** (Read tool) the canonical docs:
   - [`docs/design.md`](../../../docs/design.md) — tokens, contrast roles, QA checklist, anti-patterns.
   - [`docs/skills.md`](../../../docs/skills.md) — implementation habits and quick checks.
2. **Read** [`src/styles/theme.css`](../../../src/styles/theme.css) if you add or rename CSS variables.

## Non-negotiables (summary)

- **Semantic Tailwind only** for theme surfaces and text: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, `bg-card`, etc. Do **not** introduce raw hex or `gray-*` for theme colors in new code.
- **Focus-visible:** never `outline-none` / `outline-hidden` without `focus-visible:ring-*` (or equivalent visible focus).
- **Typography:** default body is 14px / line-height 1.8 (`docs/design.md`); use `text-xs` for meta only; keep heading steps consistent.
- **Motion:** prefer `duration-200` aligned with `--motion-duration-base`; add **`motion-reduce:transition-none`** (or `motion-reduce:animate-none` on enter/exit animations) on non-trivial transitions.
- **Interactive states:** default, hover, active, disabled; async UI should add loading + error (`docs/skills.md`).

## Apply changes in this order

1. **`src/components/ui/*`** — shadcn primitives; keep them the source of truth for tokens and a11y.
2. **Layout shells** listed in `docs/design.md` (e.g. `public-site-layout`, `authenticated-layout`, `Header`, `Main`).
3. **`src/features/**` and routes** — only within the scope of the user’s task; do not refit the whole app unless explicitly asked.

## Per-file checklist (when you touch a component)

- [ ] Grep file for `#[0-9a-fA-F]{3,8}` and `bg-[#` / `text-[#` arbitrary colors — replace with semantic tokens where possible.
- [ ] Search `outline-none` / `outline-hidden` — ensure pairing with `focus-visible:ring-*` or `focus-visible:outline-*`.
- [ ] Replace decorative `gray-*` with `muted-foreground` / `border` / `muted` as appropriate.
- [ ] On `transition-*` / `animate-*` (except trivial opacity on focus ring): add **`motion-reduce:transition-none`** or equivalent reduced-motion handling.
- [ ] Contrast: text on `bg-background` and `bg-card` in both light and `.dark`.

## Verification

After edits: `pnpm run build`; run `pnpm run lint` if TSX changed. For palette-sensitive work, re-read the **QA checklist** in `docs/design.md`.

## Out of scope

Do not rewrite every feature page in one pass unless the user explicitly requests a full audit. Prefer incremental alignment when files are already being edited.
