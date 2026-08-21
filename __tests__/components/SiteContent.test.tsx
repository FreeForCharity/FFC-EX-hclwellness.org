import React from 'react'
import { render } from '@testing-library/react'
import SiteContent from '../../src/components/SiteContent'

/**
 * Guards the PDF handling in migrated WordPress content (issues #59 and #101).
 * File blocks and bare PDF <object> embeds render as a blank gap on browsers
 * without a built-in PDF viewer (every iOS browser, Android Chrome), so
 * SiteContent replaces them with a "Read online / Download" callout. A
 * regression here means visitors — especially on phones — see a blank gap
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

describe('SiteContent PDF handling', () => {
  it('replaces a File block with a document callout (no blank <object> embed)', () => {
    const out = html(FILE_BLOCK)
    expect(out).toContain('ffc-doc-callout')
    expect(out).not.toContain('<object')
    expect(out).toContain('vegetable contest')
  })

  it('links "Read online" to the document content page when the PDF has one', () => {
    const { container } = render(<SiteContent html={FILE_BLOCK} />)
    const read = container.querySelector('a.ffc-doc-read')
    expect(read).not.toBeNull()
    expect(read?.getAttribute('href')).toBe('/documents/vegetable-contest-2026-27')
  })

  it('keeps a working Download link', () => {
    const { container } = render(<SiteContent html={FILE_BLOCK} />)
    const download = container.querySelector('a.ffc-doc-download[download]')
    expect(download).not.toBeNull()
    expect(download?.getAttribute('href')).toBe(
      '/wp-content/uploads/2026/03/vegetable-contest-2026-27.pdf'
    )
  })

  it('rewrites a bare empty <object> embed that is not inside a File block', () => {
    const out = html(
      '<object style="width: 100%; height: 600px;" data="/wp-content/uploads/2025/02/UMASD-State-fruit-essay.pdf" type="application/pdf"></object>'
    )
    expect(out).toContain('ffc-doc-callout')
    expect(out).not.toContain('<object')
    // No content page for this PDF, so the reader link opens the PDF itself.
    expect(out).toContain('Open PDF')
    expect(out).toContain('/wp-content/uploads/2025/02/UMASD-State-fruit-essay.pdf')
  })

  it('leaves an <object> that already has fallback content alone', () => {
    const out = html(
      '<object data="/a.pdf" type="application/pdf"><p>existing fallback</p></object>'
    )
    expect(out).toContain('existing fallback')
    expect(out).not.toContain('ffc-doc-callout')
  })

  it('leaves content without PDFs untouched', () => {
    const out = html('<p class="wp-block-paragraph">Just text.</p>')
    expect(out).toContain('Just text.')
    expect(out).not.toContain('ffc-doc-callout')
  })
})
