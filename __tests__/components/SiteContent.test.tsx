import React from 'react'
import { render } from '@testing-library/react'
import SiteContent from '../../src/components/SiteContent'

/**
 * Guards the PDF handling in migrated WordPress File blocks (issue #101).
 * A regression here means visitors — especially on phones — see a blank gap
 * where a document should be.
 */

// A File block exactly as WordPress emits it: preview hidden behind the
// Interactivity API directive, empty <object> body, download-only button.
const FILE_BLOCK =
  '<div data-wp-interactive="core/file" class="wp-block-file">' +
  '<object data-wp-bind--hidden="!state.hasPdfPreview" hidden class="wp-block-file__embed" ' +
  'data="/wp-content/uploads/2026/03/vegetable-contest-2026-27.pdf" type="application/pdf" ' +
  'style="width:100%;height:600px" aria-label="Embed of vegetable contest 2026-27."></object>' +
  '<a id="wp-block-file--media-abc" href="/wp-content/uploads/2026/03/vegetable-contest-2026-27.pdf">vegetable contest</a>' +
  '<a href="/wp-content/uploads/2026/03/vegetable-contest-2026-27.pdf" ' +
  'class="wp-block-file__button wp-element-button" download aria-describedby="wp-block-file--media-abc">Download</a>' +
  '</div>'

function html(markup: string): string {
  const { container } = render(<SiteContent html={markup} />)
  return container.innerHTML
}

describe('SiteContent PDF embeds', () => {
  it('reveals the embed by stripping hidden and the WP directive', () => {
    const out = html(FILE_BLOCK)
    expect(out).not.toContain('data-wp-bind--hidden')
    const objectTag = out.match(/<object[^>]*>/)?.[0] ?? ''
    expect(objectTag).not.toMatch(/\shidden(?=[\s>])/)
  })

  it('gives the empty <object> a fallback so phones do not see a blank gap', () => {
    const out = html(FILE_BLOCK)
    expect(out).toContain('pdf-embed-fallback')
    expect(out).toContain('Open it in a new tab')
    expect(out).toContain('download it')
  })

  it('adds a View button beside the Download button', () => {
    const { container } = render(<SiteContent html={FILE_BLOCK} />)
    const view = container.querySelector('a[target="_blank"].wp-block-file__button')
    expect(view).not.toBeNull()
    expect(view?.textContent).toBe('View')
    expect(view?.getAttribute('href')).toBe(
      '/wp-content/uploads/2026/03/vegetable-contest-2026-27.pdf'
    )
    expect(view?.getAttribute('rel')).toContain('noopener')
    // The original Download button survives.
    expect(container.querySelector('a[download]')).not.toBeNull()
  })

  it('handles a bare <object> embed that is not inside a File block', () => {
    const out = html(
      '<object style="width: 100%; height: 600px;" data="/wp-content/uploads/2025/02/UMASD-State-fruit-essay.pdf" type="application/pdf"></object>'
    )
    expect(out).toContain('pdf-embed-fallback')
    expect(out).toContain('/wp-content/uploads/2025/02/UMASD-State-fruit-essay.pdf')
  })

  it('leaves an <object> that already has fallback content alone', () => {
    const out = html(
      '<object data="/a.pdf" type="application/pdf"><p>existing fallback</p></object>'
    )
    expect(out).toContain('existing fallback')
    expect(out).not.toContain('pdf-embed-fallback')
  })

  it('leaves content without PDFs untouched', () => {
    const out = html('<p class="wp-block-paragraph">Just text.</p>')
    expect(out).toContain('Just text.')
    expect(out).not.toContain('pdf-embed-fallback')
  })
})
