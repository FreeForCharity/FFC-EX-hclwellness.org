'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiMenu, FiChevronDown } from 'react-icons/fi'
import { RxCross2 } from 'react-icons/rx'
import { assetPath } from '@/lib/assetPath'

type NavChild = { label: string; path: string }
type NavItem = { label: string; path?: string; children?: NavChild[] }

// Mirrors the live hclwellness.org primary navigation.
const NAV: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About Us', path: '/about-us' },
  { label: 'Team', path: '/team' },
  { label: 'Promoting Healthy Collaboration', path: '/training' },
  {
    label: 'Get Involved',
    children: [
      { label: 'Volunteer', path: '/volunteer' },
      { label: 'Post Healthy Ideas', path: '/post-healthy-ideas' },
    ],
  },
  {
    label: 'Events',
    children: [
      { label: 'Calendar', path: '/calendar' },
      { label: 'Contest', path: '/contest' },
    ],
  },
  {
    label: 'Resources',
    children: [
      { label: 'Documents Library', path: '/documents' },
      { label: 'Evidenced-based resources', path: '/evidenced-based-resources' },
      { label: 'Micromobility & Safety', path: '/micromobility-information-and-resources' },
      { label: 'Annual Summary & Plan', path: '/summary-24-25-plan-2025-26' },
      { label: 'Post Healthy Ideas', path: '/post-healthy-ideas' },
    ],
  },
  {
    label: 'Blog',
    children: [
      { label: 'Blog Articles', path: '/blog' },
      { label: 'News', path: '/news' },
    ],
  },
]

const DONATE_URL =
  'https://www.zeffy.com/embed/donation-form/8e423183-d093-41c4-91a0-947ff24c3bee?modal=true'

const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Home">
          <Image
            src={assetPath('/wp-content/uploads/2021/08/HCL1.png')}
            alt="Healthy Community Lifespaces"
            width={56}
            height={56}
            className="h-12 w-auto"
            priority
          />
          <span className="hidden text-sm font-semibold leading-tight text-gray-800 sm:block">
            Healthy Community
            <br />
            Lifespaces
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) =>
              item.children ? (
                <li key={item.label} className="group relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-3 py-2 text-sm font-medium text-gray-700 hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                    aria-haspopup="true"
                  >
                    {item.label}
                    <FiChevronDown aria-hidden className="text-xs" />
                  </button>
                  <ul className="invisible absolute left-0 top-full z-10 min-w-56 rounded-md border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    {item.children.map((c) => (
                      <li key={c.label + c.path}>
                        <Link
                          href={c.path}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700"
                        >
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={item.label}>
                  <Link
                    href={item.path!}
                    className="rounded px-3 py-2 text-sm font-medium text-gray-700 hover:text-green-700"
                  >
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 sm:inline-block"
          >
            Donate
          </a>
          <button
            type="button"
            className="rounded p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <RxCross2 size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileOpen && (
        <nav aria-label="Mobile" className="border-t border-gray-100 bg-white lg:hidden">
          <ul className="space-y-1 px-4 py-3">
            {NAV.map((item) => (
              <li key={item.label}>
                {item.path ? (
                  <Link
                    href={item.path}
                    className="block rounded px-3 py-2 text-sm font-medium text-gray-800 hover:bg-green-50"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <>
                    <span className="block px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {item.label}
                    </span>
                    <ul className="ml-3 space-y-1">
                      {item.children!.map((c) => (
                        <li key={c.label + c.path}>
                          <Link
                            href={c.path}
                            className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-green-50"
                            onClick={() => setMobileOpen(false)}
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
            <li>
              <a
                href={DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-full bg-green-600 px-5 py-2 text-center text-sm font-semibold text-white hover:bg-green-700"
              >
                Donate
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}

export default Header
