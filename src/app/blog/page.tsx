import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleCard from '@/components/ArticleCard'
import { getArticles } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Blog & News',
  description: 'News, articles, and health-promotion stories from Healthy Community Lifespaces.',
  alternates: { canonical: '/blog' },
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

      <Link
        href="/blog/teen-health"
        className="group mb-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-5 transition hover:border-green-400 hover:bg-green-100"
      >
        <span>
          <span className="block text-lg font-bold text-gray-900">Teen Health Blog</span>
          <span className="block text-gray-600">Health articles for teens, written by teens.</span>
        </span>
        <span className="inline-flex items-center font-semibold text-green-700">
          Visit the Teen Health Blog
          <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </Link>

      <ul className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <li key={a.id} className="h-full">
            <ArticleCard article={a} />
          </li>
        ))}
      </ul>
    </article>
  )
}
