import { getArticles, getTeenArticles, TEEN_ARTICLE_SLUGS } from '@/lib/content'

/**
 * Guards the Teen Health Blog curation (issue #108): every slug in the curated
 * teen list must exist as a real article, or the teen blog silently loses
 * content.
 */
describe('teen articles', () => {
  it('every curated teen slug resolves to a published article', () => {
    const articleSlugs = new Set(getArticles().map((a) => a.slug))
    for (const slug of TEEN_ARTICLE_SLUGS) {
      expect(articleSlugs).toContain(slug)
    }
  })

  it('getTeenArticles returns exactly the curated articles, newest first', () => {
    const teen = getTeenArticles()
    expect(teen.length).toBe(TEEN_ARTICLE_SLUGS.size)
    const dates = teen.map((a) => a.date || '')
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates)
  })

  it('includes the teen anxiety article', () => {
    expect(getTeenArticles().some((a) => a.title.includes('Anxiety'))).toBe(true)
  })
})
