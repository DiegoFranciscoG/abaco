import { z } from 'zod';

/**
 * Zod with its eval-based fast path disabled. The Content-Security-Policy forbids eval, so Zod's feature check
 * would only produce a CSP violation report before falling back to the same interpreted parser.
 */
z.config({ jitless: true });

export { z };
