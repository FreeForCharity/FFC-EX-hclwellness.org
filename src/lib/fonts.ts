import localFont from 'next/font/local'

// The fonts are SELF-HOSTED (src/app/fonts/<family>/, latin subset, normal
// style, each directory carrying its OFL licence). They used to be declared
// with `next/font/google`, which downloads them from Google during
// `next build` -- so the build failed whenever that fetch did, and a
// contributor without reliable internet could not build the site at all.
// A build must never depend on Google.
//
// NOTE: this repo has no `scripts/check-drift.mjs`, so nothing in CI
// mechanically blocks a future `next/font/google` import here. (An earlier
// version of this comment claimed such a guard existed -- it does not, and the
// claim was copied from a newer template.) Where this repo ships
// `__tests__/lib/fonts.test.ts`, that test asserts this file imports
// next/font/local and contains no real next/font/google import. Adopting the
// template's full drift check is tracked separately; it carries many unrelated
// rules this repo may not pass yet.
//
// Where a variable build exists the family is ONE woff2 covering the whole
// weight range -- the same single file per family the Google loader served.
// Lato has no variable build, so it keeps one static file per weight. One
// file per weight for the variable families would add preloaded requests and
// cost Lighthouse performance (FreeForCharity/FFC-IN-Footer_Only_Template#164).
//
// The declared `weight` is each font's ACTUAL variable range, taken from the
// @fontsource metadata rather than copied between families -- the ranges are
// not the same (Cinzel starts at 400, not 300), and declaring a range a font
// does not cover is a real bug.
//
// next/font/local resolves `path` relative to THIS file, and every argument
// must be a literal (the compiler reads it statically), so the sources are
// spelled out rather than generated.

export const openSans = localFont({
  src: [
    {
      path: '../app/fonts/open-sans/open-sans-latin-wght-normal.woff2',
      weight: '300 800',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-open-sans',
  adjustFontFallback: 'Arial',
})

export const lato = localFont({
  src: [
    { path: '../app/fonts/lato/lato-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../app/fonts/lato/lato-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lato',
  adjustFontFallback: 'Arial',
})

export const raleway = localFont({
  src: [
    {
      path: '../app/fonts/raleway/raleway-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-raleway',
  adjustFontFallback: 'Arial',
})

export const faustina = localFont({
  src: [
    {
      path: '../app/fonts/faustina/faustina-latin-wght-normal.woff2',
      weight: '300 800',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-faustina',
  adjustFontFallback: 'Times New Roman',
})

export const cantataOne = localFont({
  src: [
    {
      path: '../app/fonts/cantata-one/cantata-one-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-cantata-one',
  adjustFontFallback: 'Times New Roman',
})

export const faunaOne = localFont({
  src: [
    {
      path: '../app/fonts/fauna-one/fauna-one-latin-400-normal.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-fauna-one',
  adjustFontFallback: 'Times New Roman',
})

export const montserrat = localFont({
  src: [
    {
      path: '../app/fonts/montserrat/montserrat-latin-wght-normal.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-montserrat',
  adjustFontFallback: 'Arial',
})

export const cinzel = localFont({
  src: [
    {
      path: '../app/fonts/cinzel/cinzel-latin-wght-normal.woff2',
      weight: '400 900',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-cinzel',
  adjustFontFallback: 'Times New Roman',
})
