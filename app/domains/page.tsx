"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Globe, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { BackgroundGrid } from "@/components/background-grid"
import { NavBar } from "@/components/nav-bar"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { DomainList } from "@/components/domain-list"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebounce } from "../../hooks/use-debounce"

interface Domain {
  name: string
  domain: string
  description: string
}

interface PaginationData {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const PAGE_SIZE_OPTIONS = [24, 48, 96, 192]

export default function DomainsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get URL params with defaults
  const initialPage = Number(searchParams.get("page") || "1")
  const initialPageSize = Number(searchParams.get("pageSize") || "48")
  const initialSearch = searchParams.get("search") || ""
  
  // State
  const [domains, setDomains] = useState<Domain[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: initialPage,
    pageSize: initialPageSize,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const debouncedSearch = useDebounce(searchTerm, 500)

  // Update URL when params change
  const updateUrlParams = useCallback((params: { page?: number, pageSize?: number, search?: string }) => {
    const url = new URL(window.location.href)
    
    if (params.page !== undefined) {
      if (params.page === 1) {
        url.searchParams.delete('page')
      } else {
        url.searchParams.set('page', params.page.toString())
      }
    }
    
    if (params.pageSize !== undefined) {
      if (params.pageSize === 48) {
        url.searchParams.delete('pageSize')
      } else {
        url.searchParams.set('pageSize', params.pageSize.toString())
      }
    }
    
    if (params.search !== undefined) {
      if (!params.search) {
        url.searchParams.delete('search')
      } else {
        url.searchParams.set('search', params.search)
      }
    }
    
    router.replace(url.pathname + url.search)
  }, [router])

  // Fetch domains with current pagination and search
  const fetchDomains = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query params
      const queryParams = new URLSearchParams()
      if (pagination.page > 1) queryParams.set('page', pagination.page.toString())
      if (pagination.pageSize !== 48) queryParams.set('pageSize', pagination.pageSize.toString())
      if (debouncedSearch) queryParams.set('search', debouncedSearch)
      
      const apiUrl = `/api/domains?${queryParams.toString()}`
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error("Failed to fetch domains")
      }
      
      const data = await response.json()
      setDomains(data.domains)
      setPagination(data.pagination)
      
    } catch (error) {
      console.error("Error fetching domains:", error)
      setError("Failed to load domains. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch])

  // Fetch domains when pagination or search changes
  useEffect(() => {
    fetchDomains()
  }, [fetchDomains])
  
  // Update URL when search changes
  useEffect(() => {
    updateUrlParams({ 
      search: debouncedSearch,
      page: 1 // Reset to first page on search
    })
  }, [debouncedSearch, updateUrlParams])
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    setPagination(prev => ({ ...prev, page: newPage }))
    updateUrlParams({ page: newPage })
  }
  
  // Handle page size change
  const handlePageSizeChange = (newSize: string) => {
    const size = parseInt(newSize)
    setPagination(prev => ({ 
      ...prev, 
      pageSize: size,
      page: 1 // Reset to first page when changing page size
    }))
    updateUrlParams({ pageSize: size, page: 1 })
  }
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <NeonGlow>
              <GlitchText className="text-4xl md:text-6xl font-bold tracking-tighter" text="Browse Domains" />
            </NeonGlow>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl text-purple-300 max-w-2xl mx-auto"
          >
            Explore all registered .is-a.dev domains
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {error ? (
            <div className="text-center py-12 bg-black/60 border border-purple-500 rounded-md p-6">
              <p className="text-red-400 text-lg">{error}</p>
              <p className="text-purple-300 mt-2">Please try again later or contact support.</p>
            </div>
          ) : (
            <div className="p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Globe className="text-purple-400" />
                  <h2 className="text-2xl font-bold text-purple-400">
                    {isLoading ? "Loading domains..." : `${pagination.totalItems.toLocaleString()} Domains`}
                  </h2>
                  {isLoading && <Loader2 className="animate-spin ml-2 h-4 w-4 text-purple-400" />}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-purple-300">Domains per page:</span>
                    <Select
                      value={pagination.pageSize.toString()}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="w-20 bg-black border-purple-500 focus:ring-purple-500">
                        <SelectValue placeholder="48" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-purple-500">
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {domains.length > 0 && (
                    <div className="text-sm text-purple-400">
                      {debouncedSearch
                        ? `Showing ${domains.length} of ${pagination.totalItems.toLocaleString()} matching domains`
                        : `Showing ${domains.length} of ${pagination.totalItems.toLocaleString()} domains`}
                    </div>
                  )}
                </div>
              </div>
              
              <DomainList 
                domains={domains.map(d => d.name)} 
                isLoading={isLoading} 
                onSearch={handleSearch}
                initialSearch={searchTerm}
              />
              
              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="border-purple-500 hover:bg-purple-900/20"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      // Show pages around current page
                      let pageToShow: number
                      
                      if (pagination.totalPages <= 5) {
                        // Show all pages if 5 or fewer
                        pageToShow = i + 1
                      } else if (pagination.page <= 3) {
                        // At start
                        pageToShow = i + 1
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        // At end
                        pageToShow = pagination.totalPages - 4 + i
                      } else {
                        // In middle
                        pageToShow = pagination.page - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageToShow}
                          variant={pagination.page === pageToShow ? "default" : "outline"}
                          size="icon"
                          onClick={() => handlePageChange(pageToShow)}
                          className={pagination.page === pageToShow 
                            ? "bg-purple-600 hover:bg-purple-700" 
                            : "border-purple-500 hover:bg-purple-900/20"
                          }
                        >
                          {pageToShow}
                        </Button>
                      )
                    })}
                    
                    {pagination.totalPages > 5 && pagination.page < pagination.totalPages - 2 && (
                      <>
                        <span className="mx-1 text-purple-400">...</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePageChange(pagination.totalPages)}
                          className="border-purple-500 hover:bg-purple-900/20"
                        >
                          {pagination.totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="border-purple-500 hover:bg-purple-900/20"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <div className="p-4 bg-purple-900/20 border-t border-purple-800 mt-16">
        <div className="container mx-auto text-center">
          <p className="text-sm text-purple-300">
            Data sourced from <a href="https://raw.is-a.dev" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">raw.is-a.dev</a>
          </p>
          <p className="text-xs text-purple-400 mt-2">
            Note: We are not responsible for the content of individual domains. Please exercise caution when visiting external sites.
          </p>
        </div>
      </div>
    </main>
  )
}
