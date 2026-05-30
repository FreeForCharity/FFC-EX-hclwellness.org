/**
 * Test Configuration for Template Customization
 *
 * Content-specific values used in E2E tests. Update these when customizing the
 * template so the specs follow the site's content rather than hard-coding it.
 */

export const testConfig = {
  /**
   * Social media links shown in the footer (mirrors siteConfig.social).
   * Used in: tests/social-links.spec.ts
   */
  socialLinks: [
    {
      // Full href, matching siteConfig.social[].href exactly.
      url: 'https://www.linkedin.com/in/dr-marianne-infante-healthy-community-lifespaces/',
      ariaLabel: 'LinkedIn',
    },
  ],

  /**
   * Google Tag Manager configuration.
   * Used in: tests/google-tag-manager.spec.ts
   */
  googleTagManager: {
    id: 'GTM-TQ5H8HPR',
  },

  /**
   * Cookie consent banner/modal copy (shared template component).
   * Used in: tests/cookie-consent.spec.ts
   */
  cookieConsent: {
    bannerHeading: 'We Value Your Privacy',
    modalHeading: 'Cookie Preferences',
    buttons: {
      acceptAll: 'Accept All',
      declineAll: 'Decline All',
      customize: 'Customize',
      savePreferences: 'Save Preferences',
      cancel: 'Cancel',
    },
  },
}
