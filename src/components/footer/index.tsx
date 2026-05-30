'use client'

import React from 'react'
import Link from 'next/link'
import { Mail, Link2 } from 'lucide-react'
import { FaLinkedinIn } from 'react-icons/fa'
import type { IconType } from 'react-icons'
import type { LucideIcon } from 'lucide-react'

import { siteConfig } from '@/lib/site.config'

// Maps a social link's label to an icon; unknown labels fall back to a
// generic link icon so adding a network later still renders sensibly.
const socialIconByLabel: Record<string, IconType | LucideIcon> = {
  LinkedIn: FaLinkedinIn,
}

const QUICK_LINKS = [
  { label: 'About Us', path: '/about-us' },
  { label: 'Our Vision', path: '/our-vision' },
  { label: 'Team', path: '/team' },
  { label: 'Volunteer', path: '/volunteer' },
  { label: 'Evidenced-based resources', path: '/evidenced-based-resources' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact Us', path: '/contact-us' },
]

const Footer: React.FC = () => {
  const currentYear = React.useMemo(() => new Date().getFullYear(), [])
  const socialLinks = siteConfig.social.filter((s) => s.href)

  return (
    <footer className="bg-gray-900 text-gray-200">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-3 md:px-6 lg:px-8">
        {/* Mission */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Healthy Community Lifespaces</h2>
          <p className="text-sm leading-relaxed text-gray-400">{siteConfig.shortDescription}</p>
          {socialLinks.length > 0 && (
            <div className="flex gap-3 pt-2">
              {socialLinks.map((s) => {
                const Icon = socialIconByLabel[s.label] ?? Link2
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-green-600"
                  >
                    <Icon aria-hidden size={16} />
                  </a>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <nav aria-label="Footer" className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Quick Links</h2>
          <ul className="space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.path}>
                <Link href={l.path} className="text-gray-400 hover:text-green-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Contact Us</h2>
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-400"
          >
            <Mail aria-hidden size={16} />
            {siteConfig.contactEmail}
          </a>
          <p className="text-sm text-gray-400">
            Healthy Community Lifespaces is a Pennsylvania-based nonprofit advancing community
            health, nutrition, and safe, walkable neighborhoods.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <p className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-gray-500 md:px-6 lg:px-8">
          © {currentYear} Healthy Community Lifespaces. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

export default Footer
