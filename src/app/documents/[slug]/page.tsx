import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import DocumentContent from '@/components/DocumentContent'
import { assetPath } from '@/lib/assetPath'
import { ALL_DOCUMENTS, getDocBySlug } from '@/data/documents'
import { DOCUMENT_CONTENT } from '@/data/document-content'

/**
 * Look up a document's extracted content from the auto-generated index
 * (scripts/extract-pdf-content.mjs → src/data/document-content/index.ts). The
 * JSON is statically imported and keyed by slug — no filesystem access or
 * path construction from the route param — so the content is bundled with the
 * static export and there is no path-injection surface.
 */
function loadContent(slug: string) {
  return DOCUMENT_CONTENT[slug] ?? null
}

export function generateStaticParams() {
  return ALL_DOCUMENTS.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  if (!doc) return {}
  const content = loadContent(slug)
  const description =
    doc.description ||
    (content?.plain ? content.plain.slice(0, 155).replace(/\s+\S*$/, '') : undefined)
  return {
    title: doc.title,
    description,
    alternates: { canonical: `/documents/${slug}` },
  }
}

/**
 * A single document's content page (issue #59). Renders the document text and
 * images as real HTML — readable on any device with no PDF plugin — plus
 * prominent Download / Open-PDF actions and a link back to the page where the
 * document appears in context.
 */
export default async function DocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const doc = getDocBySlug(slug)
  if (!doc) notFound()
  const content = loadContent(slug)
  if (!content) notFound()

  const pdfHref = assetPath(doc.file)

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/documents" className="underline hover:text-gray-800">
          Documents Library
        </Link>{' '}
        / <span className="text-gray-700">{doc.title}</span>
      </nav>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">{doc.title}</h1>
      {doc.description && <p className="mb-5 text-gray-600">{doc.description}</p>}

      {/* Action bar: download / open the original PDF, and jump to context. */}
      <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-gray-200 py-4 text-sm font-medium">
        <a
          href={pdfHref}
          download
          className="rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
        >
          ⬇ Download PDF
        </a>
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline hover:text-blue-900"
        >
          Open original PDF ↗
        </a>
        {doc.sourceRoute && (
          <Link
            href={doc.sourceRoute}
            className="ml-auto text-gray-600 underline hover:text-gray-900"
          >
            {doc.sourceLabel ? `On “${doc.sourceLabel}”` : 'View in context'} →
          </Link>
        )}
      </div>

      <DocumentContent blocks={content.blocks} title={doc.title} />

      <p className="mt-10 border-t border-gray-200 pt-4 text-sm text-gray-500">
        This page is a web-readable version of the original document.{' '}
        <a href={pdfHref} download className="underline hover:text-gray-800">
          Download the PDF
        </a>{' '}
        for the exact formatting.
      </p>
    </article>
  )
}
