import type { DomainRecord, MxRecord, SrvRecord, CaaRecord, DsRecord, TlsaRecord, RedirectConfig } from "@/types/domain"

/**
 * Validates an IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const pattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return pattern.test(ip.trim())
}

/**
 * Checks if IPv4 is not a private or reserved range
 */
export function isPublicIPv4(ip: string, proxied?: boolean): boolean {
  if (!isValidIPv4(ip)) return false
  if (ip === "192.0.2.1" && proxied) return true
  
  const parts = ip.split(".").map(Number)
  
  return !(
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
    (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
    (parts[0] === 198 && parts[1] === 18) ||
    (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
    (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
    parts[0] >= 224
  )
}

/**
 * Validates an IPv6 address format
 */
export function isValidIPv6(ip: string): boolean {
  const pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/
  return pattern.test(ip.trim())
}

/**
 * Checks if IPv6 is not a private or reserved range
 */
export function isPublicIPv6(ip: string): boolean {
  if (!isValidIPv6(ip)) return false
  
  const expandedIP = expandIPv6(ip.toLowerCase())
  
  return !(
    expandedIP.startsWith("fc") ||
    expandedIP.startsWith("fd") ||
    expandedIP.startsWith("fe80") ||
    expandedIP.startsWith("::1") ||
    expandedIP.startsWith("2001:db8")
  )
}

/**
 * Expands abbreviated IPv6 address to full form
 */
export function expandIPv6(ip: string): string {
  let segments = ip.split(":")
  const emptyIndex = segments.indexOf("")

  if (emptyIndex !== -1) {
    const nonEmptySegments = segments.filter((seg) => seg !== "")
    const missingSegments = 8 - nonEmptySegments.length

    segments = [
      ...nonEmptySegments.slice(0, emptyIndex),
      ...Array(missingSegments).fill("0000"),
      ...nonEmptySegments.slice(emptyIndex)
    ]
  }

  return segments.map((segment) => segment.padStart(4, "0")).join(":")
}

/**
 * Validates a hostname format (no protocol)
 */
export function isValidHostname(hostname: string): boolean {
  // Check for http:// or https:// protocol
  if (/^https?:\/\//i.test(hostname)) {
    return false
  }

  // Basic hostname format validation
  const pattern = /^(?=.{1,253}$)(?:(?:[_a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,63}$/
  return pattern.test(hostname.trim())
}

/**
 * Validates a URL format (requires protocol)
 */
export function isValidUrl(url: string): boolean {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false
  }
  
  try {
    new URL(url.trim())
    return true
  } catch {
    return false
  }
}

/**
 * Validates an MX record format
 */
export function isValidMxRecord(record: string | MxRecord): boolean {
  if (typeof record === 'string') {
    return isValidHostname(record)
  }
  
  return (
    isValidHostname(record.target) &&
    Number.isInteger(record.priority) &&
    record.priority >= 0 &&
    record.priority <= 65535
  )
}

/**
 * Validates an SRV record format
 */
export function isValidSrvRecord(record: SrvRecord): boolean {
  return (
    isValidHostname(record.target) &&
    Number.isInteger(record.priority) &&
    record.priority >= 0 &&
    record.priority <= 65535 &&
    Number.isInteger(record.weight) &&
    record.weight >= 0 &&
    record.weight <= 65535 &&
    Number.isInteger(record.port) &&
    record.port >= 0 &&
    record.port <= 65535
  )
}

/**
 * Validates a CAA record format
 */
export function isValidCaaRecord(record: CaaRecord): boolean {
  return (
    ['issue', 'issuewild', 'iodef'].includes(record.tag) &&
    typeof record.value === 'string' &&
    (isValidHostname(record.value) || record.value === ";")
  )
}

/**
 * Validates a DS record format
 */
export function isValidDsRecord(record: DsRecord): boolean {
  return (
    Number.isInteger(record.key_tag) &&
    record.key_tag >= 0 &&
    record.key_tag <= 65535 &&
    Number.isInteger(record.algorithm) &&
    record.algorithm >= 0 &&
    record.algorithm <= 255 &&
    Number.isInteger(record.digest_type) &&
    record.digest_type >= 0 &&
    record.digest_type <= 255 &&
    isValidHexadecimal(record.digest)
  )
}

/**
 * Validates a TLSA record format
 */
export function isValidTlsaRecord(record: TlsaRecord): boolean {
  return (
    Number.isInteger(record.usage) &&
    record.usage >= 0 &&
    record.usage <= 255 &&
    Number.isInteger(record.selector) &&
    record.selector >= 0 &&
    record.selector <= 255 &&
    Number.isInteger(record.matchingType) &&
    record.matchingType >= 0 &&
    record.matchingType <= 255 &&
    isValidHexadecimal(record.certificate)
  )
}

/**
 * Validates hexadecimal input
 */
export function isValidHexadecimal(value: string): boolean {
  return /^[0-9a-fA-F]+$/.test(value)
}

/**
 * Validates custom paths in redirect_config
 */
export function isValidCustomPath(path: string): boolean {
  const pathRegex = /^\/[a-zA-Z0-9\-_\.\/]+(?<!\/)$/
  return (
    pathRegex.test(path) &&
    path.length >= 2 &&
    path.length <= 255
  )
}

/**
 * Validates record combinations
 */
export function validateRecordCombinations(records: DomainRecord, proxied?: boolean): string[] {
  const errors: string[] = []
  const types = Object.keys(records)
  
  // CNAME restrictions (unless proxied)
  if (types.includes('CNAME') && !proxied && types.length > 1) {
    errors.push('CNAME records cannot be combined with other records unless proxied')
  }
  
  // NS restrictions
  if (types.includes('NS') && 
      !(types.length === 1 || (types.length === 2 && types.includes('DS')))) {
    errors.push('NS records cannot be combined with other records, except for DS records')
  }
  
  // DS must be with NS
  if (types.includes('DS') && !types.includes('NS')) {
    errors.push('DS records must be combined with NS records')
  }
  
  // URL restrictions
  if (types.includes('URL') && 
      (types.includes('A') || types.includes('AAAA') || types.includes('CNAME'))) {
    errors.push('URL records cannot be combined with A, AAAA, or CNAME records')
  }
  
  return errors
}

/**
 * Validates redirect_config requirements
 */
export function validateRedirectConfig(records: DomainRecord, redirectConfig?: RedirectConfig, proxied?: boolean): string[] {
  const errors: string[] = []
  
  if (redirectConfig) {
    if (!records.URL && !proxied) {
      errors.push('Redirect config must be combined with a URL record or the domain must be proxied')
    }
    
    if (redirectConfig.redirect_paths && !records.URL) {
      errors.push('redirect_config.redirect_paths requires a URL record')
    }
    
    // Validate custom paths
    if (redirectConfig.custom_paths) {
      Object.entries(redirectConfig.custom_paths).forEach(([path, url]) => {
        if (!isValidCustomPath(path)) {
          errors.push(`Custom path "${path}" is invalid - must start with a slash, contain only alphanumeric characters, hyphens, underscores, periods, and slashes, and cannot end with a slash`)
        }
        
        if (!isValidUrl(url)) {
          errors.push(`Target URL for custom path "${path}" is invalid`)
        }
      })
    }
  }
  
  return errors
}

/**
 * Validates the entire record object and returns errors
 */
export function validateDnsRecords(records: DomainRecord, proxied?: boolean, redirectConfig?: RedirectConfig): { isValid: boolean, errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {}
  
  // Check if at least one record is provided
  if (Object.keys(records).length === 0) {
    errors.general = ['At least one DNS record is required']
    return { isValid: Object.keys(errors).length === 0, errors }
  }
  
  // Validate record combinations
  const combinationErrors = validateRecordCombinations(records, proxied)
  if (combinationErrors.length > 0) {
    errors.general = (errors.general || []).concat(combinationErrors)
  }
  
  // Validate redirect config if present
  if (redirectConfig) {
    const redirectErrors = validateRedirectConfig(records, redirectConfig, proxied)
    if (redirectErrors.length > 0) {
      errors.redirect = redirectErrors
    }
  }
  
  // Validate A records (IPv4)
  if (records.A && records.A.length > 0) {
    const aErrors = records.A
      .map((ip, index) => {
        if (!isValidIPv4(ip)) return `Invalid IPv4 address at position ${index + 1}`
        if (!isPublicIPv4(ip, proxied)) return `IPv4 address at position ${index + 1} is a private or reserved range`
        return null
      })
      .filter(Boolean) as string[]
    
    if (aErrors.length > 0) {
      errors.A = aErrors
    }
  }
  
  // Validate AAAA records (IPv6)
  if (records.AAAA && records.AAAA.length > 0) {
    const aaaaErrors = records.AAAA
      .map((ip, index) => {
        if (!isValidIPv6(ip)) return `Invalid IPv6 address at position ${index + 1}`
        if (!isPublicIPv6(ip)) return `IPv6 address at position ${index + 1} is a private or reserved range`
        return null
      })
      .filter(Boolean) as string[]
    
    if (aaaaErrors.length > 0) {
      errors.AAAA = aaaaErrors
    }
  }
  
  // Validate CNAME record
  if (records.CNAME) {
    if (!isValidHostname(records.CNAME)) {
      errors.CNAME = ["Invalid hostname format. Do not include http:// or https://"]
    }
  }
  
  // Validate MX records
  if (records.MX && records.MX.length > 0) {
    const mxErrors = (records.MX)
      .map((record, index) => !isValidMxRecord(record) ? `Invalid MX record at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (mxErrors.length > 0) {
      errors.MX = mxErrors
    }
  }
  
  // Validate NS records
  if (records.NS && records.NS.length > 0) {
    const nsErrors = (records.NS as string[])
      .map((record, index) => !isValidHostname(record) ? `Invalid hostname at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (nsErrors.length > 0) {
      errors.NS = nsErrors
    }
  }
  
  // Validate URL record
  if (records.URL) {
    if (!isValidUrl(records.URL)) {
      errors.URL = ["Invalid URL format. Include http:// or https://"]
    }
  }
  
  // Validate SRV records
  if (records.SRV && records.SRV.length > 0) {
    const srvErrors = records.SRV
      .map((record, index) => !isValidSrvRecord(record) ? `Invalid SRV record at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (srvErrors.length > 0) {
      errors.SRV = srvErrors
    }
  }
  
  // Validate CAA records
  if (records.CAA && records.CAA.length > 0) {
    const caaErrors = records.CAA
      .map((record, index) => !isValidCaaRecord(record) ? `Invalid CAA record at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (caaErrors.length > 0) {
      errors.CAA = caaErrors
    }
  }
  
  // Validate DS records
  if (records.DS && records.DS.length > 0) {
    const dsErrors = records.DS
      .map((record, index) => !isValidDsRecord(record) ? `Invalid DS record at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (dsErrors.length > 0) {
      errors.DS = dsErrors
    }
  }
  
  // Validate TLSA records
  if (records.TLSA && records.TLSA.length > 0) {
    const tlsaErrors = records.TLSA
      .map((record, index) => !isValidTlsaRecord(record) ? `Invalid TLSA record at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (tlsaErrors.length > 0) {
      errors.TLSA = tlsaErrors
    }
  }
  
  // Validate TXT records
  if (records.TXT) {
    const values = Array.isArray(records.TXT) ? records.TXT : [records.TXT]
    const txtErrors = values
      .map((record, index) => typeof record !== 'string' ? `TXT record must be a string at position ${index + 1}` : null)
      .filter(Boolean) as string[]
    
    if (txtErrors.length > 0) {
      errors.TXT = txtErrors
    }
  }
  
  // Special validation for raw.is-a.dev
  if (proxied && (records.CNAME === 'raw.is-a.dev' || records.CNAME?.endsWith('.raw.is-a.dev'))) {
    errors.CNAME = (errors.CNAME || []).concat(['raw.is-a.dev cannot be proxied'])
  }
  
  // Proxy validation - need A, AAAA or CNAME
  if (proxied && !records.A && !records.AAAA && !records.CNAME) {
    errors.general = (errors.general || []).concat(['Proxied domains must have at least one A, AAAA, or CNAME record'])
  }
  
  return { 
    isValid: Object.keys(errors).length === 0,
    errors 
  }
} 