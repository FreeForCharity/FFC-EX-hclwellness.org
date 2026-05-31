import React from 'react'
import type { Metadata } from 'next'
import PdfDocument from '@/components/PdfDocument'
import { DOCUMENT_GROUPS } from '@/data/documents'

export const metadata: Metadata = {
  title: 'Documents Library',
  description:
    'Read and download the documents provided by Healthy Community Lifespaces — healthy schools, student contests, organizational planning, and micromobility & road safety resources.',
  alternates: { canonical: '/documents' },
}

/**
 * Consolidated index of every charity-supplied PDF (issue #59). Each document
 * can be read inline (no download required) or downloaded, and links back to
 * the page where it appears in context.
 */
export default function DocumentsPage() {
  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="mb-3 text-3xl font-bold text-gray-900">Documents Library</h1>
      <p className="mb-8 max-w-3xl text-gray-700">
        Browse the documents shared by Healthy Community Lifespaces. You can read each one right
        here without downloading, open it in a new tab, or download a copy. Each document also links
        back to the page where it appears in context.
      </p>

      {DOCUMENT_GROUPS.map((group) => (
        <section key={group.title} className="mb-10">
          <h2 className="mb-1 text-2xl font-semibold text-gray-900">{group.title}</h2>
          {group.description && <p className="mb-4 max-w-3xl text-gray-600">{group.description}</p>}
          <div className="space-y-5">
            {group.docs.map((doc) => (
              <PdfDocument key={doc.file} doc={doc} />
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
