import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import WordPressContent from '@/components/WordPressContent'
import { getPosts, getPostBySlug } from '@/lib/wordpress'

/**
 * Renders migrated WordPress posts at /blog/<slug>. (On the live site the news
 * content lives in pages — surfaced via /blog and /[slug] — but any genuine
 * WP posts are kept accessible here so no harvested content is dropped.)
 */
export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.title || undefined,
    description: post.excerpt || undefined,
    alternates: { canonical: post.route },
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <article className="wp-site-blocks mx-auto w-full max-w-5xl px-4 py-10">
      {post.title && (
        <h1 className="wp-page-title mb-6 text-3xl font-bold text-gray-900">{post.title}</h1>
      )}
      <WordPressContent html={post.html} />
    </article>
  )
}
