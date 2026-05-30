#!/usr/bin/env python3
"""
Phase 3+ transform: turn harvested WordPress pages/posts into clean content
modules the static site renders, with every reference made local:

  - wp-content asset URLs  -> root-relative /wp-content/... (we mirrored them)
  - internal page links    -> local kebab routes (/about-us, /blog/<slug>, /)
  - <script> tags          -> removed
  - WP oEmbed iframes       -> plain links (internal -> local route)

Output:
  src/data/wordpress/content.json   list of { type, id, slug, route, title,
        date, modified, excerpt, html, featuredImage, categories, parent, order }
  migration/link-report.json        internal links that did not resolve to a route
"""
import json, os, re, html as htmlmod
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "migration", "raw")
OUT_DIR = os.path.join(ROOT, "src", "data", "wordpress")
FRONT_PAGE_ID = 17630


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)


def norm(url):
    """Normalize an hclwellness URL to a comparable key: path only, no trailing /."""
    p = urlparse(url)
    path = p.path.rstrip("/")
    return path or "/"


def text(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", htmlmod.unescape(s or ""))).strip()


def featured(item):
    emb = item.get("_embedded", {})
    for fm in emb.get("wp:featuredmedia", []) or []:
        if isinstance(fm, dict) and fm.get("source_url"):
            return local_asset(fm["source_url"])
    return None


def categories(item):
    emb = item.get("_embedded", {})
    out = []
    for group in emb.get("wp:term", []) or []:
        for t in group or []:
            if t.get("taxonomy") == "category" and t.get("name") != "Uncategorized":
                out.append(t["name"])
    return out


HOST_RE = re.compile(r"https?://(?:www\.)?hclwellness\.org", re.I)


def local_asset(url):
    """wp-content asset URL -> root-relative local path (host stripped)."""
    if not url:
        return url
    if HOST_RE.match(url) and "/wp-content/" in url:
        return HOST_RE.sub("", url)
    return url


def build_route_map(pages, posts):
    m = {}  # normalized path -> local route
    for p in pages:
        route = "/" if p["id"] == FRONT_PAGE_ID else "/" + p["slug"]
        m[norm(p["link"])] = route
        m["/" + p["slug"]] = route
    for p in posts:
        route = "/blog/" + p["slug"]
        m[norm(p["link"])] = route
        m["/" + p["slug"]] = route
    return m


def rewrite_html(raw, route_map, unresolved):
    h = raw or ""
    # 1. strip scripts/styles that don't belong inline in content
    h = re.sub(r"<script\b[^>]*>.*?</script>", "", h, flags=re.S | re.I)
    h = re.sub(r"<noscript\b[^>]*>.*?</noscript>", "", h, flags=re.S | re.I)

    # 2. neutralize WP oEmbed iframes: <iframe ... src="...">...</iframe>
    #    keep YouTube (functional video); turn others into a link.
    def iframe_repl(m):
        src = m.group(1)
        if "youtube.com" in src or "youtu.be" in src:
            return m.group(0)  # keep video embed (documented as external)
        # de-embed: strip trailing /embed/... and secret fragment
        clean = re.sub(r"/embed/.*$", "/", src)
        clean = re.sub(r"#.*$", "", clean)
        target = clean
        if HOST_RE.match(clean):
            key = norm(clean)
            target = route_map.get(key, HOST_RE.sub("", clean) or "/")
        label = "View embedded content"
        return f'<p class="wp-embed-fallback"><a href="{target}">{label}</a></p>'

    h = re.sub(r'<iframe[^>]*\ssrc="([^"]+)"[^>]*>\s*</iframe>', iframe_repl, h, flags=re.I)
    h = re.sub(r'<iframe[^>]*\ssrc="([^"]+)"[^>]*>', iframe_repl, h, flags=re.I)

    # 3. rewrite internal page links (longest paths first to avoid partial hits)
    for key in sorted(route_map, key=len, reverse=True):
        route = route_map[key]
        for variant in (
            f'https://hclwellness.org{key}/',
            f'https://hclwellness.org{key}',
            f'https://www.hclwellness.org{key}/',
            f'https://www.hclwellness.org{key}',
        ):
            h = h.replace(f'href="{variant}"', f'href="{route}"')

    # 4. wp-content assets: strip host, keep path (mirrored under public/)
    h = re.sub(r'(src|href)="https?://(?:www\.)?hclwellness\.org(/wp-content/[^"]*)"',
               r'\1="\2"', h, flags=re.I)
    h = re.sub(r'srcset="([^"]*)"',
               lambda m: 'srcset="' + HOST_RE.sub("", m.group(1)) + '"', h)

    # 5. record any remaining internal links that didn't resolve
    for m in re.finditer(r'href="(https?://(?:www\.)?hclwellness\.org[^"]*)"', h, re.I):
        u = m.group(1)
        if "/wp-content/" in u:
            continue
        unresolved.append(u)
        # leave as-is but host-strip so it stays on-site
    h = re.sub(r'href="https?://(?:www\.)?hclwellness\.org(/[^"]*)"', r'href="\1"', h, flags=re.I)
    h = re.sub(r'href="https?://(?:www\.)?hclwellness\.org/?"', r'href="/"', h, flags=re.I)

    # 6. final sweep: strip any remaining host reference (malformed links,
    #    visible URL text) so nothing points back at the WordPress host.
    h = re.sub(r'https?:/+(?:www\.)?hclwellness\.org', "", h, flags=re.I)

    # 7. strip stray control characters (raw and %-encoded) that a few source
    #    links carry — e.g. href="%0b%0b/foo%0b%0b" — so links stay clean.
    h = re.sub(r'(?:%0[9abcdABCD])+', "", h)
    h = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', "", h)

    return h.strip()


def convert(item, typ, route_map, unresolved):
    return {
        "type": typ,
        "id": item["id"],
        "slug": item["slug"],
        "route": ("/" if item["id"] == FRONT_PAGE_ID else "/" + item["slug"]) if typ == "page"
                 else "/blog/" + item["slug"],
        "title": htmlmod.unescape(item["title"]["rendered"]).strip(),
        "date": item.get("date"),
        "modified": item.get("modified"),
        "excerpt": text(item.get("excerpt", {}).get("rendered", ""))[:300],
        "html": rewrite_html(item.get("content", {}).get("rendered", ""), route_map, unresolved),
        "featuredImage": featured(item),
        "categories": categories(item),
        "parent": item.get("parent", 0),
        "order": item.get("menu_order", 0),
    }


def main():
    pages = load("pages.json")
    posts = load("posts.json")
    route_map = build_route_map(pages, posts)
    unresolved = []

    out = []
    for p in pages:
        if not text(p["title"]["rendered"]) and len(text(p["content"]["rendered"])) < 40:
            continue  # skip truly-empty pages
        out.append(convert(p, "page", route_map, unresolved))
    for p in posts:
        out.append(convert(p, "post", route_map, unresolved))

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "content.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    with open(os.path.join(ROOT, "migration", "link-report.json"), "w", encoding="utf-8") as f:
        json.dump(sorted(set(unresolved)), f, ensure_ascii=False, indent=2)

    print(f"wrote {len(out)} content modules ({sum(t['type']=='page' for t in out)} pages, "
          f"{sum(t['type']=='post' for t in out)} posts)")
    print(f"unresolved internal links: {len(set(unresolved))}")


if __name__ == "__main__":
    main()
