import React from 'react'
import WordPressContent from '@/components/WordPressContent'
import { getHome } from '@/lib/wordpress'

const HomePage = () => {
  const home = getHome()
  if (!home) return null
  return (
    <article className="wp-site-blocks">
      <WordPressContent html={home.html} />
    </article>
  )
}

export default HomePage
