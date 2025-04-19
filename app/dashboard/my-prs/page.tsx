"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { 
  Loader2, 
  RefreshCw, 
  GitPullRequest, 
  CheckCircle, 
  XCircle, 
  CalendarClock, 
  ExternalLink,
  ChevronLeft
} from "lucide-react"
import { BackgroundGrid } from "@/components/background-grid"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { NavBar } from "@/components/nav-bar"
import { CyberButton } from "@/components/cyber-button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PullRequest {
  id: number
  number: number
  title: string
  state: string
  created_at: string
  updated_at: string
  closed_at: string | null
  merged_at: string | null
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  labels: {
    name: string
    color: string
  }[]
}

export default function MyPullRequestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'open' | 'closed' | 'merged'>('all')
  const [useDirectFetch, setUseDirectFetch] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [showReauthPrompt, setShowReauthPrompt] = useState(false)

  const fetchPullRequests = async () => {
    if (status !== "authenticated") return
    
    try {
      setIsLoading(true)
      setError(null)
      setShowReauthPrompt(false)
      
      const displayName = session?.user?.name || "";
      const githubUsername = session?.user?.githubUsername;
      
      console.log("Fetching PRs for user display name:", displayName)
      console.log("GitHub username:", githubUsername)
      console.log("Access token available:", !!session?.accessToken)
      console.log("Using direct fetch:", useDirectFetch)
      
      // Check if GitHub username is missing, prompt for re-authentication
      if (!githubUsername && !useDirectFetch) {
        console.error("GitHub username missing from session");
        setShowReauthPrompt(true);
        setIsLoading(false);
        return;
      }
      
      let data;
      
      // If direct fetch is enabled, bypass our API completely
      if (useDirectFetch && session?.accessToken) {
        console.log("Using direct GitHub API access")
        
        try {
          // Try the PR endpoint directly
          const directApiUrl = `https://api.github.com/repos/is-a-dev/register/pulls?state=all&per_page=100`;
          console.log("Fetching from:", directApiUrl);
          
          const directResponse = await fetch(directApiUrl, {
            headers: {
              Authorization: `token ${session.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          });
          
          if (!directResponse.ok) {
            throw new Error(`Direct GitHub API call failed: ${directResponse.status}`);
          }
          
          const allPrs = await directResponse.json();
          console.log(`Fetched ${allPrs.length} total PRs from repository`);
          
          // For direct fetch without a GitHub username, hardcode to "aloramiaa"
          const userLogin = githubUsername || "aloramiaa";
          
          // Log sample of PR authors
          console.log("Sample of PR authors:");
          allPrs.slice(0, 5).forEach((pr: any) => {
            console.log(`PR #${pr.number} by: ${pr.user.login}`);
          });
          
          // Filter PRs by the current user's GitHub username
          const userPrs = allPrs.filter((pr: any) => 
            pr.user.login.toLowerCase() === userLogin.toLowerCase()
          );
          
          console.log(`Found ${userPrs.length} PRs for user after filtering by GitHub username: ${userLogin}`);
          data = userPrs;
        } catch (directError: any) {
          console.error("Error in direct API call:", directError);
          throw new Error(`Failed to fetch from GitHub directly: ${directError.message}`);
        }
      } else {
        // Use our server API
        const response = await fetch('/api/user-prs')
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error("Error response from API:", errorData)
          
          // Handle re-authentication requirement
          if (errorData.requireReauth) {
            setShowReauthPrompt(true);
            setError(errorData.message || "Please sign out and sign in again to update your session.");
            setIsLoading(false);
            return;
          }
          
          throw new Error(errorData.error || 'Failed to fetch pull requests')
        }
        
        data = await response.json()
        console.log("PR data received from API:", data)
      }
  
      if (!data || !Array.isArray(data)) {
        console.error("Invalid data format received:", data)
        
        if (!useDirectFetch) {
          // If server API failed, suggest trying direct fetch next time
          setUseDirectFetch(true)
          toast({
            title: "Switching to direct fetch",
            description: "We'll try connecting directly to GitHub next time",
            variant: "default",
          })
        }
        
        setPullRequests([])
        toast({
          title: "Warning",
          description: "Received unexpected data format from the server",
          variant: "destructive",
        })
      } else {
        setPullRequests(data)
        console.log(`Found ${data.length} pull requests`)
        
        if (data.length === 0) {
          toast({
            title: "No pull requests found",
            description: `We couldn't find any pull requests for GitHub username: ${githubUsername}`,
            variant: "destructive",
          })
        }
      }
    } catch (err: any) {
      console.error("Error fetching pull requests:", err)
      setError(err.message || "Failed to fetch your pull requests. Please try again later.")
      
      // If using server API failed, try direct fetch next time
      if (!useDirectFetch) {
        setUseDirectFetch(true)
      }
      
      toast({
        title: "Error",
        description: err.message || "Failed to fetch your pull requests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Get PR status badge
  const getPrStatusBadge = (pr: PullRequest) => {
    if (pr.merged_at) {
      return <Badge className="bg-purple-700 hover:bg-purple-600">Merged</Badge>
    } else if (pr.state === "closed") {
      return <Badge className="bg-red-700 hover:bg-red-600">Closed</Badge>
    } else {
      return <Badge className="bg-green-700 hover:bg-green-600">Open</Badge>
    }
  }

  // Get PR status icon
  const getPrStatusIcon = (pr: PullRequest) => {
    if (pr.merged_at) {
      return <CheckCircle className="h-5 w-5 text-purple-400" />
    } else if (pr.state === "closed") {
      return <XCircle className="h-5 w-5 text-red-400" />
    } else {
      return <GitPullRequest className="h-5 w-5 text-green-400" />
    }
  }

  const filteredPullRequests = useMemo(() => {
    switch(filterType) {
      case 'open':
        return pullRequests.filter(pr => pr.state === 'open')
      case 'closed':
        return pullRequests.filter(pr => pr.state === 'closed' && !pr.merged_at)
      case 'merged':
        return pullRequests.filter(pr => pr.merged_at !== null)
      default:
        return pullRequests
    }
  }, [pullRequests, filterType])

  useEffect(() => {
    if (status === "authenticated") {
      fetchPullRequests()
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading" || isLoading) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <BackgroundGrid />
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-purple-500" />
          <h2 className="text-xl text-purple-300 mb-2">Loading your pull requests...</h2>
          <p className="text-xs text-purple-500 mt-2">Fetching data from GitHub</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      <div className="container mx-auto px-4 pt-20 pb-12 md:py-24 relative z-10">
        <header className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4 md:mb-6"
          >
            <NeonGlow>
              <GlitchText className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter" text="My Pull Requests" />
            </NeonGlow>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-base sm:text-lg md:text-xl text-purple-300 max-w-2xl mx-auto"
          >
            Track all your is-a.dev domain registration requests
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-md mb-8">
              <p className="mb-4">{error}</p>
              <CyberButton onClick={fetchPullRequests} className="w-full">
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </CyberButton>
            </div>
          )}

          {showReauthPrompt && (
            <div className="bg-red-900/30 border border-red-500 text-red-300 p-4 rounded-md mb-8">
              <p className="mb-4">Your session is missing GitHub username information. Please sign out and sign in again to update your session.</p>
              <div className="flex gap-2">
                <CyberButton 
                  onClick={() => signOut({ callbackUrl: '/login' })} 
                  className="w-full"
                >
                  Sign Out
                </CyberButton>
                <CyberButton 
                  onClick={() => setUseDirectFetch(true)} 
                  variant="outline" 
                  className="w-full"
                >
                  Try Direct Fetch
                </CyberButton>
              </div>
            </div>
          )}

          <div className="bg-black/60 backdrop-blur-sm border border-purple-500 rounded-md p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
              <div className="text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-purple-400">Your Pull Requests</h2>
                {pullRequests.length > 0 && (
                  <p className="text-sm text-purple-300 mt-1">
                    You have {pullRequests.length} pull request{pullRequests.length === 1 ? '' : 's'} 
                    {pullRequests.filter(pr => pr.state === 'open').length > 0 && 
                      ` (${pullRequests.filter(pr => pr.state === 'open').length} open)`}
                    {pullRequests.filter(pr => pr.state === 'closed').length > 0 && 
                      ` (${pullRequests.filter(pr => pr.state === 'closed').length} closed)`}
                  </p>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <CyberButton onClick={fetchPullRequests} variant="outline" title="Refresh PRs" className="flex-1 sm:flex-initial">
                  <RefreshCw size={16} className="mr-2 sm:mr-0" />
                  <span className="sm:hidden">Refresh</span>
                </CyberButton>
                <CyberButton 
                  onClick={() => {
                    setUseDirectFetch(!useDirectFetch);
                    fetchPullRequests();
                  }} 
                  variant="outline" 
                  title={useDirectFetch ? "Use API" : "Direct Fetch"} 
                  className="flex-1 sm:flex-initial"
                >
                  {useDirectFetch ? "Use API" : "Direct Fetch"}
                </CyberButton>
                <CyberButton
                  onClick={() => setShowDebug(!showDebug)}
                  variant="outline"
                  title="Toggle Debug"
                  className="flex-1 sm:flex-initial"
                >
                  Debug {showDebug ? "Off" : "On"}
                </CyberButton>
                <Link href="/dashboard" className="flex-1 sm:flex-initial">
                  <CyberButton variant="outline" className="w-full">
                    <ChevronLeft size={16} className="mr-2" />
                    Back to Dashboard
                  </CyberButton>
                </Link>
              </div>
            </div>

            {/* Debug info */}
            {showDebug && (
              <div className="bg-black/80 border border-yellow-500 p-4 mb-6 rounded overflow-auto max-h-64 text-xs">
                <h3 className="text-yellow-400 mb-2">Debug Information</h3>
                <p className="text-yellow-300">Display Name: {session?.user?.name}</p>
                <p className="text-yellow-300">GitHub Username: {session?.user?.githubUsername || "Not available (using fallback)"}</p>
                <p className="text-yellow-300">Has Access Token: {session?.accessToken ? "Yes" : "No"}</p>
                <p className="text-yellow-300">Using Direct Fetch: {useDirectFetch ? "Yes" : "No"}</p>
              </div>
            )}

            {pullRequests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center sm:justify-start">
                <button 
                  onClick={() => setFilterType('all')} 
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === 'all' 
                      ? 'bg-purple-700 text-white' 
                      : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                  }`}
                >
                  All ({pullRequests.length})
                </button>
                <button 
                  onClick={() => setFilterType('open')} 
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === 'open' 
                      ? 'bg-green-700 text-white' 
                      : 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                  }`}
                >
                  Open ({pullRequests.filter(pr => pr.state === 'open').length})
                </button>
                <button 
                  onClick={() => setFilterType('closed')} 
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === 'closed' 
                      ? 'bg-red-700 text-white' 
                      : 'bg-red-900/30 text-red-300 hover:bg-red-900/50'
                  }`}
                >
                  Closed ({pullRequests.filter(pr => pr.state === 'closed' && !pr.merged_at).length})
                </button>
                <button 
                  onClick={() => setFilterType('merged')} 
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterType === 'merged' 
                      ? 'bg-purple-700 text-white' 
                      : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                  }`}
                >
                  Merged ({pullRequests.filter(pr => pr.merged_at !== null).length})
                </button>
              </div>
            )}

            {pullRequests.length > 0 ? (
              <div className="space-y-4">
                {filteredPullRequests.map((pr) => (
                  <div
                    key={pr.id}
                    className={`p-3 sm:p-4 border ${
                      pr.merged_at 
                        ? 'border-purple-800 bg-purple-900/10' 
                        : pr.state === 'closed' 
                          ? 'border-red-800 bg-red-900/10' 
                          : 'border-green-800 bg-green-900/10'
                    } rounded-md hover:bg-black/60 transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-start gap-3">
                        {getPrStatusIcon(pr)}
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-base sm:text-lg text-white">
                            <a 
                              href={pr.html_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-purple-300 transition flex items-center gap-2"
                            >
                              {pr.title}
                              <ExternalLink className="h-4 w-4 inline-block opacity-70" />
                            </a>
                          </h3>
                          <p className="text-xs sm:text-sm text-purple-300">
                            PR #{pr.number} - Created {formatDate(pr.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {getPrStatusBadge(pr)}
                        
                        <CyberButton variant="outline" size="sm" asChild className="ml-2 h-8">
                          <a 
                            href={pr.html_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 text-purple-400" />
                            <span>View on GitHub</span>
                          </a>
                        </CyberButton>
                      </div>
                    </div>

                    <div className="mt-2 text-xs border-t border-purple-900/50 pt-2">
                      <div className="flex flex-wrap gap-3">
                        <span className="flex items-center gap-1 text-purple-200">
                          <CalendarClock className="h-3 w-3 text-purple-400" />
                          Updated: {formatDate(pr.updated_at)}
                        </span>
                        
                        {pr.closed_at && (
                          <span className="flex items-center gap-1 text-purple-200">
                            <XCircle className="h-3 w-3 text-red-400" />
                            Closed: {formatDate(pr.closed_at)}
                          </span>
                        )}
                        
                        {pr.merged_at && (
                          <span className="flex items-center gap-1 text-purple-200">
                            <CheckCircle className="h-3 w-3 text-purple-400" />
                            Merged: {formatDate(pr.merged_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-10">
                <GitPullRequest className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-purple-500 opacity-50" />
                <p className="text-purple-300 mb-4">You haven't created any pull requests yet</p>
                <Link href="/">
                  <CyberButton>Register Your First Domain</CyberButton>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  )
} 