"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Search, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { getDomainUrl, getDomainTarget } from "@/utils/domain-utils"

interface DomainListProps {
  domains: string[]
  isLoading?: boolean
  onSearch?: (searchTerm: string) => void
  initialSearch?: string
}

export function DomainList({ domains, isLoading = false, onSearch, initialSearch = "" }: DomainListProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [localFilteredDomains, setLocalFilteredDomains] = useState<string[]>([])
  const [pendingSearchTerm, setPendingSearchTerm] = useState(initialSearch)
  
  // Update search term when initialSearch changes
  useEffect(() => {
    setSearchTerm(initialSearch || "")
    setPendingSearchTerm(initialSearch || "")
  }, [initialSearch])
  
  // Use local filtering only if no onSearch callback is provided
  useEffect(() => {
    if (onSearch) {
      // When using parent component's filtering
      setLocalFilteredDomains(domains)
    } else {
      // Local filtering
      if (!searchTerm) {
        setLocalFilteredDomains(domains)
        return
      }
      
      const filtered = domains.filter((domain) => 
        domain.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setLocalFilteredDomains(filtered)
    }
  }, [searchTerm, domains, onSearch])
  
  // Handle input change (updates the pending search term)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPendingSearchTerm(e.target.value)
  }, [])
  
  // Execute search
  const executeSearch = useCallback(() => {
    setSearchTerm(pendingSearchTerm)
    if (onSearch) {
      onSearch(pendingSearchTerm)
    }
  }, [pendingSearchTerm, onSearch])
  
  // Handle key press (search on Enter)
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch()
    }
  }, [executeSearch])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
            <Input
              className="pl-10 bg-black border-purple-500 focus:border-purple-300"
              placeholder="Search domains..."
              disabled
              value=""
            />
          </div>
          <Button disabled variant="default" className="bg-purple-600">Search</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16 bg-purple-900/20" />
          ))}
        </div>
      </div>
    )
  }

  // Show filtered domains from parent or local filtering
  const displayDomains = onSearch ? domains : localFilteredDomains

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
          <Input
            className="pl-10 bg-black border-purple-500 focus:border-purple-300"
            placeholder="Search domains..."
            value={pendingSearchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
          />
        </div>
        <Button 
          onClick={executeSearch} 
          className="bg-purple-600 hover:bg-purple-700"
        >
          Search
        </Button>
      </div>

      {displayDomains.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-purple-300 text-lg">No domains found matching "{searchTerm}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayDomains.map((domain, index) => (
            <motion.a
              key={domain}
              href={getDomainUrl(domain)}
              target={getDomainTarget(domain)}
              rel="noopener noreferrer"
              className="p-4 border border-purple-500 rounded-md bg-black/40 hover:bg-purple-900/20 transition-colors flex items-center justify-between group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.3 }}
            >
              <span className="text-purple-300 font-mono">{domain}.is-a.dev</span>
              <ExternalLink className="h-4 w-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          ))}
        </div>
      )}
    </div>
  )
}
