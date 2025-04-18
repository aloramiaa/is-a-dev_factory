"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle, Globe, Edit, Loader2, RefreshCw, ExternalLink, Code } from "lucide-react"
import { BackgroundGrid } from "@/components/background-grid"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { NavBar } from "@/components/nav-bar"
import { CyberButton } from "@/components/cyber-button"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getDomainUrl, getDomainTarget, shouldShowWarning } from "@/utils/domain-utils"

// Repository constants
const REPO_OWNER = process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER || "is-a-dev"
const REPO_NAME = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || "register"

interface DomainData {
  name: string;
  domain: string;
  description?: string;
  record?: any;
  data: any;
}

interface UserDomainsResponse {
  domains: DomainData[];
  debug?: {
    rawUsername: string;
    username: string;
    gitHubUsername: string;
  };
}

// Helper function to truncate strings similar to test.js
const truncateString = (str: string, num: number) => {
  if (!str) return '';
  return str.length > num ? str.slice(0, num) + '...' : str;
};

// Helper function to detect record type
const getRecordType = (record: any) => {
  if (!record) return 'Unknown';
  if (record.URL) return 'URL Redirect';
  if (record.CNAME) return 'CNAME';
  if (record.A) return 'A Record';
  if (record.MX) return 'MX Record';
  if (record.TXT) return 'TXT Record';
  if (record.NS) return 'NS Record';
  return 'Custom';
};

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [userDomains, setUserDomains] = useState<DomainData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState("Initializing...")
  const [error, setError] = useState<string | null>(null)
  const [usernameDebug, setUsernameDebug] = useState<{ 
    rawUsername: string; 
    username: string; 
    gitHubUsername: string 
  } | null>(null)

  const fetchUserDomains = async () => {
    if (status !== "authenticated") return;
    
    try {
      setIsLoading(true);
      setLoadingStatus("Connecting to raw.is-a.dev...");
      setError(null);
      
      const response = await fetch('/api/user-domains');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch domains');
      }
      
      setLoadingStatus("Processing domain data...");
      const data: UserDomainsResponse = await response.json();
      console.log("API response:", data);
      setUserDomains(data.domains || []);
      setUsernameDebug(data.debug || null);
      
      // Show success toast
      if (data.domains?.length > 0) {
        toast({
          title: "Success",
          description: `Found ${data.domains.length} domain${data.domains.length === 1 ? '' : 's'} registered to your account.`,
        });
      } else {
        toast({
          title: "No domains found",
          description: `Searched for username: ${data.debug?.rawUsername || session.user?.name}. If this isn't correct, please update your GitHub profile.`,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error("Error fetching user domains:", err);
      setError(err.message || "Failed to fetch your domains. Please try again later.");
      
      toast({
        title: "Error",
        description: err.message || "Failed to fetch your domains",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserDomains();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <main className="relative min-h-screen bg-black text-white overflow-hidden flex items-center justify-center">
        <BackgroundGrid />
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-purple-500" />
          <h2 className="text-xl text-purple-300 mb-2">Loading your domains...</h2>
          <p className="text-sm text-purple-400">{loadingStatus}</p>
          <p className="text-xs text-purple-500 mt-2">Fetching domains from raw.is-a.dev</p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <header className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <NeonGlow>
              <GlitchText className="text-5xl md:text-6xl font-bold tracking-tighter" text="Your Domains" />
            </NeonGlow>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl text-purple-300 max-w-2xl mx-auto"
          >
            Manage all your .is-a.dev subdomains in one place
          </motion.p>
          
          {usernameDebug ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-sm text-purple-400 mt-4 max-w-xl mx-auto"
            >
              <p className="mb-2">Username information used for matching:</p>
              <div className="bg-black/60 backdrop-blur-sm border border-purple-900 rounded-md p-2 text-left font-mono">
                <p><span className="text-purple-500">Raw:</span> {usernameDebug.rawUsername}</p>
                <p><span className="text-purple-500">Normalized:</span> {usernameDebug.username}</p>
                <p><span className="text-purple-500">GitHub:</span> {usernameDebug.gitHubUsername}</p>
              </div>
              <p className="mt-2 text-xs">
                If these don't match your GitHub username, 
                your domains might not be found. Your GitHub username should be <span className="text-purple-300">aloramiaa</span>.
              </p>
            </motion.div>
          ) : session?.user?.name && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-sm text-purple-400 mt-2"
            >
              Showing domains for GitHub user: <span className="font-mono bg-purple-900/30 px-2 py-1 rounded">{session.user.name}</span>
            </motion.p>
          )}
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
              <CyberButton onClick={fetchUserDomains} className="w-full">
                <RefreshCw size={16} className="mr-2" />
                Try Again
              </CyberButton>
            </div>
          )}

          <div className="bg-black/60 backdrop-blur-sm border border-purple-500 rounded-md p-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-purple-400">Your Registered Domains</h2>
                {userDomains.length > 0 && (
                  <p className="text-sm text-purple-300 mt-1">
                    You have {userDomains.length} registered domain{userDomains.length === 1 ? '' : 's'}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <CyberButton onClick={fetchUserDomains} variant="outline" title="Refresh domains">
                  <RefreshCw size={16} />
                </CyberButton>
                <Link href="/">
                  <CyberButton>Register New Domain</CyberButton>
                </Link>
              </div>
            </div>

            {userDomains.length > 0 ? (
              <div className="space-y-4">
                {userDomains.map((domain) => (
                  <div
                    key={domain.name}
                    className="p-4 border border-purple-800 rounded-md bg-black/40 hover:bg-black/60 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Globe className="text-purple-400" />
                        <div>
                          <h3 className="font-bold text-lg text-white">{domain.name}.is-a.dev</h3>
                          <p className="text-sm text-purple-300">
                            {truncateString(domain.description || domain.domain, 60)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={getDomainUrl(domain.name)}
                                target={shouldShowWarning(domain.name) ? "_self" : "_blank"}
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline flex items-center gap-1"
                              >
                                {domain.name}.is-a.dev <ExternalLink size={14} />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Visit Website</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/domains/${domain.name}.json`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-purple-300 hover:text-purple-200 hover:bg-purple-900/30 rounded-md"
                              >
                                <Edit size={18} />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View Configuration</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    <div className="mt-2 text-xs border-t border-purple-900/50 pt-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-purple-900/30 px-2 py-1 rounded-md text-purple-200">
                          Type: {getRecordType(domain.record)}
                        </span>
                        {domain.data.repo && (
                          <a 
                            href={domain.data.repo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-purple-900/30 px-2 py-1 rounded-md text-purple-200 flex items-center gap-1"
                          >
                            <Code size={12} />
                            Repository
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-purple-500 opacity-50" />
                <p className="text-purple-300 mb-4">You don't have any registered domains yet</p>
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
