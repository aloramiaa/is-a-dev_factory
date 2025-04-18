// List of official domains that don't need warnings
export const OFFICIAL_DOMAINS = [
  'www',
  'docs',
  'raw',
  'api',
  'data',
  'team',
  'all',
  '@',
  'owl'
]

/**
 * Determines if a warning should be shown before redirecting to a domain
 * 
 * @param domain Domain name without the .is-a.dev suffix
 * @returns True if a warning should be shown
 */
export function shouldShowWarning(domain: string): boolean {
  // Check if this is an official domain
  if (OFFICIAL_DOMAINS.includes(domain)) {
    return false
  }
  
  // Check for system domains (starting with _)
  if (domain.startsWith('_')) {
    return false
  }
  
  // Check for API domains
  const API_PREFIXES = ['api.', 'analytics.', 'server.', 'tunnel.', 'playeranalytics.']
  if (API_PREFIXES.some(prefix => domain.startsWith(prefix))) {
    return false
  }
  
  // Check for auth domains
  const AUTH_PREFIXES = ['clerk.', 'clkmail.']
  if (AUTH_PREFIXES.some(prefix => domain.startsWith(prefix))) {
    return false
  }
  
  // All other domains should show a warning
  return true
}

/**
 * Gets the appropriate URL for a domain, either direct or through the warning page
 * 
 * @param domain Domain name without the .is-a.dev suffix
 * @returns URL to use for linking to this domain
 */
export function getDomainUrl(domain: string): string {
  const fullDomain = `${domain}.is-a.dev`
  
  // If it's an official domain, link directly
  if (!shouldShowWarning(domain)) {
    return `https://${fullDomain}`
  }
  
  // Otherwise, go through the warning redirect page
  return `/redirect?domain=${fullDomain}`
}

/**
 * Gets the target attribute for a domain link
 * 
 * @param domain Domain name without the .is-a.dev suffix
 * @returns "_blank" for direct links, "_self" for redirect links
 */
export function getDomainTarget(domain: string): "_blank" | "_self" {
  return shouldShowWarning(domain) ? "_self" : "_blank"
} 