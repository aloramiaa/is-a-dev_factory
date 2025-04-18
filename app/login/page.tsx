"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Github, LogOut, Loader2 } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { BackgroundGrid } from "@/components/background-grid"
import { useSearchParams } from "next/navigation"

// Create a client component that uses useSearchParams
function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const reauth = searchParams.get("reauth") === "true"

  const handleLogin = async () => {
    setIsLoading(true)
    if (reauth && status === "authenticated") {
      await signOut({ redirect: false })
    }
    await signIn("github", { callbackUrl: "/" })
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    await signOut({ callbackUrl: "/login?reauth=true" })
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
      <BackgroundGrid />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full p-8 cyber-border bg-black/80 backdrop-blur-md"
      >
        <div className="text-center mb-8">
          <NeonGlow>
            <GlitchText className="text-4xl font-bold tracking-tighter mb-2" text=".is-a.dev" />
          </NeonGlow>
          <p className="text-purple-300">Sign in to create your developer domain</p>
        </div>

        {status === "authenticated" ? (
          <div className="space-y-6">
            <div className="text-center text-purple-200 mb-4">
              <p>You're signed in as <span className="font-bold">{session.user?.name}</span></p>
              {reauth && (
                <div className="mt-4 p-2 border border-yellow-500 rounded-md bg-yellow-900/20">
                  <p className="text-yellow-300 font-medium">Additional GitHub permissions required!</p>
                  <p className="text-sm mt-1">Please sign out and sign back in to grant these permissions.</p>
                </div>
              )}
            </div>
            <CyberButton onClick={handleSignOut} disabled={isLoading} className="w-full mt-6" variant="large">
              <LogOut className="mr-2 h-5 w-5" />
              {isLoading ? "Processing..." : "Sign Out"}
            </CyberButton>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-purple-200">
              To register a domain, you'll need to authenticate with GitHub. This allows us to:
            </p>
            <ul className="list-disc pl-5 text-sm text-purple-200 space-y-1">
              <li>Fork the is-a-dev/register repository</li>
              <li>Create a new branch</li>
              <li>Add your domain configuration file</li>
              <li>Submit a pull request on your behalf</li>
            </ul>
            
            <div className="p-2 border border-purple-500 rounded-md bg-purple-900/20">
              <p className="text-sm text-purple-200">
                We need the following GitHub permissions:
              </p>
              <ul className="list-disc pl-5 text-xs text-purple-200 mt-1">
                <li><strong>read:user</strong> - To get your GitHub username</li>
                <li><strong>user:email</strong> - To include your email in domain registration</li>
                <li><strong>repo, public_repo</strong> - To create forks, branches, and pull requests</li>
              </ul>
            </div>

            <CyberButton onClick={handleLogin} disabled={isLoading} className="w-full mt-6" variant="large">
              <Github className="mr-2 h-5 w-5" />
              {isLoading ? "Connecting..." : "Sign in with GitHub"}
            </CyberButton>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-purple-400">
          <p>By signing in, you agree to the terms of service of is-a.dev</p>
        </div>
      </motion.div>
    </main>
  )
}

// Export the page component with Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
