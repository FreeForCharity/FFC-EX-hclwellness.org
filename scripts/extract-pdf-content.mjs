#!/usr/bin/env node
/**
 * Extract each charity PDF (issue #59) into real, reflowing HTML content blocks
 * so the document content pages at /documents/<slug>/ render as selectable text
 * and inline images on ANY device — no PDF plugin required (the browser
 * `<object>` viewer is blank on Android Chrome, which is why we don't use it).
 *
 * Pipeline (uses poppler-utils `pdftohtml -xml`, a build-time-only dependency —
 * it is NOT needed in CI because the extracted JSON + images are committed):
 *
 *   1. `pdftohtml -xml` emits positioned <text> runs (with font ids/sizes) and
 *      extracts embedded raster <image>s to a temp dir.
 *   2. We sort text + image elements into reading order (page, then top, then
 *      left), merge text runs on the same line, group consecutive lines into
 *      paragraphs, and classify large/bold lines as headings (by font size
 *      relative to the document's body font).
 *   3. Embedded images are copied to public/documents/<slug>/ and emitted as
 *      image blocks positioned in reading order.
 *   4. The ordered blocks + extracted plain text (for screen-reader summary and
 *      SEO description fallback) are written to
 *      src/data/document-content/<slug>.json.
 *
 * Re-run after changing the PDF list in src/data/documents.ts:
 *   node scripts/extract-pdf-content.mjs
 *
 * Some PDFs use fonts whose `fi`/`ff`/`ft`/`tt` ligature (and non-breaking
 * hyphen) glyphs are not mapped to Unicode, so both pdftohtml and pdftotext
 * silently DROP characters ("fifth" → "ﬁ h", "better" → "be er"). When we
 * detect that signature we fall back to OCR (render pages → tesseract), which
 * reads the rendered glyphs correctly.
 *
 * Requires: poppler-utils (`pdftohtml`, `pdftoppm`). OCR fallback also needs
 * tesseract-ocr. Install on Debian/Ubuntu with:
 *   sudo apt-get install -y poppler-utils tesseract-ocr
 */
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC = path.join(ROOT, 'public')
const OUT_DATA = path.join(ROOT, 'src', 'data', 'document-content')
const OUT_IMG_ROOT = path.join(PUBLIC, 'documents')

// Read the document list from the committed TS module without importing TS:
// pull each { slug, file } pair out with a tolerant regex.
function loadDocs() {
  const src = readFileSync(path.join(ROOT, 'src', 'data', 'documents.ts'), 'utf8')
  const docs = []
  const re =
    /slug:\s*'([^']+)',\s*\n\s*title:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"),[\s\S]*?file:\s*'([^']+)'/g
  let m
  while ((m = re.exec(src))) {
    // The rest of this document's object literal, up to its closing brace.
    const end = src.indexOf('}', m.index + m[0].length)
    const rest = src.slice(m.index + m[0].length, end === -1 ? undefined : end)
    docs.push({
      slug: m[1],
      title: (m[2] ?? m[3]).replace(/\\'/g, "'"),
      file: m[4],
      ocr: /\bocr:\s*true\b/.test(rest),
    })
  }
  return docs
}

function ensureTool() {
  try {
    execFileSync('pdftohtml', ['-v'], { stdio: 'ignore' })
  } catch {
    console.error(
      'ERROR: pdftohtml (poppler-utils) not found. Install with:\n' +
        '  sudo apt-get install -y poppler-utils'
    )
    process.exit(1)
  }
}

/** Decode the limited set of XML entities pdftohtml emits in text runs. */
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Strip inline <b>/<i>/<a> tags pdftohtml leaves inside text runs, keep text.
 * Applied repeatedly until stable so overlapping/malformed tag fragments can't
 * survive a single pass (CodeQL: incomplete multi-character sanitization). */
function stripInline(s) {
  let prev
  let out = s
  do {
    prev = out
    out = out.replace(/<[^>]*>/g, '')
  } while (out !== prev)
  return out
}

/** Parse <fontspec id= size=> declarations → map of id → size (px). */
function parseFontSpecs(xml) {
  const map = new Map()
  const re = /<fontspec\s+id="(\d+)"\s+size="(\d+)"/g
  let m
  while ((m = re.exec(xml))) map.set(m[1], Number(m[2]))
  return map
}

/**
 * Parse one <page> block into ordered elements: { kind:'text', top,left,text,font,bold }
 * or { kind:'image', top,left,src }.
 */
function parsePage(pageXml, pageNum) {
  const els = []
  const textRe =
    /<text\s+top="(\d+)"\s+left="(\d+)"\s+width="(\d+)"\s+height="(\d+)"\s+font="(\d+)"\s*>([\s\S]*?)<\/text>/g
  let m
  while ((m = textRe.exec(pageXml))) {
    const raw = m[6]
    const bold = /<b>/.test(raw)
    const text = decodeEntities(stripInline(raw)).replace(/\s+/g, ' ').trim()
    if (!text) continue
    els.push({
      kind: 'text',
      top: Number(m[1]),
      left: Number(m[2]),
      height: Number(m[4]),
      font: m[5],
      bold,
      text,
    })
  }
  const imgRe = /<image\s+[^>]*?top="(\d+)"\s+left="(\d+)"[^>]*?src="([^"]+)"/g
  while ((m = imgRe.exec(pageXml))) {
    els.push({ kind: 'image', top: Number(m[1]), left: Number(m[2]), src: m[3] })
  }
  for (const e of els) e.page = pageNum
  return els
}

