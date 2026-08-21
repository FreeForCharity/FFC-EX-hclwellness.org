import React from 'react'
import Link from 'next/link'
import type { ContentEntry } from '@/lib/content'
import { assetPath } from '@/lib/assetPath'

function formatDate(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * One article card in a blog listing grid: featured image (or accent bar),
 * date, category chips, title, excerpt, and a "Read more" affordance. Shared
 * by the main blog index and the Teen Health Blog.
 */
export default function ArticleCard({ article: a }: { article: ContentEntry }) {
  return (
    <Link
      href={a.route}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-green-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
    >
      {a.featuredImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={assetPath(a.featuredImage)}
          alt=""
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div aria-hidden className="h-2 w-full bg-gradient-to-r from-green-500 to-green-700" />
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {a.date && (
            <time
              dateTime={a.date}
              className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800"
            >
              {formatDate(a.date)}
            </time>
          )}
          {a.categories.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
            >
              {c}
            </span>
          ))}
        </div>

        <h2 className="text-lg font-semibold leading-snug text-gray-900 group-hover:text-green-700">
          {a.title}
        </h2>

        {a.excerpt && <p className="mt-2 line-clamp-3 text-sm text-gray-600">{a.excerpt}</p>}

        <span className="mt-4 inline-flex items-center text-sm font-semibold text-green-700">
          Read more
          <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  )
}
