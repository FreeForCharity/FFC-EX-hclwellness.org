import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getArticles } from '@/lib/wordpress'
import { assetPath } from '@/lib/assetPath'

export const metadata: Metadata = {
  title: 'Blog & News',
  description: 'News, articles, and health-promotion stories from Healthy Community Lifespaces.',
  alternates: { canonical: '/blog' },
}

function formatDate(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const articles = getArticles()

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-12">
      <header className="mb-10 border-b-4 border-green-600 pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Healthy Community Lifespaces
        </p>
        <h1 className="mt-1 text-4xl font-bold text-gray-900">Blog &amp; News</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          News, articles, and health-promotion stories — healthy eating, safe routes to school,
          school wellness, and community health.
        </p>
        <p className="mt-2 text-sm text-gray-500">{articles.length} articles</p>
      </header>

      <ul className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <li key={a.id} className="h-full">
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
                <div
                  aria-hidden
                  className="h-2 w-full bg-gradient-to-r from-green-500 to-green-700"
                />
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

                {a.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{a.excerpt}</p>
                )}

                <span className="mt-4 inline-flex items-center text-sm font-semibold text-green-700">
                  Read more
                  <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