/** Group ordered text/image elements into HTML-ready blocks. */
function buildBlocks(elements, fontSizes, slug, imgRename) {
  // Reading order: page, then vertical, then horizontal.
  elements.sort((a, b) => a.page - b.page || a.top - b.top || a.left - b.left)

  // Determine the body font size = most common text font size, so we can flag
  // larger lines as headings.
  const freq = new Map()
  for (const e of elements) {
    if (e.kind !== 'text') continue
    const sz = fontSizes.get(e.font) ?? 0
    freq.set(sz, (freq.get(sz) ?? 0) + 1)
  }
  let bodySize = 0
  let best = -1
  for (const [sz, n] of freq) if (n > best) ((best = n), (bodySize = sz))

  // Typical line height = median text-run height; used to detect paragraph
  // breaks (a vertical gap noticeably larger than one line) and bullet runs.
  const heights = elements
    .filter((e) => e.kind === 'text')
    .map((e) => e.height)
    .sort((a, b) => a - b)
  const lineH = heights.length ? heights[Math.floor(heights.length / 2)] : 14

  // A bullet glyph set as its own text run (Word's "●" list markers) carries no
  // content: drop it, and mark the text run it sits beside on the same line as
  // a list item. Otherwise the glyph sorts just after its (slightly higher)
  // text and renders as a dangling "●" paragraph, and an emphasized bulleted
  // line is mistaken for a heading.
  const LONE_BULLET = /^[•·▪◦‣●]$/
  const loneBullets = elements.filter((e) => e.kind === 'text' && LONE_BULLET.test(e.text))
  const loneBulletSet = new Set(loneBullets)
  elements = elements.filter((e) => !loneBulletSet.has(e))
  for (const b of loneBullets) {
    // Only the nearest run to the bullet's right starts the item; later runs on
    // the same line (e.g. a bold label's description) continue it.
    let item = null
    for (const e of elements) {
      if (e.kind !== 'text' || e.page !== b.page || e.left <= b.left) continue
      if (Math.abs(e.top - b.top) > lineH) continue
      if (!item || e.left < item.left) item = e
    }
    if (item) item.bulleted = true
  }

  // Two-up print sheets (e.g. the back-to-school card) lay the same content out
  // twice side by side. Sorting by `top` interleaves the copies line by line,
  // so every sentence would appear twice.
  //
  // A page counts as two-up when at least three substantial runs (4+ chars,
  // with a letter) repeat verbatim on the same line in the other half of the
  // page; the copies' horizontal offset is the median of those pairs. Only on
  // such a page is any run dropped that repeats at that offset — short ones
  // ("aid", "~") included. Pages that aren't two-up are left alone, which
  // spares genuine same-line repeats such as table cells ("No No Yes") and the
  // two "RIDE ON" column headers in a table.
  const TWO_UP_TOLERANCE = 30
  const twoUpOffset = new Map()
  const textEls = elements.filter((e) => e.kind === 'text')
  for (const page of new Set(textEls.map((e) => e.page))) {
    const onPage = textEls.filter((e) => e.page === page)
    const halfWidth = Math.max(...onPage.map((e) => e.left)) / 2
    const offsets = []
    for (const a of onPage) {
      if (a.text.length < 4 || !/\p{L}/u.test(a.text)) continue
      const b = onPage.find(
        (o) =>
          o !== a &&
          o.text === a.text &&
          Math.abs(o.top - a.top) <= lineH / 2 &&
          o.left - a.left >= halfWidth
      )
      if (b) offsets.push(b.left - a.left)
    }
    if (offsets.length >= 3) {
      offsets.sort((x, y) => x - y)
      twoUpOffset.set(page, offsets[Math.floor(offsets.length / 2)])
    }
  }
  const kept = []
  elements = elements.filter((e) => {
    if (e.kind !== 'text' || !twoUpOffset.has(e.page)) return true
    const offset = twoUpOffset.get(e.page)
    const dup = kept.some(
      (k) =>
        k.page === e.page &&
        k.text === e.text &&
        Math.abs(k.top - e.top) <= lineH / 2 &&
        Math.abs(e.left - k.left - offset) <= TWO_UP_TOLERANCE
    )
    if (!dup) kept.push(e)
    return !dup
  })

  // Large text that is really part of a sentence is not a heading: a run that
  // carries an email address or URL, or that ends on a connective and so
  // continues onto the next line ("…mailing) to" / "name@example.com").
  const isSentenceFragment = (text) =>
    /@|https?:\/\/|\bwww\./i.test(text) || /\b(to|and|or|of|the|for|with|by|in|a|an)$/i.test(text)

  const blocks = []
  let para = null // accumulating paragraph: { lines: [{top,text}], lastBottom }
  // An image met while the open paragraph stops mid-sentence sits beside the
  // text wrapping around it; emit it after that paragraph so it doesn't split
  // the sentence ("…talk with State" / image / "legislators to pass…").
  let pendingImages = []
  const endsMidSentence = () =>
    para && para.lines.length && /[\p{L},]$/u.test(para.lines[para.lines.length - 1].text)

  const flushPara = () => {
    if (para && para.lines.length) {
      // A URL that wraps at a hyphen continues on the next line with no space
      // ("…/d/1L-arckn4z-" + "B03OAY…"); joining with a space would break it.
      let text = para.lines
        .map((l) => l.text)
        .reduce((acc, line) =>
          /\S*:\/\/\S*-$/.test(acc) ? acc + line.trimStart() : `${acc} ${line}`
        )
        .replace(/\s+/g, ' ')
        .trim()
      if (para.list) text = text.replace(/^([•·▪◦‣●*-]|\d+[.)]|[a-z][.)])\s+/, '')
      if (text) blocks.push({ type: para.list ? 'li' : 'p', text })
    }
    para = null
    for (const src of pendingImages) blocks.push({ type: 'img', src })
    pendingImages = []
  }

  for (const e of elements) {
    if (e.kind === 'image') {
      if (endsMidSentence()) {
        pendingImages.push(imgRename(e.src))
      } else {
        flushPara()
        blocks.push({ type: 'img', src: imgRename(e.src) })
      }
      continue
    }
    const sz = fontSizes.get(e.font) ?? bodySize
    const isHeading =
      bodySize > 0 &&
      sz >= bodySize * 1.18 &&
      e.text.length <= 120 &&
      !e.bulleted &&
      !isSentenceFragment(e.text)
    if (isHeading) {
      flushPara()
      blocks.push({ type: sz >= bodySize * 1.5 ? 'h2' : 'h3', text: e.text })
      continue
    }
    // A line that begins with a bullet/number marker starts a new list item.
    const isBullet = e.bulleted || /^([•·▪◦‣●*-]|\d+[.)]|[a-z][.)])\s+/.test(e.text)
    // Break the current paragraph when this line sits more than ~1.6 line
    // heights below the previous one (a blank-line gap), or a new page starts,
    // or a bullet marker begins a fresh item.
    if (para) {
      const gap = e.top - para.lastBottom
      const newPara = isBullet || e.page !== para.page || gap > lineH * 1.6
      if (newPara) flushPara()
    }
    if (!para) para = { lines: [], list: isBullet, page: e.page, lastBottom: e.top + e.height }
    para.lines.push({ top: e.top, text: e.text })
    para.lastBottom = e.top + e.height
    para.page = e.page
  }
  flushPara()

  // Collapse runs of identical-type empties; drop blocks that are just page
  // numbers, and drop heading runs that are really wordmark fragments.
  //
  // A stacked logo (the HCL letterhead is "H ealthy / C ommunity / L ifespaces")
  // sets its oversized initials and their remainders as separate, large text
  // runs, so the size-based heading test above promotes all six to headings —
  // splitting the surrounding prose around six lines of "ealthy / ommunity /
  // ifespaces / H / C / L". Nothing is lost by dropping them: the logo is also
  // extracted as the adjacent image block. A lone character is never a real
  // heading, and neither is a single bare lowercase word — a genuine heading
  // that starts lowercase (e.g. the Spanish "adecuadamente?") carries
  // punctuation or further words, which the alphabetic-only test excludes.
  const isWordmarkFragment = (text) => text.length <= 2 || /^[a-z]+$/.test(text)
  return blocks.filter((b) => {
    if (b.type === 'img') return true
    if (!b.text || /^\d{1,3}$/.test(b.text)) return false
    if ((b.type === 'h2' || b.type === 'h3') && isWordmarkFragment(b.text.trim())) return false
    return true
  })
}

