import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Mock next/font/local so it echoes the call's configuration back out.
// next/jest's default mock returns the literal "variable", which strips the
// data this test is about (the CSS variable name and the src file list).
jest.mock('next/font/local', () => ({
  __esModule: true,
  default: (config: Record<string, unknown>) => ({
    className: 'mock-className',
    style: { fontFamily: 'mock-family' },
    variable: config.variable,
    src: config.src,
    display: config.display,
  }),
}))

import {
  openSans,
  lato,
  raleway,
  faustina,
  cantataOne,
  faunaOne,
  montserrat,
  cinzel,
} from '../../src/lib/fonts'

const ROOT = resolve(__dirname, '..', '..')
const FONTS_MODULE_DIR = join(ROOT, 'src', 'lib')

type Loaded = { variable?: string; display?: string; src?: { path: string; weight?: string }[] }

const allFonts: Record<string, Loaded> = {
  openSans,
  lato,
  raleway,
  faustina,
  cantataOne,
  faunaOne,
  montserrat,
  cinzel,
}

describe('fonts module exports', () => {
  it('exports exactly the eight expected font instances', () => {
    expect(Object.keys(allFonts).sort()).toEqual(
      [
        'cantataOne',
        'cinzel',
        'faunaOne',
        'faustina',
        'lato',
        'montserrat',
        'openSans',
        'raleway',
      ].sort()
    )
  })

  it('exposes the CSS variable name each stylesheet already references', () => {
    const expected: Record<string, string> = {
      openSans: '--font-open-sans',
      lato: '--font-lato',
      raleway: '--font-raleway',
      faustina: '--font-faustina',
      cantataOne: '--font-cantata-one',
      faunaOne: '--font-fauna-one',
      montserrat: '--font-montserrat',
      cinzel: '--font-cinzel',
    }
    for (const [name, font] of Object.entries(allFonts)) {
      expect({ name, variable: font.variable }).toEqual({ name, variable: expected[name] })
    }
  })

  it('uses display:swap for every font', () => {
    for (const [name, font] of Object.entries(allFonts)) {
      expect({ name, display: font.display }).toEqual({ name, display: 'swap' })
    }
  })
})

describe('self-hosted font files', () => {
  // The point of this suite: the build must not depend on Google. A missing
  // woff2 would fail `next build` loudly, but a MISSING LICENCE would not fail
  // anything at all -- these fonts are OFL-licensed and the licence has to
  // travel with the font, so it is asserted here rather than left to review.
  it('every declared src path is a committed file', () => {
    for (const [name, font] of Object.entries(allFonts)) {
      for (const entry of font.src ?? []) {
        const abs = resolve(FONTS_MODULE_DIR, entry.path)
        expect({ name, path: entry.path, exists: existsSync(abs) }).toEqual({
          name,
          path: entry.path,
          exists: true,
        })
      }
    }
  })

  it('declares at least one src file for every font', () => {
    for (const [name, font] of Object.entries(allFonts)) {
      expect({ name, files: (font.src ?? []).length > 0 }).toEqual({ name, files: true })
    }
  })

  it("ships each family's OFL licence alongside its woff2", () => {
    const dirs = new Set<string>()
    for (const font of Object.values(allFonts)) {
      for (const entry of font.src ?? []) {
        dirs.add(resolve(FONTS_MODULE_DIR, entry.path, '..'))
      }
    }
    expect(dirs.size).toBe(8)
    for (const dir of dirs) {
      expect({ dir: dir.slice(ROOT.length + 1), ofl: existsSync(join(dir, 'OFL.txt')) }).toEqual({
        dir: dir.slice(ROOT.length + 1),
        ofl: true,
      })
    }
  })

  it('loads fonts through next/font/local, not next/font/google', () => {
    const body = readFileSync(join(FONTS_MODULE_DIR, 'fonts.ts'), 'utf8')
    expect(body).toMatch(/from\s+['"]next\/font\/local['"]/)
    // Comments may legitimately name the banned loader to explain why it is
    // banned, so only a real import statement counts.
    const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(withoutComments).not.toMatch(/from\s+['"]next\/font\/google['"]/)
  })
})
