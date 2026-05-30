# WordPress → Static Migration Report

**Site:** Healthy Community Lifespaces (www.hclwellness.org)
**Source:** WordPress (Twenty Twenty-Three block theme) at https://hclwellness.org
**Target:** this static Next.js / GitHub Pages repository
**Method:** content pulled via the public WordPress REST API (`/wp-json/wp/v2/*`); see `migration/`.

## Goal

Become **100% independent of the WordPress host** — every page, image, document,
and localizable embedded asset pulled into the repo — and document anything that
genuinely cannot be localized, with the reason.

## Result

The built site (`out/`) loads **zero** resources from `hclwellness.org/wp-*` and
**zero external images**. Verified by scanning the build:

```
src/href to https://hclwellness.org/wp-…   →  0
external <img> loads                       →  0
```

The only `hclwellness.org` strings remaining in the build are the site's **own**
canonical / Open-Graph / sitemap / CNAME URLs, which resolve to this static site
after DNS cut-over.

## What was localized

| Category                                                  | Count | Location                                           |
| --------------------------------------------------------- | ----: | -------------------------------------------------- |
| Pages (incl. front page)                                  |    55 | `src/data/wordpress/content.json` → `/[slug]`, `/` |
| Blog/news articles surfaced                               |    29 | `/blog` index                                      |
| WordPress posts                                           |     2 | `/blog/<slug>`                                     |
| Media & file assets                                       |   289 | `public/wp-content/…`, `public/external/…`         |
| ↳ images                                                  |  ~239 | `public/wp-content/uploads/…`                      |
| ↳ PDFs                                                    |    42 |                                                    |
| ↳ Word docs (.docx)                                       |     6 |                                                    |
| ↳ videos (.mp4)                                           |     2 |                                                    |
| Theme fonts (DM Sans, Inter, IBM Plex Mono, Source Serif) |    10 | `public/wp-content/themes/…`                       |
| Captured theme CSS                                        |     1 | `src/styles/wordpress.css`                         |

Total localized media ≈ **142 MB**. Every asset URL in the migrated content was
rewritten to a root-relative local path; every internal link was rewired to a
local route.

## Could NOT be localized — and why

### 1. External embedded images (replaced with local equivalents)

| Original                                                                      | Pages         | Why unrecoverable                                                                                | Local replacement                                                        |
| ----------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `block21.oitemplates.org/.../call-1.png`, `email-1.png`, `location-1.png`     | `/contact-us` | Source template site returns `503` / TLS-certificate errors — effectively offline                | Local SVG icons `public/external/icons/{phone,email,location}.svg`       |
| 3 × `media.licdn.com/dms/image/…` (LinkedIn profile photo + 2 article images) | 2 articles    | LinkedIn CDN returns `403 Forbidden` (anti-hotlinking); the profile-photo token expired Feb 2025 | Local placeholder `public/external/placeholder.svg` (alt text preserved) |

### 2. Images already broken on the live WordPress site (404 at source)

These are referenced by content but return `404` from WordPress today, so there is
nothing to localize. Listed for the record:

```
/wp-content/uploads/2024/01/Beets.jpg
/wp-content/uploads/2024/01/Noah.jpg
/wp-content/uploads/2024/01/cauliflower.jpg
/wp-content/uploads/2024/09/halloween2-1.jpg
/wp-content/uploads/2024/12/image-2.png
/wp-content/uploads/2024/12/vegs.png
/wp-content/uploads/2025/05/image-11-1.jpeg
```

### 3. Third-party functional services (by nature not self-hostable)

| Service                 | How it appears                                                                         | Why it stays external                                                |
| ----------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Zeffy** donation form | "Donate" links / form URL                                                              | Payment processing must run on the provider; cannot be a static file |
| **YouTube** videos      | Outbound `watch?v=…` links (the WP oEmbed cards were de-embedded; no iframe is loaded) | Video hosting/streaming cannot be localized                          |
| **Google Tag Manager**  | Analytics script (the only external script the site loads)                             | Analytics service; remove by deleting the GTM component if undesired |

### 4. External citation hyperlinks (intentionally preserved)

The articles cite **93 outbound links across ~70 third-party domains** (CDC, NCBI,
NIH, FHWA, university and news sources, etc.). These are editorial references to
authoritative external sources — they are **not** mirrored, because copying those
organizations' pages into this repo would be wrong (content ownership, accuracy,
and licensing). They remain as normal outbound `<a href>` links. Full list:
`migration/external-report.json`.

## Reproducibility

The entire migration is scripted and re-runnable from the captured REST data
without touching the live site:

```bash
python3 migration/harvest.py          # pull all content from the WP REST API
python3 migration/download_assets.py  # localize every referenced asset
python3 migration/capture_css.py      # bundle the theme CSS + fonts
python3 migration/transform.py        # emit src/data/wordpress/content.json
```

Artifacts: `migration/asset-map.json` (URL → local path for every asset),
`migration/external-report.json` (outbound links & embeds not mirrored),
`migration/link-report.json` (6 internal links that 404 on the source — WordPress
comment-thread / admin URLs and one page that no longer exists).

## Post-migration visual review (Playwright)

`migration/visual_review.mjs` drove Chromium over the built site (14 key pages,
desktop + mobile). Findings and fixes:

- **All pages 200, zero broken images;** header/footer/WordPress CSS render
  faithfully; layout is responsive.
- **Contest & PDF pages:** WordPress embeds PDFs via `<object>`, which the CSP's
  `object-src 'none'` blocked. Relaxed to `object-src 'self'` (layout.tsx +
  `public/_headers`) so local PDFs embed.
- **GiveWP donation pages** (`/donor-dashboard`, `/donation-confirmation`) showed
  a perpetual loading spinner — they require the WordPress backend. Replaced with
  static content (a Donate link / thank-you message). `/donation-failed` already
  had usable static copy.

## Known follow-ups

- **Link check (CI): green.** Enabling `trailingSlash: true` makes internal
  links resolve as clean directory URLs; the checker validates internal links
  (external citation hosts bot-block automated checkers and are skipped).
- **Blog index** styling is intentionally minimal (dated text cards) — optional
  visual polish if desired.
