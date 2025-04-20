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
  ChevronLeft,
  CircleSlash,
  CircleDot,
  Github,
  Calendar,
  X,
  GitMerge,
  User,
  Hash
} from "lucide-react"
import { BackgroundGrid } from "@/components/background-grid"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { NavBar } from "@/components/nav-bar"
import { CyberButton } from "@/components/cyber-button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"

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
      
      // If neither server API mode nor direct fetch mode has a username, 
      // we need to handle this situation more gracefully
      if (!githubUsername && !useDirectFetch) {
        console.warn("GitHub username missing from session");
        
        // Attempt to resolve username automatically
        const resolved = await tryResolveGitHubUsername();
        
        if (!resolved) {
          // Only show re-auth prompt if resolution failed
          setShowReauthPrompt(true);
          setIsLoading(false);
          return;
        }
      }
      
      let data;
      
      // If direct fetch is enabled, bypass our API completely
      if (useDirectFetch && session?.accessToken) {
        console.log("Using direct GitHub API access")
        
        try {
          // First fetch the authenticated user to get their login name
          let userLogin = githubUsername;
          
          if (!userLogin) {
            try {
              const userProfileResponse = await fetch("https://api.github.com/user", {
                headers: {
                  Authorization: `token ${session.accessToken}`,
                  Accept: "application/vnd.github.v3+json",
                },
              });
              
              if (userProfileResponse.ok) {
                const userData = await userProfileResponse.json();
                userLogin = userData.login;
                console.log(`Resolved GitHub username from API: ${userLogin}`);
              } else {
                console.error("Failed to fetch GitHub user profile");
              }
            } catch (profileError) {
              console.error("Error fetching GitHub profile:", profileError);
            }
          }
          
          // If we still don't have a login, use display name as fallback
          if (!userLogin && displayName) {
            userLogin = displayName.toLowerCase().replace(/[^a-z0-9-]/g, '');
            console.log(`Using normalized display name as fallback: ${userLogin}`);
          }
          
          if (!userLogin) {
            throw new Error("Could not determine GitHub username for filtering PRs");
          }
          
          // Try the PR endpoint directly
          const repoOwner = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER || "is-a-dev";
          const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || "register";
          const directApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=all`;
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
          
          // Sort PRs by creation date (newest first)
          userPrs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
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

  // New helper function to try to resolve GitHub username programmatically
  const tryResolveGitHubUsername = async (): Promise<boolean> => {
    if (!session?.accessToken) {
      console.error("No access token available to resolve GitHub username");
      return false;
    }
    
    try {
      console.log("Attempting to resolve GitHub username from GitHub API");
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${session.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log(`Successfully resolved GitHub username: ${userData.login}`);
        
        // Switch to direct fetch mode since we have the data but not in the session
        setUseDirectFetch(true);
        return true;
      } else {
        console.error("Failed to resolve GitHub username", userResponse.status);
        return false;
      }
    } catch (error) {
      console.error("Error resolving GitHub username:", error);
      return false;
    }
  };

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

      <div className="container mx-auto px-2 sm:px-4 pt-20 pb-12 md:py-24 relative z-10">
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
              <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:gap-3 sm:w-auto">
                <CyberButton onClick={fetchPullRequests} variant="outline" title="Refresh PRs" className="flex justify-center items-center sm:flex-initial">
                  <RefreshCw size={16} className="sm:mr-2" />
                  <span className="sr-only sm:not-sr-only">Refresh</span>
                </CyberButton>
                
                <Link href="/dashboard" className="sm:flex-initial">
                  <CyberButton variant="outline" className="w-full sm:w-auto flex justify-center items-center">
                    <span className="hidden sm:inline">Back to </span>
                    <span>Dashboard</span>
                  </CyberButton>
                </Link>
                
                <CyberButton 
                  onClick={() => setUseDirectFetch(!useDirectFetch)} 
                  variant="outline" 
                  title={useDirectFetch ? "Use API" : "Direct Fetch"} 
                  className="text-xs sm:text-sm sm:flex-initial"
                >
                  Direct<span className="hidden sm:inline"> Fetch</span>
                </CyberButton>
                
                <CyberButton
                  onClick={() => setShowDebug(!showDebug)}
                  variant="outline"
                  title="Toggle Debug"
                  className="text-xs sm:text-sm sm:flex-initial"
                >
                  Debug <span className="hidden sm:inline">{showDebug ? "Off" : "On"}</span>
                </CyberButton>
              </div>
            </div>

            {/* Debug info */}
            {showDebug && (
              <div className="mb-6 p-3 border border-yellow-500 bg-yellow-500/20 rounded-md text-xs">
                <h3 className="font-bold mb-1 text-yellow-300">Debug Info:</h3>
                <pre className="overflow-x-auto text-yellow-200 p-2 bg-black/50 rounded">
                  {JSON.stringify(
                    {
                      displayName: session?.user?.name || 'Not set',
                      githubUsername: session?.user?.githubUsername || 'Not available',
                      hasAccessToken: !!session?.accessToken,
                      useDirectFetch,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 mb-6">
              <CyberButton
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                className={`text-sm sm:text-base ${filterType === 'all' ? 'bg-purple-700' : ''}`}
              >
                All
                <span className="ml-1 inline-flex items-center justify-center bg-purple-900 text-purple-100 text-xs rounded-full h-5 w-5 sm:ml-2">
                  {pullRequests.length}
                </span>
              </CyberButton>
              <CyberButton
                variant={filterType === 'open' ? 'default' : 'outline'}
                onClick={() => setFilterType('open')}
                className={`text-sm sm:text-base ${filterType === 'open' ? 'bg-green-700' : ''}`}
              >
                Open
                <span className="ml-1 inline-flex items-center justify-center bg-green-900 text-green-100 text-xs rounded-full h-5 w-5 sm:ml-2">
                  {pullRequests.filter(pr => pr.state === 'open').length}
                </span>
              </CyberButton>
              <CyberButton
                variant={filterType === 'merged' ? 'default' : 'outline'}
                onClick={() => setFilterType('merged')}
                className={`text-sm sm:text-base ${filterType === 'merged' ? 'bg-purple-800' : ''}`}
              >
                Merged
                <span className="ml-1 inline-flex items-center justify-center bg-purple-900 text-purple-100 text-xs rounded-full h-5 w-5 sm:ml-2">
                  {pullRequests.filter(pr => pr.state === 'merged').length}
                </span>
              </CyberButton>
              <CyberButton
                variant={filterType === 'closed' ? 'default' : 'outline'}
                onClick={() => setFilterType('closed')}
                className={`text-sm sm:text-base ${filterType === 'closed' ? 'bg-red-700' : ''}`}
              >
                Closed
                <span className="ml-1 inline-flex items-center justify-center bg-red-900 text-red-100 text-xs rounded-full h-5 w-5 sm:ml-2">
                  {pullRequests.filter(pr => pr.state === 'closed').length}
                </span>
              </CyberButton>
            </div>

            {isLoading ? (
              <div className="text-center py-10">
                <Spinner size="lg" className="mx-auto" />
                <p className="mt-4 text-purple-300">Loading pull requests...</p>
              </div>
            ) : pullRequests.length === 0 ? (
              <div className="text-center py-10 bg-purple-950/20 border border-purple-500/50 rounded-md">
                <CircleSlash size={48} className="mx-auto mb-4 text-purple-400 opacity-50" />
                <h3 className="text-xl font-bold text-purple-300 mb-2">No Pull Requests Found</h3>
                <p className="text-purple-400 mb-6 max-w-md mx-auto">
                  You haven&apos;t created any is-a.dev domain registration requests yet.
                </p>
                <Link href="/dashboard">
                  <CyberButton>Get Your Domain</CyberButton>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPullRequests.map((pr) => (
                  <div
                    key={pr.id}
                    className="border border-purple-500 rounded-md overflow-hidden hover:border-purple-400 transition-colors"
                  >
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-black/50 to-purple-900/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center">
                          {pr.state === 'open' && <CircleDot size={16} className="text-green-400 mr-2" />}
                          {pr.state === 'merged' && <GitMerge size={16} className="text-purple-400 mr-2" />}
                          {pr.state === 'closed' && <X size={16} className="text-red-400 mr-2" />}
                          <h3 className="font-semibold text-lg text-purple-200 truncate">
                            {pr.title || 'Pull Request #' + pr.number}
                          </h3>
                        </div>
                        
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 sm:flex-initial"
                          >
                            <CyberButton variant="outline" className="w-full">
                              <Github size={16} className="mr-2" />
                              View on GitHub
                            </CyberButton>
                          </a>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center text-purple-300">
                            <Calendar size={14} className="mr-2 text-purple-400" />
                            Created: {formatDate(pr.created_at)}
                          </div>
                          {pr.merged_at && (
                            <div className="flex items-center text-purple-300">
                              <GitMerge size={14} className="mr-2 text-purple-400" />
                              Merged: {formatDate(pr.merged_at)}
                            </div>
                          )}
                          {pr.closed_at && !pr.merged_at && (
                            <div className="flex items-center text-purple-300">
                              <X size={14} className="mr-2 text-red-400" />
                              Closed: {formatDate(pr.closed_at)}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center text-purple-300">
                            <Hash size={14} className="mr-2 text-purple-400" />
                            Number: #{pr.number}
                          </div>
                          {pr.user?.login && (
                            <div className="flex items-center text-purple-300">
                              <User size={14} className="mr-2 text-purple-400" />
                              Created by: {pr.user.login}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  )
} 