import React from 'react'
import Link from 'next/link'
import { assetPath } from '@/lib/assetPath'
import { getDocumentsForRoute } from '@/data/documents'

/**
 * "Documents on this page" panel (issue #101).
 *
 * Migrated WordPress pages embed their PDFs inline, which is fine on a desktop
 * browser but gives a phone nothing it can read. This panel lists every
 * document published on the page as a plain link — which every device can open
 * — and points at the Documents Library for the full collection.
 *
 * Renders nothing on pages that have no documents.
 */
export default function RelatedDocuments({ route }: { route: string }) {
  const docs = getDocumentsForRoute(route)
  if (docs.length === 0) return null

  return (
    <aside
      aria-labelledby="documents-on-this-page"
      className="mt-10 rounded-lg border border-gray-200 bg-gray-50 p-5"
    >
      <h2 id="documents-on-this-page" className="text-lg font-semibold text-gray-900">
        Documents on this page
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Open any document to read it in your browser — no download needed.
      </p>

      <ul className="mt-4 space-y-2">
        {docs.map((doc) => (
          <li key={doc.file} className="text-sm">
            <a
              href={assetPath(doc.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-700 underline hover:text-blue-900"
            >
              {doc.title}
            </a>
            {doc.description && <span className="text-gray-600"> — {doc.description}</span>}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm">
        <Link href="/documents" className="font-medium text-blue-700 underline hover:text-blue-900">
          Browse the full Documents Library →
        </Link>
      </p>
    </aside>
  )
}
