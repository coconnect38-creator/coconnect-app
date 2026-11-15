import localFont from "next/font/local";

/*
 * Self-hosted Noto Sans subsets (SIL Open Font License 1.1, from Google Fonts).
 * next/font/google emits @font-face rules for every subset of a family, and
 * the zero-width joiner Sinhala uses in conjuncts (e.g. ශ්‍රී) falls inside the
 * Devanagari and Latin ranges, so Sinhala pages pulled ~130 KB of fonts they
 * never drew. Here each family has exactly one file with Google's own range.
 * All three are variable fonts (weights 100–900).
 */

export const latin = localFont({
  src: "./noto-sans-latin-var.woff2",
  weight: "100 900",
  variable: "--font-latin",
  display: "swap",
  declarations: [
    {
      prop: "unicode-range",
      value: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    },
  ],
});

// Browsers fetch these only when Sinhala/Tamil glyphs are on the page (unicode-range).
export const sinhala = localFont({
  src: "./noto-sans-sinhala-var.woff2",
  weight: "100 900",
  variable: "--font-sinhala",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0964-0965,U+0D81-0DF4,U+1CF2,U+200C-200D,U+25CC,U+111E1-111F4" }],
});

export const tamil = localFont({
  src: "./noto-sans-tamil-var.woff2",
  weight: "100 900",
  variable: "--font-tamil",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0964-0965,U+0B82-0BFA,U+200C-200D,U+20B9,U+25CC" }],
});
