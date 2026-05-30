import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getArticles } from '@/lib/wordpress'

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
    <article className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Blog &amp; News</h1>
        <p className="mt-2 text-gray-600">
          News, articles, and health-promotion stories from Healthy Community Lifespaces.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {articles.map((a) => (
          <li
            key={a.id}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            {a.date && (
              <time dateTime={a.date} className="text-xs font-medium uppercase text-green-700">
                {formatDate(a.date)}
              </time>
            )}
            <h2 className="mt-2 text-lg font-semibold text-gray-900">
              <Link href={a.route} className="hover:text-green-700">
                {a.title}
              </Link>
            </h2>
            {a.excerpt && <p className="mt-2 line-clamp-3 text-sm text-gray-600">{a.excerpt}</p>}
            <Link
              href={a.route}
              className="mt-4 inline-block text-sm font-medium text-green-700 hover:underline"
            >
              Read more →
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}
