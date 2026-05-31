# Session Handoff — HCL static site (footer/header polish + ongoing work)

**Date:** 2026-05-31
**Branch this doc lives on:** `claude/footer-header-mobile-fixes`
**Live review URL:** https://freeforcharity.github.io/FFC-EX-hclwellness.org/
**Repo:** `FreeForCharity/FFC-EX-hclwellness.org` (default branch `main`)

> Purpose: let a fresh session pick up exactly where this one left off, with full
> context. Read this top-to-bottom first.

---

## 0. URGENT — current branch is in a BROKEN, half-fixed state

**PR #58** (`claude/footer-header-mobile-fixes`) is **failing CI** and must NOT be
merged as-is. Here's the precise state:

### What's COMMITTED & pushed (commit `5a3422b`, what CI sees) — BROKEN

- `src/components/header/index.tsx`: points the logo at
  `/wp-content/uploads/2024/01/cropped-Healthy-Community-Lifespaces-2.png`
  **which DOES NOT EXIST** in `public/`. This breaks the `<img>` on **every page**
  → **Link check fails (48 broken)** and **Test and Build fails** (a header unit
  test). This was my mistake.
- `src/components/footer/index.tsx`: `text-gray-400` → `text-gray-200` on Quick
  Links + contact email. **This change is correct but INSUFFICIENT on its own**
  (see §1 — a global CSS rule overrides it).

### What's in the WORKING TREE (uncommitted, the actual fix) — GOOD, not yet committed

- `src/components/header/index.tsx`: **reverted to match `origin/main`** (known-good
  `HCL1.png` logo). i.e. header change abandoned.
- `src/app/globals.css`: **added an unlayered `footer a` color override** (the real
  footer-readability fix — see §1).
- `src/components/footer/index.tsx`: still has the `text-gray-200` change (kept).

### To get this branch GREEN, the next session should:

1. `cd /home/user/FFC-EX-hclwellness.org && git status` — confirm working-tree has
   `globals.css` + `header/index.tsx` modified.
2. Verify header matches main: `git diff origin/main -- src/components/header/index.tsx`
   should be **empty**.
3. **Empirically verify the footer fix works** (this is the step I had not yet
   completed): build, `npx serve out -l 3220`, drive Playwright, and confirm a
   `footer nav a` computes to a **light** color (`rgb(229,231,235)`), NOT black.
