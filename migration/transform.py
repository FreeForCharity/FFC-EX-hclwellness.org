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

# External embedded images that could NOT be re-downloaded (source down /
# 403 / expired CDN tokens) are mapped to local equivalents so the built site
# loads zero external images. Reasons are documented in MIGRATION_REPORT.md.
EXTERNAL_OVERRIDES = {
    "https://block21.oitemplates.org/wp-content/uploads/2023/06/call-1.png": "/external/icons/phone.svg",
    "https://block21.oitemplates.org/wp-content/uploads/2023/06/email-1.png": "/external/icons/email.svg",
    "https://block21.oitemplates.org/wp-content/uploads/2023/06/location-1.png": "/external/icons/location.svg",
}
# LinkedIn CDN images (403 / expired tokens) -> local placeholder.
LICDN_PLACEHOLDER = "/external/placeholder.svg"

# Images referenced by content but already 404 on the live WordPress site
# (nothing to localize) -> local placeholder so no broken <img> remains.
BROKEN_SOURCE_IMAGES = [
    "/wp-content/uploads/2024/01/Beets.jpg",
    "/wp-content/uploads/2024/01/Noah.jpg",
    "/wp-content/uploads/2024/01/cauliflower.jpg",
    "/wp-content/uploads/2024/09/halloween2-1.jpg",
    "/wp-content/uploads/2024/12/image-2.png",
    "/wp-content/uploads/2024/12/vegs.png",
    "/wp-content/uploads/2025/05/image-11-1.jpeg",
]

# Dead WordPress *system* / missing links with no place in a static site
# (comment threads, reply links, admin area, the REST API, and a removed page).
DEAD_LINK_RE = re.compile(
    r"/(?:wp-admin|wp-json)|/comment-page-|[?&]replytocom=|/services-and-resources"
)

ZEFFY_DONATE = (
    "https://www.zeffy.com/embed/donation-form/"
    "8e423183-d093-41c4-91a0-947ff24c3bee?modal=true"
)

# GiveWP donation pages are dynamic (donor portal / post-checkout state) and
# cannot function on a static export — they otherwise render a perpetual
# loading spinner. Replace them with static content. (donation-failed already
# carries usable static copy and is left as-is.)
PAGE_HTML_OVERRIDES = {
    "donor-dashboard": (
        '<p>Donor accounts and giving history are managed securely through our '
        "donation provider rather than on this site.</p>"
        f'<p><a class="wp-block-button__link" href="{ZEFFY_DONATE}" '
        'target="_blank" rel="noopener noreferrer">Make a donation</a></p>'
        '<p>Questions about a donation? Email '
        '<a href="mailto:Healthycommunitylifespaces@gmail.com">'
        "Healthycommunitylifespaces@gmail.com</a>.</p>"
    ),
    "donation-confirmation": (
        "<p>Thank you for your donation! Your support helps Healthy Community "
        "Lifespaces promote health, nutrition, and safe communities.</p>"
        '<p><a href="/">Return to the home page</a></p>'
    ),
}

# Broken source links repaired to the localized target.
LINK_OVERRIDES = [
    (
        re.compile(r'href="[^"]*representatives-letter-for-cameras-and-scooter-warnings[^"]*"', re.I),
        'href="/wp-content/uploads/2025/11/representatives-letter-for-cameras-and-scooter-warnings.pdf"',
    ),
]


def local_asset(url):
    """wp-content asset URL -> root-relative local path (host stripped)."""
    if not url:
        return url
    if HOST_RE.match(url) and "/wp-content/" in url:
        return HOST_RE.sub("", url)
    return url


def route_for(item, typ):
    """Local route for an item, with a trailing slash (matches next trailingSlash)."""
    if typ == "page":
        return "/" if item["id"] == FRONT_PAGE_ID else "/" + item["slug"] + "/"
    return "/blog/" + item["slug"] + "/"


def build_route_map(pages, posts):
    m = {}  # normalized path -> local route
    for p in pages:
        route = route_for(p, "page")
        m[norm(p["link"])] = route
        m["/" + p["slug"]] = route
    for p in posts:
        route = route_for(p, "post")
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

    # 8. localize unrecoverable external embedded images so the built site
    #    loads zero external images (see EXTERNAL_OVERRIDES / report).
    for ext_url, local in EXTERNAL_OVERRIDES.items():
        h = h.replace(ext_url, local)
    # LinkedIn CDN images (also appear with &amp; entity-encoded params).
    h = re.sub(r'https://media\.licdn\.com/[^"\']*', LICDN_PLACEHOLDER, h)

    # 9. repair known broken source links to their localized targets.
    for pat, repl in LINK_OVERRIDES:
        h = pat.sub(repl, h)

    # 10. images already 404 on the live site -> local placeholder.
    for img in BROKEN_SOURCE_IMAGES:
        h = h.replace('src="' + img + '"', 'src="' + LICDN_PLACEHOLDER + '"')
        h = re.sub(r'srcset="[^"]*' + re.escape(img.rsplit("/", 1)[-1]) + r'[^"]*"', "", h)

    # 11. unwrap dead WordPress system / missing links, keeping their visible
    #     text so content still reads normally.
    h = re.sub(
        r'<a\b[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
        lambda m: m.group(2) if DEAD_LINK_RE.search(m.group(1)) else m.group(0),
        h,
        flags=re.S,
    )

    return h.strip()


def convert(item, typ, route_map, unresolved):
    override = PAGE_HTML_OVERRIDES.get(item["slug"]) if typ == "page" else None
    html_body = override or rewrite_html(
        item.get("content", {}).get("rendered", ""), route_map, unresolved
    )
    return {
        "type": typ,
        "id": item["id"],
        "slug": item["slug"],
        "route": route_for(item, typ),
        "title": htmlmod.unescape(item["title"]["rendered"]).strip(),
        "date": item.get("date"),
        "modified": item.get("modified"),
        "excerpt": text(item.get("excerpt", {}).get("rendered", ""))[:300],
        "html": html_body,
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
