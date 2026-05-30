import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site.config'
import { getPages, getPosts, DEDICATED_ROUTE_SLUGS } from '@/lib/wordpress'

export const dynamic = 'force-static'

type SitemapEntry = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

// Routes that have a `src/app/<slug>/page.tsx`. Add new top-level routes here
// so they appear in the sitemap. Sub-routes can be added with their full path.
//
// The unit test in __tests__/app/sitemap.test.ts diffs this list against the
// real `src/app/**` filesystem: if a `page.tsx` is added without a matching
// entry here the test fails, so the sitemap can never silently fall behind.
//
// Priority schema:
//   1.0 — root
//   0.8 — primary content pages (about, donate, volunteer, contact, programs)
//   0.5 — secondary content pages
//   0.2 — policy / legal pages
//
// changeFrequency: 'monthly' for content pages, 'yearly' for policy pages.
export const routes: readonly SitemapEntry[] = [
  // Trailing slashes match next.config `trailingSlash: true` (routes export as
  // <route>/index.html), keeping these consistent with the migrated WP routes.
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/blog/', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/privacy-policy/', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/cookie-policy/', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/terms-of-service/', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/donation-policy/', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/free-for-charity-donation-policy/', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/vulnerability-disclosure-policy/', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/security-acknowledgements/', changeFrequency: 'monthly', priority: 0.2 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries = routes.map((entry) => ({
    url: siteUrl(entry.path),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))

  // Migrated WordPress pages are served by the dynamic `src/app/[slug]` route,
  // so they aren't in the static `routes` list above — enumerate them here from
  // the same content the route renders. Skip slugs owned by a dedicated static
  // route (e.g. /blog) to avoid a duplicate entry.
  const wpEntries: MetadataRoute.Sitemap = [...getPages(), ...getPosts()]
    .filter((p) => !DEDICATED_ROUTE_SLUGS.has(p.slug))
    .map((p) => ({
      url: siteUrl(p.route),
      lastModified: p.modified ? new Date(p.modified) : now,
      changeFrequency: 'monthly',
      priority: p.type === 'post' ? 0.5 : 0.6,
    }))

  return [...staticEntries, ...wpEntries]
}
