"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { BackgroundGrid } from "@/components/background-grid"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"

export default function RedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const domain = searchParams.get("domain")
  const [countdown, setCountdown] = useState(5)
  
  useEffect(() => {
    // Validate domain parameter
    if (!domain) {
      router.push("/")
      return
    }
    
    // Handle countdown for auto-redirect
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown, domain, router])
  
  const handleProceed = () => {
    // Redirect to the external domain
    window.location.href = `https://${domain}`
  }
  
  const handleCancel = () => {
    // Go back to home page
    router.push("/")
  }
  
  // If no domain parameter, show nothing during redirect
  if (!domain) return null
  
  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
      <BackgroundGrid />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl w-full p-8 border border-purple-500 rounded-md bg-black/80 backdrop-blur-md"
      >
        <div className="flex items-center justify-center mb-6">
          <NeonGlow>
            <GlitchText className="text-2xl md:text-4xl font-bold tracking-tighter" text="Warning" />
          </NeonGlow>
        </div>
        
        <div className="flex items-start gap-4 mb-8">
          <AlertTriangle className="text-red-400 mt-1 flex-shrink-0 h-8 w-8" />
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-red-300">
              You are leaving is-a.dev
            </h2>
            <p className="text-purple-200">
              Are you sure you want to go to <span className="font-mono text-white">{domain}</span>?
            </p>
            <div className="space-y-2 text-sm text-purple-300">
              <p>• We are not responsible for any content on this domain</p>
              <p>• This domain may collect your IP address or personal data</p>
              <p>• This external site is not operated by is-a.dev</p>
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-purple-300">
                If you believe that <span className="font-mono text-white">{domain}</span> is violating is-a.dev terms, please{" "}
                <a 
                  href="https://github.com/is-a-dev/register/issues/new?labels=report-abuse&template=report-abuse.md&title=Report+abuse" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 underline flex items-center gap-1 inline-flex"
                >
                  report it here <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-purple-400">
            {countdown > 0 ? `Redirecting in ${countdown}s...` : "Redirect ready"}
          </p>
          <div className="flex gap-4">
            <CyberButton variant="outline" onClick={handleCancel}>
              Cancel
            </CyberButton>
            <CyberButton onClick={handleProceed}>
              {countdown > 0 ? `Continue (${countdown})` : "Continue"}
            </CyberButton>
          </div>
        </div>
      </motion.div>
    </main>
  )
} 