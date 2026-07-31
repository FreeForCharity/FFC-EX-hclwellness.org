import React from 'react'
import { render, screen } from '@testing-library/react'
import RelatedDocuments from '../../src/components/RelatedDocuments'
import { getDocumentsForRoute } from '../../src/data/documents'

describe('getDocumentsForRoute', () => {
  it('matches regardless of surrounding slashes', () => {
    const bare = getDocumentsForRoute('contest')
    expect(bare.length).toBeGreaterThan(0)
    expect(getDocumentsForRoute('/contest')).toEqual(bare)
    expect(getDocumentsForRoute('/contest/')).toEqual(bare)
  })

  it('returns nothing for a page with no documents', () => {
    expect(getDocumentsForRoute('about-us')).toEqual([])
  })
})

describe('RelatedDocuments', () => {
  // The three pages the charity called out in issue #101.
  it.each(['contest', 'post-healthy-ideas', 'micromobility-information-and-resources'])(
    'lists documents and links the library on /%s',
    (slug) => {
      render(<RelatedDocuments route={slug} />)
      expect(screen.getByRole('heading', { name: 'Documents on this page' })).toBeInTheDocument()

      const library = screen.getByRole('link', { name: /Documents Library/i })
      expect(library).toHaveAttribute('href', '/documents')

      const docs = getDocumentsForRoute(slug)
      expect(docs.length).toBeGreaterThan(0)
      for (const doc of docs) {
        expect(screen.getByRole('link', { name: doc.title })).toHaveAttribute('target', '_blank')
      }
    }
  )

  it('renders nothing when the page has no documents', () => {
    const { container } = render(<RelatedDocuments route="about-us" />)
    expect(container).toBeEmptyDOMElement()
  })
})
