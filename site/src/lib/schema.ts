/**
 * The publisher node, defined once.
 *
 * It was written out three times — in `Base.astro`'s default schema, in
 * `index.astro`, and in the skill detail page — which is why adding a
 * `contactPoint` to one of them only reached 1 of 119 built pages. Structured
 * data duplicated per page drifts exactly like a duplicated slug list does; the
 * difference is that nothing renders it, so nobody notices.
 */

export const ORGANIZATION = {
  '@type': 'Organization',
  name: '40rty',
  url: 'https://40rty.ai',
  email: 'contact@40rty.ai',
  // Explicit `contactType` is what makes this machine-addressable: a bare email
  // string tells a parser an address exists but not what it is for.
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'technical support',
      email: 'contact@40rty.ai',
      url: 'https://github.com/40RTY-ai/shopify-admin-skills/issues',
      availableLanguage: ['English'],
    },
  ],
  sameAs: [
    'https://40rty.ai',
    'https://audit.40rty.ai',
    'https://github.com/40RTY-ai/shopify-admin-skills',
  ],
} as const;
