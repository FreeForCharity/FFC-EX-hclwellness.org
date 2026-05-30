#!/usr/bin/env python3
"""
HCL Wellness WordPress -> static repo harvester.

Phase 1: pull ALL content (pages, posts, media metadata, categories, tags) from
the live WordPress REST API and persist raw JSON so the rest of the migration is
reproducible and never needs to hit the network again.

Run:  python3 migration/harvest.py
Output: migration/raw/*.json
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

BASE = "https://hclwellness.org/wp-json/wp/v2"
RAW = os.path.join(os.path.dirname(__file__), "raw")
os.makedirs(RAW, exist_ok=True)

UA = "Mozilla/5.0 (compatible; HCL-static-migration/1.0)"


def fetch(url, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read(), dict(r.headers)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            wait = 2 ** attempt
            print(f"  ! {e} -> retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError(f"failed: {url}")


def fetch_all(endpoint, extra=""):
    """Paginate an embedded WP collection fully."""
    items = []
    page = 1
    while True:
        url = f"{BASE}/{endpoint}?per_page=100&page={page}{extra}"
        try:
            body, headers = fetch(url)
        except RuntimeError:
            break
        batch = json.loads(body)
        if not isinstance(batch, list) or not batch:
            break
        items.extend(batch)
        total_pages = int(headers.get("X-WP-TotalPages", "1") or "1")
        print(f"  {endpoint}: page {page}/{total_pages} (+{len(batch)} = {len(items)})")
        if page >= total_pages:
            break
        page += 1
    return items


def save(name, data):
    path = os.path.join(RAW, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  saved {name} ({len(data)} items, {os.path.getsize(path)} bytes)")


def main():
    print("Pages...")
    save("pages.json", fetch_all("pages", "&_embed=1"))
    print("Posts...")
    save("posts.json", fetch_all("posts", "&_embed=1"))
    print("Media...")
    save("media.json", fetch_all("media"))
    print("Categories...")
    save("categories.json", fetch_all("categories"))
    print("Tags...")
    save("tags.json", fetch_all("tags"))
    print("Done.")


if __name__ == "__main__":
    main()
