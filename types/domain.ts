export type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "URL" | "NS" | "SRV" | "CAA" | "DS"

export interface DomainOwner {
  username: string
  email?: string
  discord?: string
  [key: string]: any
}

export interface MxRecord {
  target: string
  priority: number
}

export interface SrvRecord {
  priority: number
  weight: number
  port: number
  target: string
}

export interface CaaRecord {
  flags: number
  tag: string
  value: string
}

export interface DsRecord {
  key_tag: number
  algorithm: number
  digest_type: number
  digest: string
}

export interface TlsaRecord {
  usage: number
  selector: number
  matchingType: number
  certificate: string
}

export interface RedirectConfig {
  custom_paths?: Record<string, string>
  redirect_paths?: boolean
}

export interface DomainRecord {
  A?: string[]
  AAAA?: string[]
  CNAME?: string
  MX?: (string | MxRecord)[]
  TXT?: string | string[]
  URL?: string
  NS?: string[]
  SRV?: SrvRecord[]
  CAA?: CaaRecord[]
  DS?: DsRecord[]
  TLSA?: TlsaRecord[]
}

export interface DomainData {
  description?: string
  repo?: string
  owner: DomainOwner
  record: DomainRecord
  proxied?: boolean
  redirect_config?: RedirectConfig
}

export interface DomainEntry {
  name: string
  data: DomainData
}
