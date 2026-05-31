import React from 'react'
import SiteContent from '@/components/SiteContent'
import { getHome } from '@/lib/content'

const HomePage = () => {
  const home = getHome()
  if (!home) return null
  return (
    <article className="wp-site-blocks">
      <SiteContent html={home.html} />
    </article>
  )
}

export default HomePage
