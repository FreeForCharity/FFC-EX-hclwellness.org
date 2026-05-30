# WordPress → static migration pipeline

Reproducible tooling that pulled **www.hclwellness.org** (Healthy Community
Lifespaces) off WordPress and into this static repo. Kept in-tree so the
migration can be re-run or audited without touching the live site.

## Scripts

| Script               | What it does                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `harvest.py`         | Pulls all pages/posts/media/categories/tags from the public WP REST API into `raw/*.json`.  |
| `download_assets.py` | Extracts every referenced asset URL, downloads localizable ones into `public/`, classifies. |

## Outputs

| File                   | Contents                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `raw/*.json`           | Verbatim WP REST responses (pages, posts, media, categories, tags) with `_embed`.      |
| `asset-map.json`       | `original URL → { local, status, bytes, kind }` for every localized asset.             |
| `external-report.json` | Outbound citation hyperlinks & functional embeds that are **not** mirrored (+ reason). |

## Re-running

```bash
python3 migration/harvest.py          # refresh raw/ from the live site
python3 migration/download_assets.py  # (re)download assets referenced by content
```

`download_assets.py` is idempotent: already-present files are reported as `cached`.

## Source of truth

- Live site: https://hclwellness.org (WordPress, Twenty Twenty-Three block theme)
- REST root: https://hclwellness.org/wp-json/wp/v2/
- 56 pages + 2 posts. The WP `media` endpoint caps at 92 of 477 entries (the rest
  are generated thumbnail sizes), so we localize every asset actually referenced in
  content rather than the raw media library.
