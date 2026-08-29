import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import ArticleCard from '@/components/ArticleCard'
import { getTeenArticles } from '@/lib/content'
import { siteConfig } from '@/lib/site.config'

export const metadata: Metadata = {
  title: 'Teen Health Blog',
  description:
    'Health articles for teens, written by teens — student contributors from the Healthy Community Lifespaces researcher program.',
  alternates: { canonical: '/blog/teen-health' },
}

/**
 * The Teen Health Blog (issue #108): a dedicated home for articles written by
 * teen/student contributors. Articles are curated via TEEN_ARTICLE_SLUGS in
 * src/lib/content.ts. The site is a static export with no upload backend, so
 * submissions come in as GitHub issues (the org prefers no email), matching
 * the footer's request-changes link.
 */
export default function TeenHealthBlog() {
  const articles = getTeenArticles()
  const submitHref = `${siteConfig.repoUrl}/issues/new?title=${encodeURIComponent(
    'Teen Health Blog submission'
  )}&body=${encodeURIComponent(
    'Paste your article text below (or drag a document/photos into this box), and tell us the author name to credit.\n\n'
  )}`

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-12">
      <header className="mb-10 border-b-4 border-green-600 pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          <Link href="/blog" className="hover:underline">
            Blog &amp; News
          </Link>
        </p>
        <h1 className="mt-1 text-4xl font-bold text-gray-900">Teen Health Blog</h1>
        <p className="mt-3 max-w-2xl text-lg text-gray-600">
          Health articles for teens, written by teens.
        </p>
        <p className="mt-2 max-w-2xl text-gray-600">
          Students in our researcher program write about the health topics that matter to them —
          from mental health to safe streets and healthy eating.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {articles.length} {articles.length === 1 ? 'article' : 'articles'}
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <li key={a.id} className="h-full">
            <ArticleCard article={a} />
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-xl border border-green-200 bg-green-50 p-6">
        <h2 className="text-xl font-bold text-gray-900">Are you a teen with a story to tell?</h2>
        <p className="mt-2 max-w-2xl text-gray-700">
          We publish health articles written by student contributors. Share your article on our
          GitHub page — paste the text or drag in a document, and our team will review it for
          publication here. (A free GitHub account is all you need.)
        </p>
        <a
          href={submitHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded bg-green-700 px-5 py-2.5 font-semibold text-white hover:bg-green-800"
        >
          Submit your article
        </a>
      </section>
    </article>
  )
}
