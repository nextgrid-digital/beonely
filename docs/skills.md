# UI implementation skill — ReadCV / Beonely design system

Use this file together with [`docs/design.md`](design.md) for any UI work (new pages, shadcn components, layout, forms, tables).

## Before you ship

1. Read the **Token mapping** and **Rules: Do / Don't** in `docs/design.md`.
2. Prefer **semantic Tailwind** tied to theme variables: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `ring-ring`, not raw hex or `gray-500` unless bridging legacy code.
3. Use **shadcn primitives** under [`src/components/ui/`](../src/components/ui/) instead of one-off divs for buttons, inputs, dialogs, dropdowns, and tables.

## Typography and density

- Default body is **14px / line-height 1.8** (see `src/styles/index.css`). Use `text-sm` when you need explicit 14px in a subtree; use `text-xs` (12px) for meta only; ensure contrast still passes.
- Headings **should** step through `text-base` → `text-lg` → `text-xl` / `text-2xl` consistently within a screen.

## Interactive states

For every new interactive control you **must** cover:

- Default, hover, active, disabled.
- **Focus-visible** with ring (shadcn `Button` / `Link` patterns).
- If async: **loading** (spinner, `aria-busy`) and **error** (message, `role="alert"` or `Alert`).

Document non-obvious behavior in the PR description.

## Motion

- Prefer `transition-colors` / `duration-200` aligned with `--motion-duration-base` where custom CSS is used.
- Respect **`prefers-reduced-motion`** for non-trivial animation.

## Accessibility quick checks

- Tab order, focus trap in dialogs, Escape to close.
- Contrast on `bg-background` and `bg-card` in **light and dark** (`html.dark`).
- Images: meaningful `alt`; decorative `alt=""`.

## When unsure

- Match existing patterns in [`public-site-layout.tsx`](../src/features/jobs/public-site-layout.tsx) (global header) and [`authenticated-layout.tsx`](../src/components/layout/authenticated-layout.tsx) (app shell).
- If a new token is truly needed, add it to `src/styles/theme.css` and **document it** in `docs/design.md` in the same PR.
