import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WordPressContent from '@/components/WordPressContent'
import { getPages, getPageBySlug, DEDICATED_ROUTE_SLUGS } from '@/lib/wordpress'

/**
 * Renders every migrated WordPress page (except the front page) at its
 * original top-level slug — e.g. /about-us, /team, /contest — so the static
 * site preserves the live URL structure exactly.
 *
 * Slugs in DEDICATED_ROUTE_SLUGS (e.g. /blog) are skipped because a dedicated
 * static route owns them.
 */
export function generateStaticParams() {
  return getPages()
    .filter((p) => !DEDICATED_ROUTE_SLUGS.has(p.slug))
    .map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getPageBySlug(slug)
  if (!page) return {}
  return {
    title: page.title || undefined,
    description: page.excerpt || undefined,
    alternates: { canonical: page.route },
    openGraph: page.featuredImage
      ? { images: [{ url: page.featuredImage }], title: page.title }
      : { title: page.title },
  }
}

export default async function WordPressPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = getPageBySlug(slug)
  if (!page) notFound()

  return (
    <article className="wp-site-blocks mx-auto w-full max-w-5xl px-4 py-10">
      {page.title && (
        <h1 className="wp-page-title mb-6 text-3xl font-bold text-gray-900">{page.title}</h1>
      )}
      <WordPressContent html={page.html} />
    </article>
  )
}
