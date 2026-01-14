# AGENTS.md

## OVERVIEW

Radix-based UI primitives and Recharts wrappers. Focus on composable slots and IME-safe inputs.

## WHERE TO LOOK

- `dialog.tsx`: DialogCompositionContext and IME-aware Escape handling.
- `input.tsx`, `textarea.tsx`: `useComposition` + dialog composition sync.
- `chart.tsx`: ChartContainer + ChartStyle CSS variable injection.
- `button.tsx`, `card.tsx`, `table.tsx`: core primitives.

## CONVENTIONS

- Filenames are lowercase/kebab-case in `ui/`.
- Add `data-slot` attributes on primitive roots.
- Use `cn` from `@/lib/utils` for class merging.
- Inputs wire `onCompositionStart/End` through `useComposition`.
- Dialog content guards Escape when IME composing.
- ChartContainer injects `--color-*` variables via `ChartStyle`.
- `ChartConfig` uses either `color` or theme map (mutually exclusive).

## ANTI-PATTERNS

- Removing `data-slot` attributes from primitives.
- Calling `useChart` outside `ChartContainer`.
- Bypassing dialog composition sync for IME-sensitive inputs.