/**
 * Heuristic: does this extracted text show the dropped-glyph signature (unmapped
 * ligature/hyphen glyphs)? We look for U+FB0x ligature or replacement chars, and
 * for an unusually high rate of " x " single-letter-between-spaces fragments
 * (what "be**tt**er" → "be er" leaves behind).
 */
function looksCorrupted(text) {
  if (!text) return false
  if (/[ﬀ-ﬆ�]/.test(text)) return true
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length < 20) return false
  // Count orphan single letters that aren't legitimate words (a, I).
  const orphans = words.filter((w) => /^[b-hj-z]$/i.test(w)).length
  return orphans / words.length > 0.03
}

/** Whether the tesseract binary is available for the OCR fallback. */
function hasTesseract() {
  try {
    execFileSync('tesseract', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * OCR fallback: render each page to PNG (pdftoppm) and OCR with tesseract,
 * returning paragraph blocks split on blank lines. Used only when the normal
 * text layer is corrupted. Images are not extracted here (the corrupted docs in
 * this set are text-only); page images would otherwise be handled by the XML
 * path.
 */
function ocrToBlocks(pdfPath, tmp) {
  execFileSync('pdftoppm', ['-png', '-r', '200', pdfPath, path.join(tmp, 'pg')], {
    stdio: 'ignore',
  })
  const pngs = readdirSync(tmp)
    .filter((f) => /^pg.*\.png$/.test(f))
    .sort()
  const blocks = []
  for (const png of pngs) {
    const txt = execFileSync('tesseract', [path.join(tmp, png), 'stdout', '--psm', '1'], {
      encoding: 'utf8',
    })
    // Split on blank lines into paragraphs; join wrapped lines within a paragraph.
    const paras = txt
      .split(/\n\s*\n/)
      .map((chunk) =>
        chunk
          .replace(/\s*\n\s*/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          // Common OCR glyph confusions: a lone "|" (or "l") standing as a word
          // is the pronoun "I"; tesseract frequently misreads it on these fonts.
          .replace(/(^|\s)[|l](\s|$)/g, '$1I$2')
      )
      .filter((para) => para.length > 0)
    paras.forEach((para, i) => {
      // A lone 1–3 digit number is a page number only at the top or bottom of
      // the page; elsewhere it is content (e.g. a policy's code, "223").
      const atPageEdge = i === 0 || i === paras.length - 1
      if (/^\d{1,3}$/.test(para) && atPageEdge) return
      // Drop single stray characters and other two-character OCR noise.
      if (para.length > 2) blocks.push({ type: 'p', text: para })
    })
  }
  return blocks
}

function run() {
  ensureTool()
  const docs = loadDocs()
  if (!docs.length) {
    console.error('No documents parsed from src/data/documents.ts')
    process.exit(1)
  }
  mkdirSync(OUT_DATA, { recursive: true })

  const manifest = []
  for (const doc of docs) {
    const pdfPath = path.join(PUBLIC, doc.file.replace(/^\//, ''))
    if (!existsSync(pdfPath)) {
      console.error(`  MISSING PDF: ${pdfPath}`)
      process.exit(1)
    }
    const tmp = mkdtempSync(path.join(tmpdir(), `pdf-${doc.slug}-`))
    const xmlPath = path.join(tmp, 'doc.xml')
    // -xml: structured output; -nodrm: ignore copy protection on extraction.
    execFileSync('pdftohtml', ['-xml', '-nodrm', '-fontfullname', pdfPath, xmlPath], {
      stdio: 'ignore',
    })
    const xml = readFileSync(xmlPath, 'utf8')
    const fontSizes = parseFontSpecs(xml)

    // Copy extracted images into public/documents/<slug>/ with stable names.
    const imgDir = path.join(OUT_IMG_ROOT, doc.slug)
    rmSync(imgDir, { recursive: true, force: true })
    let imgCount = 0
    const renameMap = new Map()
    const imgRename = (origSrc) => {
      const base = path.basename(origSrc)
      if (renameMap.has(base)) return renameMap.get(base)
      const ext = path.extname(base) || '.jpg'
      const name = `img-${String(++imgCount).padStart(2, '0')}${ext}`
      const fromPath = path.join(tmp, base)
      if (existsSync(fromPath)) {
        mkdirSync(imgDir, { recursive: true })
        copyFileSync(fromPath, path.join(imgDir, name))
      }
      const webPath = `/documents/${doc.slug}/${name}`
      renameMap.set(base, webPath)
      return webPath
    }

    // Parse each page and accumulate elements.
    const pages = xml.split(/<page\b/).slice(1)
    let elements = []
    pages.forEach((p, i) => {
      elements = elements.concat(parsePage(p, i + 1))
    })
    let blocks = buildBlocks(elements, fontSizes, doc.slug, imgRename)
    let source = 'text'

    // If the text layer is corrupted (unmapped ligature/hyphen glyphs) or the
    // PDF is a pure scan with no text layer at all (its "images" are then just
    // horizontal strips of the scanned page, useless as content), re-read the
    // document with OCR, which transcribes the rendered glyphs correctly.
    const xmlPlain = blocks
      .filter((b) => b.type !== 'img')
      .map((b) => b.text)
      .join(' ')
    // `ocr: true` in documents.ts forces OCR for a PDF whose text layer drops
    // glyphs too rarely for looksCorrupted() to notice.
    if (doc.ocr || looksCorrupted(xmlPlain) || xmlPlain.trim() === '') {
      if (hasTesseract()) {
        const ocrBlocks = ocrToBlocks(pdfPath, tmp)
        if (ocrBlocks.length && !looksCorrupted(ocrBlocks.map((b) => b.text).join(' '))) {
          blocks = ocrBlocks
          source = 'ocr'
        }
        // If OCR didn't produce cleaner text, the original was likely a
        // false-positive (legit content tripped the heuristic) — keep it quietly.
      } else {
        console.warn(
          `  WARN ${doc.slug}: corrupted text layer and tesseract not installed — ` +
            `install tesseract-ocr for a clean transcription.`
        )
      }
    }

    // Plain text for SEO description + screen-reader summary fallback.
    const plain = blocks
      .filter((b) => b.type !== 'img')
      .map((b) => b.text)
      .join('\n\n')

    const outFile = path.join(OUT_DATA, `${doc.slug}.json`)
    writeFileSync(
      outFile,
      JSON.stringify({ slug: doc.slug, title: doc.title, source, blocks, plain }, null, 2) + '\n'
    )
    rmSync(tmp, { recursive: true, force: true })

    const nText = blocks.filter((b) => b.type !== 'img').length
    const nImg = blocks.filter((b) => b.type === 'img').length
    console.log(`  ${doc.slug}: ${nText} text blocks, ${nImg} images`)
    manifest.push({ slug: doc.slug, textBlocks: nText, images: nImg })
  }

  // Emit a typed index barrel that statically imports every content JSON and
  // maps it by slug. The page route consumes this instead of reading files by
  // an interpolated path, so there is no `fs`/path-construction taint from the
  // (untrusted-to-CodeQL) route param — and it works without a server FS.
  const sorted = [...manifest].sort((a, b) => a.slug.localeCompare(b.slug))
  const importLines = sorted.map((m, i) => `import doc${i} from './${m.slug}.json'`)
  const entries = sorted.map((m, i) => `  '${m.slug}': doc${i} as DocumentContentJson,`)
  const indexTs =
    `// AUTO-GENERATED by scripts/extract-pdf-content.mjs — do not edit by hand.\n` +
    `// Re-run \`npm run extract:docs\` to regenerate.\n` +
    `import type { ContentBlock } from '@/components/DocumentContent'\n` +
    importLines.join('\n') +
    `\n\nexport type DocumentContentJson = {\n` +
    `  slug: string\n  title: string\n  source: 'text' | 'ocr'\n` +
    `  blocks: ContentBlock[]\n  plain: string\n}\n\n` +
    `/** Extracted document content, keyed by document slug. */\n` +
    `export const DOCUMENT_CONTENT: Record<string, DocumentContentJson> = {\n` +
    entries.join('\n') +
    `\n}\n`
  writeFileSync(path.join(OUT_DATA, 'index.ts'), indexTs)

  console.log(`\nExtracted ${manifest.length} documents → src/data/document-content/`)
}

run()
