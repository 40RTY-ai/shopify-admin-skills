// Validates and normalizes a user-entered store domain.
// Returns either { domain } on success, or { error } with a user-facing message.

export type StoreDomainResult = { domain: string; error?: undefined } | { domain?: undefined; error: string };

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const TLD_RE = /^[a-z]{2,63}$/;
const IPV4_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const RESERVED_TLD_RE = /\.(local|test|invalid|example|localhost)$/;

const PLACEHOLDERS = new Set([
  'example.com', 'example.org', 'example.net',
  'mystore.com', 'my-store.com', 'yourstore.com', 'your-store.com',
  'mystore.myshopify.com', 'my-store.myshopify.com',
  'yourstore.myshopify.com', 'your-store.myshopify.com',
  'store.myshopify.com', 'shop.myshopify.com',
]);

export function normalizeStoreDomain(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^\/\//, '')
    .replace(/^www\./, '')
    .replace(/:\d+$/, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '');
}

export function validateStoreDomain(raw: string): StoreDomainResult {
  if (!raw || !raw.trim()) {
    return { error: 'Please enter your store domain.' };
  }

  const domain = normalizeStoreDomain(raw);

  if (domain.length < 4 || domain.length > 253) {
    return { error: 'Enter a valid domain (e.g. my-store.myshopify.com).' };
  }
  if (!domain.includes('.')) {
    return { error: 'Enter a full domain — must include a TLD like .com.' };
  }
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { error: 'Enter a valid domain (e.g. my-store.myshopify.com).' };
  }
  if (IPV4_RE.test(domain)) {
    return { error: 'Enter a domain, not an IP address.' };
  }
  if (domain === 'localhost' || RESERVED_TLD_RE.test(domain)) {
    return { error: 'Enter a real, public store domain.' };
  }

  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63 || !LABEL_RE.test(label)) {
      return { error: 'Enter a valid domain (e.g. my-store.myshopify.com).' };
    }
  }

  const tld = labels[labels.length - 1];
  if (!TLD_RE.test(tld)) {
    return { error: 'Domain must end in a letters-only TLD (e.g. .com, .co.uk).' };
  }

  if (domain.endsWith('.myshopify.com')) {
    const sub = domain.slice(0, -'.myshopify.com'.length);
    if (!sub || sub.includes('.')) {
      return { error: 'Shopify URLs look like store-name.myshopify.com.' };
    }
    if (sub.length < 3 || sub.length > 60) {
      return { error: 'Shopify store subdomain must be 3–60 characters.' };
    }
    if (!LABEL_RE.test(sub)) {
      return { error: 'Shopify subdomain can only contain letters, digits, and hyphens.' };
    }
  }

  if (PLACEHOLDERS.has(domain)) {
    return { error: 'Enter your actual store domain (not the placeholder).' };
  }

  return { domain };
}