4. Run the FULL gate (see §4) — **including `npm run check-links` and `npm run build`**
   (the pre-commit hook does NOT run those; that's how the broken logo slipped through).
5. Commit (this will be a 2nd commit on the branch fixing `5a3422b`) and push.
6. Address PR #58's resolved Copilot comment (the missing-asset one) — it's fixed by
   the header revert.

---

## 1. KEY LEARNING: the footer (and any chrome) link-color override

**Symptom:** footer Quick Links / contact email render **near-black on the dark
footer** (unreadable) — see the user's screenshot — **even though** the component
class is `text-gray-200`/`text-gray-400`.

**Root cause:** the captured WordPress theme CSS (`src/styles/content.css:1796`) has:

```css
a:where(:not(.wp-element-button)) {
  color: var(--wp--preset--color--contrast);
} /* ≈ #000 */
```

This rule is **unlayered**. `globals.css` does `@import 'tailwindcss'`, so Tailwind's
`text-*` utilities live in a **`@layer`**. Per the cascade, **unlayered rules beat
layered rules regardless of specificity** → the theme's `a{color:#000}` wins over
`text-gray-200`. The footer is rendered **outside** `<main>`/`.wp-content`, but this
`a` selector is global, so it still applies.

**Fix (in working tree, globals.css):** add an **unlayered** override:

```css
footer a:where(:not(.wp-element-button)) {
  color: #e5e7eb;
}
footer a:where(:not(.wp-element-button)):hover {
  color: #4ade80;
}
```

**STILL TODO: prove this actually wins** by measuring computed color in a browser
(I added it but had not yet verified before the session ended). If it doesn't win,
escalate specificity or add `!important`.

> General principle for this repo: **Tailwind classes on chrome (header/footer/
> components) can be silently overridden by the unlayered captured theme CSS for
> bare-element selectors (`a`, `h1`…).** When a Tailwind color/typography class
> "doesn't take", suspect `content.css`. Fix with an unlayered rule in `globals.css`.

---

## 2. The original task list (from issue #54) and where each stands

The user asked, in order: **(item 2)** header logo consolidation, **(item 3)**
interior-page mobile audit, **footer readability** (from a screenshot), and
**verify all downloadable files work on live GitHub Pages**.

| Task                                   | Status                                                                                                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Footer readability**                 | Fix identified + applied in working tree (§1). **Needs browser verification + commit.**                                                                                                                                                           |
| **#54 item 3 — interior mobile audit** | ✅ DONE & verified: all 47 routes at 390px → **0 horizontal overflow**. No code change needed.                                                                                                                                                    |
| **Downloads work on live GH Pages**    | ✅ DONE & verified: enumerated all downloadable refs; **25 site-local files (PDF/docx/mp4) → all HTTP 200** on live. 2 are external (CDC: `health.pa.gov/.../SHIP_2023-2028.pdf`, `pas-meeting.org/.../PAS-...pdf`) — intentionally not mirrored. |
| **#54 item 2 — header logo**           | ❌ **ABANDONED / reverted.** I do NOT have a confident grasp of the header logo assets — see §3. Leave header as-is (main's `HCL1.png`); treat as a separate follow-up.                                                                           |

### Header logo facts learned (for whoever retries item 2)

- The header currently uses `public/wp-content/uploads/2021/08/HCL1.png`
  (**791×532 landscape**). Viewing `HCL1-400x269.png` shows it's a **"newspaper"
  style graphic** ("Healthy Community" masthead + date line + a blog-article-contest
  layout) — NOT a clean logo. It renders shrunk to ~h-12 beside a text wordmark.
- The header also has a `<span>` text wordmark "Healthy Community / Lifespaces"
  (hidden below `sm`).
- I tried switching to `cropped-Healthy-Community-Lifespaces-2.png` — **that file
  does not exist** (my error). The ONLY HCL logo-ish assets in `public/` are the
  `HCL1*.png` set. There is **no separate round emblem / clean wordmark asset** in
  the repo.
- **Recommendation:** before changing the header, get a proper HCL logo asset from
  the org (or extract/crop one), commit it to `public/`, THEN update the header.
  Don't reference assets that aren't in the repo. The live WordPress header logo
  source could be re-harvested if needed.

---

## 3. Hard-won process lessons (avoid repeating my mistakes)

1. **The pre-commit hook does NOT run `check-links` or `build`.** It runs format +
   drift + (some) checks. A missing image asset passes pre-commit but fails CI
   (Link check + Test and Build). **Always run `npm run build` AND
   `npm run check-links` locally before committing anything that touches asset
   paths or links.**
2. **Never reference an asset path without confirming the file exists** in `public/`
   (`ls` it). Copilot and CI both caught this; I should have caught it first.
3. **Verify CSS changes in a real browser** (computed styles), don't assume a
   Tailwind class wins — the unlayered theme CSS is a recurring gotcha (§1).
4. **Background `npx serve` is flaky in this env** (exit 144 when started in some
   parallel/background combos). What worked reliably: start it, `sleep 5`, then
   `curl` to confirm `200` before driving Playwright. Playwright scripts must run
   from the **project root** (so `@playwright/test` resolves) — `/tmp/*.mjs` fails
   with `ERR_MODULE_NOT_FOUND`. Playwright 1.60 needs `npx playwright install chromium`.
5. **Don't fire many dependent tool calls in parallel** — I caused cascade failures
   doing that. Sequential for anything stateful (serve → screenshot → measure).

---

## 4. The standard full gate (run before every commit/PR)

```bash
cd /home/user/FFC-EX-hclwellness.org
npm run format        # then: npm run format:check
npm run lint          # 0 errors expected (1 pre-existing warning OK)
npm run check:drift   # CSP sync etc.
npm test              # 55 unit tests
npm run build         # MUST run — catches missing assets/types
npm run check-links   # MUST run — catches broken links/images (287 links, 0 broken = good)
npm run test:e2e      # 37 passed (needs `npx playwright install chromium` first)
```

Live verification helper: `migration/compare-wp-vs-static.mjs` (WP vs GH Pages,
all routes). Routes list: `migration/compare-routes.txt`.

---

## 5. Project architecture (orientation)

- **Static Next.js (App Router) → static export → GitHub Pages.** No live WordPress
  dependency; content is a committed snapshot.
- **Content pipeline:** `migration/*.py` (harvest/download/transform) →
  `src/data/content/content.json` (57 entries: 55 pages + 2 posts, each = ready HTML)
  → rendered by `src/components/SiteContent` via `getPageBySlug().html` in
  `src/app/[slug]/page.tsx` (and `home-page`, `blog`). Styled by
  `src/styles/content.css` (captured theme).
- **Content edits** = edit `migration/transform.py` (e.g. `PAGE_HTML_OVERRIDES`,
  `strip_*` helpers) then `python3 migration/transform.py` to regenerate
  `content.json`. Do NOT hand-edit content.json.
- **Chrome** (not from content): `src/components/{header,footer,cookie-consent,
google-tag-manager,seo}` + `src/app/layout.tsx`.
- **Deploy:** `.github/workflows/deploy.yml` runs after CI on `main`. **No CNAME**
  (publishes to the github.io project subpath; `NEXT_PUBLIC_BASE_PATH` handles the
  `/FFC-EX-hclwellness.org` prefix). `siteConfig.url` is the bare origin
  `https://freeforcharity.github.io`; `siteUrl()`/`assetPath()` add the base path.
  Do NOT set `static_site_generator: next` in configure-pages — it drops
  `trailingSlash` (see git history / PR #43).
- **Donations/CRM:** Zeffy is the sole processor + CRM (donations + newsletter).
  Donate button → Zeffy form `8e423183-...`. Contact/newsletter = `mailto:` fallback.
  GiveWP deprecated. See `DONATIONS.md`.

---

## 6. Everything shipped this engagement (all merged to main unless noted)

- WordPress→static migration (PRs #22–#29), base-CI fixes (CodeQL #28, E2E #30).
- Link check green via `trailingSlash` (#31); visual-fix CSP/PDF + donation pages (#32).
- GitHub Pages default-location publishing (#39), deploy fixes (#42 smoke-check, #43
  trailingSlash-drop root cause).
- Blog polish (#37), CSP tighten (#38), `DONATIONS.md` (#36), contact→mailto +
  Zeffy-only docs + strip dead forms (#44).
- Re-brand to HCL + prune template docs + remove ~13.7k lines dead FFC components (#50).
- De-WordPress naming (#52). Homepage mobile flow (#53).
- **Dependabot: all 14 processed** — npm set (#55), GitHub Actions (#56). Held back:
  eslint 10 (Next incompat), commitlint 21 (needs Node ≥22; repo is Node 20),
  tmp (covered by overrides). jest pinned exact 30.4.1 (jsdom mismatch).
- Compare tool committed (#46).

## 7. Open issues (decisions for the org / future work)

- **#45** — site manager to provide the **Zeffy newsletter form URL** (replace mailto).
- **#51** — catalog of removed FFC components; decision: which (if any) to rebuild
  for HCL. My recommendation: don't rebuild (content is already the source of truth).
- **#54** — mobile design: footer (in progress here), header logo (item 2, abandoned —
  needs a real logo asset), interior audit (done). **Hero redesign** (4 bullets →
  one headline + one CTA) is the highest-value remaining design item but needs a
  content decision from the org.

## 8. Immediate next action for the new session

Finish PR #58 cleanly: **commit the working-tree fixes** (header revert + globals.css
footer override), **after** verifying in a browser that footer links render light.
Update the PR body to reflect "footer-readability only; header logo deferred to #54".
Then green CI and merge. Scope of the final PR should be **just**: `footer/index.tsx`
(gray-200) + `globals.css` (unlayered footer `a` override).
