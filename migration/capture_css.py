#!/usr/bin/env python3
"""
Phase 3 helper: capture the live site's effective CSS into one local bundle so
the migrated pages render faithfully without contacting WordPress.

Sources, in cascade order:
  1. All inline <style> blocks from the rendered home page (WP global styles,
     block-support layout styles, per-block styles).
  2. The HCL-hosted stylesheets actually enqueued (navigation, cover, the
     SiteOrigin custom design CSS).

Any url(...) inside the CSS that points at the live host is downloaded into
public/ and rewritten to a root-relative local path.

Output: src/styles/content.css
"""
import os, re, html, urllib.request, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
OUT = os.path.join(ROOT, "src", "styles", "content.css")
UA = "Mozilla/5.0 (compatible; HCL-static-migration/1.0)"
HOME = "https://hclwellness.org/"

# HCL-hosted stylesheets we want bundled (skip Google Fonts / GiveWP / CF7).
WANT = ("block-library/navigation", "block-library/cover", "so-css")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def localize_urls(css, base_url):
    """Download url(host/...) assets into public/ and rewrite to local paths."""
    def repl(m):
        raw = m.group(2).strip()
        if raw.startswith(("data:", "#")):
            return m.group(0)
        absu = urllib.parse.urljoin(base_url, raw)
        p = urllib.parse.urlparse(absu)
        if "hclwellness.org" not in (p.hostname or ""):
            return m.group(0)  # leave external font/CDN refs as-is (reported later)
        path = urllib.parse.unquote(p.path)
        if not path.startswith("/wp-content/"):
            return m.group(0)
        dest = os.path.normpath(os.path.join(PUBLIC, path.lstrip("/")))
        if os.path.commonpath([os.path.abspath(PUBLIC), os.path.abspath(dest)]) != os.path.abspath(PUBLIC):
            return m.group(0)
        if not os.path.exists(dest):
            try:
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                req = urllib.request.Request(absu, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=60) as r:
                    open(dest, "wb").write(r.read())
                print("  css asset:", path)
            except Exception as e:
                print("  ! css asset failed", absu, e)
                return m.group(0)
        return f"url({m.group(1)}{path}{m.group(1)})"

    return re.sub(r'url\((["\']?)([^)]+?)\1\)', repl, css)


def main():
    h = get(HOME)
    parts = ["/* Captured from hclwellness.org — WP global/block styles + SiteOrigin custom CSS. */"]

    inline = re.findall(r"<style[^>]*>(.*?)</style>", h, re.S)
    parts.append(f"/* --- {len(inline)} inline style blocks --- */")
    for s in inline:
        parts.append(html.unescape(s).strip())

    links = re.findall(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>', h)
    for l in links:
        m = re.search(r'href=["\']([^"\']+)["\']', l)
        if not m:
            continue
        href = html.unescape(m.group(1))
        if "hclwellness.org" not in href or not any(w in href for w in WANT):
            continue
        try:
            css = get(href)
            parts.append(f"/* --- {href.split('/')[-1].split('?')[0]} --- */")
            parts.append(localize_urls(css, href))
            print("  bundled:", href[:80])
        except Exception as e:
            print("  ! failed", href, e)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bundle = "\n\n".join(parts)
    bundle = localize_urls(bundle, HOME)
    open(OUT, "w", encoding="utf-8").write(bundle)
    print(f"\nwrote {OUT} ({len(bundle)} bytes)")


if __name__ == "__main__":
    main()
