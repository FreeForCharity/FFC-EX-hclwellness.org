import React from 'react'
import Image from 'next/image'
import { assetPath } from '@/lib/assetPath'

/**
 * One content block extracted from a PDF (see scripts/extract-pdf-content.mjs).
 * Text blocks carry `text`; image blocks carry a root-relative `src` under
 * /documents/<slug>/.
 */
export type ContentBlock =
  | { type: 'h2' | 'h3' | 'p' | 'li'; text: string }
  | { type: 'img'; src: string }

/**
 * Renders a document's extracted blocks as real, reflowing HTML — headings,
 * paragraphs, list items, and inline images. This replaces the old inline PDF
 * `<object>` embed, which rendered as a blank box on browsers without a built-in
 * PDF viewer (notably Android Chrome). The output is selectable, screen-reader
 * accessible, search-indexable, and responsive on any device.
 *
 * Consecutive `li` blocks are grouped into a single <ul>.
 */
export default function DocumentContent({
  blocks,
  title,
}: {
  blocks: ContentBlock[]
  title: string
}) {
  const out: React.ReactNode[] = []
  let list: string[] = []

  const flushList = (key: string) => {
    if (list.length) {
      out.push(
        <ul key={key} className="my-4 list-disc space-y-1 pl-6 text-gray-800">
          {list.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )
      list = []
    }
  }

  blocks.forEach((b, i) => {
    if (b.type === 'li') {
      list.push(b.text)
      return
    }
    flushList(`ul-${i}`)
    if (b.type === 'h2') {
      out.push(
        <h2 key={i} className="mt-8 mb-3 text-2xl font-bold text-gray-900">
          {b.text}
        </h2>
      )
    } else if (b.type === 'h3') {
      out.push(
        <h3 key={i} className="mt-6 mb-2 text-xl font-semibold text-gray-900">
          {b.text}
        </h3>
      )
    } else if (b.type === 'p') {
      out.push(
        <p key={i} className="my-3 leading-relaxed text-gray-800">
          {b.text}
        </p>
      )
    } else if (b.type === 'img') {
      out.push(
        <span key={i} className="my-5 block">
          <Image
            src={assetPath(b.src)}
            alt={`Figure from ${title}`}
            width={900}
            height={0}
            sizes="(max-width: 768px) 100vw, 768px"
            className="h-auto w-full max-w-2xl rounded border border-gray-200"
            style={{ height: 'auto' }}
            unoptimized
          />
        </span>
      )
    }
  })
  flushList('ul-end')

  return <div className="document-content">{out}</div>
}
