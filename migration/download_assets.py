#!/usr/bin/env python3
"""
Phase 2: download every localizable asset referenced by HCL Wellness content.

- All hclwellness.org /wp-content/ assets (images, PDFs, docx, mp4, css/js if used)
- Featured-image + media-library source URLs
- External *embedded* images (img/src, background) -> public/external/<host>/...
- External *file* hyperlinks (pdf/doc/...) -> public/external/<host>/...

Writes migration/asset-map.json: { original_url: {local, status, bytes, kind} }
Outbound citation hyperlinks to third-party *pages* are NOT downloaded; they are
recorded separately in migration/external-report.json for the independence report.
"""
import json, os, re, time, html
import urllib.request, urllib.error
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "migration", "raw")
PUBLIC = os.path.join(ROOT, "public")
UA = "Mozilla/5.0 (compatible; HCL-static-migration/1.0)"

FILE_RE = re.compile(r'\.(pdf|docx?|xlsx?|pptx?|zip|jpe?g|png|gif|webp|svg|mp4|mp3|m4a|mov)(\?|$)', re.I)


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)


def all_content():
    items = load("pages.json") + load("posts.json")
    return items


def gather_urls():
    embedded, links = set(), set()
    blob = []
    for it in all_content():
        c = it.get("content", {}).get("rendered", "") or ""
        e = it.get("excerpt", {}).get("rendered", "") or ""
        blob.append(c); blob.append(e)
        # featured media via _embedded
        emb = it.get("_embedded", {})
        for fm in emb.get("wp:featuredmedia", []) or []:
            if isinstance(fm, dict) and fm.get("source_url"):
                embedded.add(fm["source_url"])
    blob = "\n".join(blob)
    for m in re.finditer(r'src="([^"]+)"', blob): embedded.add(html.unescape(m.group(1)))
    for m in re.finditer(r'srcset="([^"]+)"', blob):
        for p in m.group(1).split(","):
            u = p.strip().split(" ")[0]
            if u: embedded.add(html.unescape(u))
    for m in re.finditer(r'url\((["\']?)([^)"\']+)\1\)', blob): embedded.add(html.unescape(m.group(2)))
    for m in re.finditer(r'href="([^"]+)"', blob): links.add(html.unescape(m.group(1)))
    # media library
    for mm in load("media.json"):
        if mm.get("source_url"): embedded.add(mm["source_url"])
    return embedded, links


def is_hcl(u):
    # Exact host match (or a true subdomain) — a substring test would also
    # accept a spoof like "hclwellness.org.evil.tld".
    host = (urlparse(u).hostname or "").lower()
    return host == "hclwellness.org" or host.endswith(".hclwellness.org")


def _safe_join(base, *parts):
    """Join under `base`, rejecting any result that escapes it (path traversal)."""
    dest = os.path.normpath(os.path.join(base, *parts))
    base_abs = os.path.abspath(base)
    if os.path.commonpath([base_abs, os.path.abspath(dest)]) != base_abs:
        return None
    return dest


def local_path_for(u):
    p = urlparse(u)
    path = unquote(p.path)
    if is_hcl(u):
        # mirror wp-content path under public/
        if path.startswith("/wp-content/"):
            return _safe_join(PUBLIC, path.lstrip("/"))
        return None
    # external -> public/external/<host>/<path>
    host = (p.hostname or "unknown").replace(":", "_")
    safe = path.lstrip("/") or "index"
    return _safe_join(os.path.join(PUBLIC, "external"), host, safe)


def download(u, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in range(4):
        try:
            req = urllib.request.Request(u, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            with open(dest, "wb") as f:
                f.write(data)
            return len(data), None
        except Exception as e:
            if attempt == 3:
                return 0, str(e)
            time.sleep(2 ** attempt)
    return 0, "unknown"


def rel(dest):
    return "/" + os.path.relpath(dest, PUBLIC).replace(os.sep, "/")


def main():
    embedded, links = gather_urls()
    asset_map = {}
    external_pages = []

    # Build download set
    to_get = {}  # url -> (kind)
    for u in embedded:
        if u.startswith("data:") or u.startswith("#"):
            continue
        if is_hcl(u) and "/wp-content/" in u:
            to_get[u] = "hcl-asset"
        elif not is_hcl(u) and urlparse(u).scheme in ("http", "https") and FILE_RE.search(u):
            to_get[u] = "ext-image"
        elif not is_hcl(u) and urlparse(u).scheme in ("http", "https"):
            # external embed (iframe/oembed) that isn't a file -> report, don't download
            external_pages.append({"url": u, "kind": "external-embed"})
    for u in links:
        if u.startswith(("#", "mailto:", "tel:", "data:")):
            continue
        sch = urlparse(u).scheme
        if is_hcl(u) and "/wp-content/" in u and FILE_RE.search(u):
            to_get[u] = "hcl-file"
        elif not is_hcl(u) and sch in ("http", "https"):
            if FILE_RE.search(u):
                to_get.setdefault(u, "ext-file")
            else:
                external_pages.append({"url": u, "kind": "external-link"})

    print(f"Downloading {len(to_get)} assets...")
    ok = fail = 0
    for i, (u, kind) in enumerate(sorted(to_get.items()), 1):
        dest = local_path_for(u)
        if not dest:
            asset_map[u] = {"local": None, "status": "skip-no-path", "bytes": 0, "kind": kind}
            continue
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            asset_map[u] = {"local": rel(dest), "status": "cached", "bytes": os.path.getsize(dest), "kind": kind}
            ok += 1
            continue
        n, err = download(u, dest)
        if err:
            asset_map[u] = {"local": None, "status": f"error:{err[:80]}", "bytes": 0, "kind": kind}
            fail += 1
            print(f"  [{i}/{len(to_get)}] FAIL {u} -> {err[:60]}")
        else:
            asset_map[u] = {"local": rel(dest), "status": "ok", "bytes": n, "kind": kind}
            ok += 1
            if i % 25 == 0:
                print(f"  [{i}/{len(to_get)}] ok={ok} fail={fail}")

    with open(os.path.join(ROOT, "migration", "asset-map.json"), "w", encoding="utf-8") as f:
        json.dump(asset_map, f, indent=2, ensure_ascii=False)
    # dedupe external pages
    seen = set(); ext = []
    for e in external_pages:
        if e["url"] in seen: continue
        seen.add(e["url"]); ext.append(e)
    with open(os.path.join(ROOT, "migration", "external-report.json"), "w", encoding="utf-8") as f:
        json.dump(ext, f, indent=2, ensure_ascii=False)
    print(f"\nDONE  ok={ok} fail={fail}  external-pages={len(ext)}")
    print("asset-map.json + external-report.json written")


if __name__ == "__main__":
    main()
