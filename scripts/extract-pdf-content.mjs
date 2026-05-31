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
    docs.push({ slug: m[1], title: (m[2] ?? m[3]).replace(/\\'/g, "'"), file: m[4] })
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

/** Strip inline <b>/<i>/<a> tags pdftohtml leaves inside text runs, keep text. */
function stripInline(s) {
  return s.replace(/<[^>]+>/g, '')
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

  const blocks = []
  let para = null // accumulating paragraph: { lines: [{top,text}], lastBottom }

  const flushPara = () => {
    if (para && para.lines.length) {
      let text = para.lines
        .map((l) => l.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (para.list) text = text.replace(/^([•·▪◦‣*-]|\d+[.)]|[a-z][.)])\s+/, '')
      if (text) blocks.push({ type: para.list ? 'li' : 'p', text })
    }
    para = null
  }

  for (const e of elements) {
    if (e.kind === 'image') {
      flushPara()
      blocks.push({ type: 'img', src: imgRename(e.src) })
      continue
    }
    const sz = fontSizes.get(e.font) ?? bodySize
    const isHeading = bodySize > 0 && sz >= bodySize * 1.18 && e.text.length <= 120
    if (isHeading) {
      flushPara()
      blocks.push({ type: sz >= bodySize * 1.5 ? 'h2' : 'h3', text: e.text })
      continue
    }
    // A line that begins with a bullet/number marker starts a new list item.
    const isBullet = /^([•·▪◦‣*-]|\d+[.)]|[a-z][.)])\s+/.test(e.text)
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

  // Collapse runs of identical-type empties; drop blocks that are just page numbers.
  return blocks.filter((b) => {
    if (b.type === 'img') return true
    return b.text && !/^\d{1,3}$/.test(b.text)
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
    for (const chunk of txt.split(/\n\s*\n/)) {
      let para = chunk
        .replace(/\s*\n\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      // Common OCR glyph confusions: a lone "|" (or "l") standing as a word is
      // the pronoun "I"; tesseract frequently misreads it on these fonts.
      para = para.replace(/(^|\s)[|l](\s|$)/g, '$1I$2')
      // Drop OCR noise: empty, lone page numbers, or single stray characters.
      if (para.length > 2 && !/^\d{1,3}$/.test(para)) blocks.push({ type: 'p', text: para })
    }
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

    // If the text layer is corrupted (unmapped ligature/hyphen glyphs), re-read
    // the document with OCR, which transcribes the rendered glyphs correctly.
    const xmlPlain = blocks
      .filter((b) => b.type !== 'img')
      .map((b) => b.text)
      .join(' ')
    if (looksCorrupted(xmlPlain)) {
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

  console.log(`\nExtracted ${manifest.length} documents → src/data/document-content/`)
}

run()
