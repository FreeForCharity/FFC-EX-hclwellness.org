import React from 'react'
import Link from 'next/link'
import { assetPath } from '@/lib/assetPath'
import type { PdfDoc } from '@/data/documents'

/**
 * A single document card in the Documents Library.
 *
 * "Read online" links to the document's content page (/documents/<slug>/),
 * which renders the text and images as real HTML — readable on any device with
 * no PDF plugin. (The previous inline `<object>` embed rendered as a blank box
 * on browsers without a built-in PDF viewer, notably Android Chrome.) A direct
 * Download link and a link back to the document's source page are also offered.
 */
export default function PdfDocument({ doc }: { doc: PdfDoc }) {
  const readHref = `/documents/${doc.slug}`
  const pdfHref = assetPath(doc.file)
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">
        <Link href={readHref} className="hover:text-blue-800 hover:underline">
          {doc.title}
        </Link>
      </h3>
      {doc.description && <p className="mt-1 text-sm text-gray-600">{doc.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
        <Link
          href={readHref}
          className="rounded bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800"
        >
          📄 Read online
        </Link>
        <a href={pdfHref} download className="text-blue-700 underline hover:text-blue-900">
          Download PDF
        </a>
        {doc.sourceRoute && (
          <Link href={doc.sourceRoute} className="text-gray-600 underline hover:text-gray-900">
            {doc.sourceLabel ? `View on “${doc.sourceLabel}”` : 'View in context'} →
          </Link>
        )}
      </div>
    </article>
  )
}
