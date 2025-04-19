"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { BackgroundGrid } from "@/components/background-grid"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { NavBar } from "@/components/nav-bar"
import { useToast } from "@/hooks/use-toast"
import { DomainEditForm } from "@/components/domain-edit-form"

export default function EditDomainPage({ params }: { params: any }) {
  const unwrappedParams = React.use(params) as { subdomain: string }
  const subdomain = unwrappedParams.subdomain
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [domain, setDomain] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDomain = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/domain/${subdomain}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch domain data")
      }

      const data = await response.json()
      setDomain(data)
    } catch (err: any) {
      console.error("Error fetching domain:", err)
      setError(err.message || "Failed to fetch domain data")
      
      toast({
        title: "Error",
        description: err.message || "Failed to fetch domain data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchDomain()
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router, subdomain])

  if (status === "loading" || isLoading) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <BackgroundGrid />
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-purple-500" />
          <h2 className="text-xl text-purple-300 mb-2">Loading domain information...</h2>
          <p className="text-xs text-purple-500 mt-2">Fetching data for {subdomain}.is-a.dev</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden">
        <BackgroundGrid />
        <NavBar />

        <div className="container mx-auto px-4 pt-20 pb-12 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <NeonGlow>
              <GlitchText 
                className="text-3xl md:text-5xl font-bold tracking-tighter mb-8" 
                text="Error Loading Domain" 
              />
            </NeonGlow>
            <div className="bg-red-900/30 border border-red-500 text-red-300 p-6 rounded-md">
              <p className="mb-4">{error}</p>
              <p className="text-sm">
                You might not have permission to view this domain, or it may not exist.
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!domain) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden">
        <BackgroundGrid />
        <NavBar />

        <div className="container mx-auto px-4 pt-20 pb-12 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <NeonGlow>
              <GlitchText 
                className="text-3xl md:text-5xl font-bold tracking-tighter mb-8" 
                text="Domain Not Found" 
              />
            </NeonGlow>
            <div className="bg-purple-900/30 border border-purple-500 text-purple-300 p-6 rounded-md">
              <p className="mb-4">The domain {subdomain}.is-a.dev was not found.</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      <div className="container mx-auto px-4 pt-20 pb-12 md:py-24 relative z-10">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8 md:mb-12">
            <NeonGlow>
              <GlitchText 
                className="text-3xl md:text-5xl font-bold tracking-tighter" 
                text={`Edit ${subdomain}.is-a.dev`} 
              />
            </NeonGlow>
          </header>
          
          <DomainEditForm initialDomain={domain} />
        </div>
      </div>
    </main>
  )
} 