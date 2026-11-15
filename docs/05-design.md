# Design

- Palette (tokens in `src/app/globals.css`): palm green `#1f5f3a` primary, sand `#e9dcc0`, clay `#b5652e`, near-black `#1b1b18` on off-white `#faf7f0`.
- 48px minimum tap targets (`min-h-12` buttons/inputs). Native `<select>` everywhere.
- Fonts: Noto Sans + Noto Sans Sinhala + Noto Sans Tamil, self-hosted with `next/font/local` (`src/fonts/`, one variable file per script, unicode-range; only Latin is preloaded). Use `font-ui` for native-script labels shown on every page (e.g. the language switcher) so other scripts' fonts are not downloaded.
- Animation budget: fade-and-rise, map hover, how-it-works toggle. `prefers-reduced-motion` respected globally.
- Mobile: sticky bottom bar with Post a job / Find work.
- Server Components by default; client islands only for forms, the language switcher, map hover, realtime bid count.
