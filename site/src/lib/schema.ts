/**
 * The publisher node, defined once.
 *
 * It was written out three times — in `Base.astro`'s default schema, in
 * `index.astro`, and in the skill detail page — which is why adding a
 * `contactPoint` to one of them only reached 1 of 119 built pages. Structured
 * data duplicated per page drifts exactly like a duplicated slug list does; the
 * difference is that nothing renders it, so nobody notices.
 *
 * `ORG_ID` exists so the Organization can be emitted ONCE as a first-class
 * node and referenced everywhere else by `@id`. Nesting the full object under
 * `publisher` is valid schema.org, but it buries the entity: a consumer looking
 * for "the organization behind this site" has to know to walk into
 * `WebSite.publisher` to find it. Our own audit scanner is one such consumer —
 * it reads only top-level Organization nodes, and reported `machine-contact` as
 * FAIL on this site while the contactPoint sat correctly nested one level down.
 */

export const ORG_ID = 'https://40rty.ai/#organization';

/** Full node. Emit exactly once per page, top level. */
export const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
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

/** Reference to the node above. Use wherever a publisher/author is named. */
export const ORGANIZATION_REF = { '@id': ORG_ID } as const;

/** Standalone script payload — the Organization as its own JSON-LD block. */
export const ORGANIZATION_JSONLD = {
  '@context': 'https://schema.org',
  ...ORGANIZATION,
} as const;
