"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Github, FileCode2, AlertTriangle, Heart, ExternalLink, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { JsonPreview } from "@/components/json-preview"
import { BackgroundGrid } from "@/components/background-grid"
import { NavBar } from "@/components/nav-bar"
import { RecordForm } from "@/components/record-form"
import { RedirectConfigForm } from "@/components/redirect-config-form"
import { checkSubdomainAvailability, createPullRequest, checkDomainOwnership, ProgressStep } from "@/app/actions/github"
import type { DomainData, DomainRecord, RedirectConfig } from "@/types/domain"
import { Octokit } from "@octokit/rest"
import { TerminalProgress } from "@/components/terminal-progress"
import { validateDnsRecords } from "@/lib/dns-validation"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [subdomain, setSubdomain] = useState("")
  const [description, setDescription] = useState("")
  const [repo, setRepo] = useState("")
  const [record, setRecord] = useState<DomainRecord>({})
  const [redirectConfig, setRedirectConfig] = useState<RedirectConfig | undefined>(undefined)
  const [proxied, setProxied] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Terminal progress states
  const [showProgress, setShowProgress] = useState(false)
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  
  useEffect(() => {
    // Reset availability check when subdomain changes
    if (isAvailable !== null) {
      setIsAvailable(null)
    }
  }, [subdomain])

  const handleCheckAvailability = async () => {
    if (!subdomain) {
      toast({
        title: "Error",
        description: "Please enter a subdomain to check",
        variant: "destructive",
      })
      return
    }

    if (status !== "authenticated") {
      toast({
        title: "Authentication Required",
        description: "Please sign in to check subdomain availability",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsChecking(true)

    try {
      // Check if this is a subdomain of another domain (contains a dot)
      if (subdomain.includes('.')) {
        const parts = subdomain.split('.')
        const mainDomain = parts[parts.length - 1] // Get the last part as the main domain
        
        // For domain ownership checks, get the GitHub login from the GitHub API
        const token = session?.accessToken
        if (token) {
          const octokit = new Octokit({ auth: token })
          const { data: user } = await octokit.users.getAuthenticated()
          const githubUsername = user.login
          
          // Check if the user owns the main domain using their GitHub login
          const isOwner = await checkDomainOwnership(mainDomain, githubUsername)
          
          if (!isOwner) {
            setIsAvailable(false)
            toast({
              title: "Ownership Required",
              description: `You must own ${mainDomain}.is-a.dev to register ${subdomain}.is-a.dev`,
              variant: "destructive",
            })
            setIsChecking(false)
            return
          }
        }
      }

      const available = await checkSubdomainAvailability(subdomain)
      setIsAvailable(available)

      toast({
        title: available ? "Subdomain Available!" : "Subdomain Taken",
        description: available
          ? `${subdomain}.is-a.dev is available for registration`
          : `${subdomain}.is-a.dev is already registered`,
        variant: available ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Error checking availability:", error)
      toast({
        title: "Error",
        description: "Failed to check subdomain availability. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsChecking(false)
    }
  }

  const generateJsonPreview = () => {
    if (!subdomain || !session?.user?.name) return null

    const domainData: DomainData = {
      owner: {
        username: session.user.name,
        email: session.user.email || undefined,
      },
      record,
    }

    if (description) {
      domainData.description = description
    }

    if (repo) {
      domainData.repo = repo
    }

    if (proxied) {
      domainData.proxied = true
    }

    if (
      redirectConfig &&
      (redirectConfig.redirect_paths ||
        (redirectConfig.custom_paths && Object.keys(redirectConfig.custom_paths).length > 0))
    ) {
      domainData.redirect_config = redirectConfig
    }

    return JSON.stringify(domainData, null, 2)
  }

  const handleSubmit = async () => {
    if (!subdomain) {
      toast({
        title: "Missing Information",
        description: "Please enter a subdomain",
        variant: "destructive",
      })
      return
    }

    if (Object.keys(record).length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one DNS record",
        variant: "destructive",
      })
      return
    }

    // Validate DNS records
    const validation = validateDnsRecords(record)
    if (!validation.isValid) {
      // Count total errors
      const totalErrors = Object.values(validation.errors).flat().filter(Boolean).length
      
      toast({
        title: "Invalid DNS Records",
        description: `Please fix the ${totalErrors} validation error${totalErrors > 1 ? 's' : ''} in your DNS records.`,
        variant: "destructive",
      })
      return
    }

    if (isAvailable !== true) {
      toast({
        title: "Availability Check Required",
        description: "Please verify that the subdomain is available before submitting",
        variant: "destructive",
      })
      return
    }

    // Add validation for screenshot for non-email domains
    const isEmailOnlyDomain = Object.keys(record).length === 1 && record.MX;
    if (!isEmailOnlyDomain && !screenshot) {
      toast({
        title: "Missing Screenshot",
        description: "Please upload a screenshot of your website for non-email domains",
        variant: "destructive",
      });
      return;
    }

    if (status !== "authenticated") {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit your domain",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    // Reset progress steps and show terminal
    setProgressSteps([
      { id: "start", message: "Starting domain registration process...", status: "complete" },
      { id: "prepare", message: "Preparing your domain data...", status: "loading" }
    ])
    setShowProgress(true)
    setIsSubmitting(true)

    // Double-check subdomain ownership for nested domains
    if (subdomain.includes('.')) {
      addProgressStep({ 
        id: "ownership", 
        message: "Checking domain ownership for nested domain...", 
        status: "loading" 
      })
      
      const parts = subdomain.split('.')
      const mainDomain = parts[parts.length - 1] // Get the last part as the main domain
      
      // For domain ownership checks, get the GitHub login from the GitHub API
      const token = session?.accessToken
      if (token) {
        const octokit = new Octokit({ auth: token })
        const { data: user } = await octokit.users.getAuthenticated()
        const githubUsername = user.login
        
        // Check if the user owns the main domain using their GitHub login
        const isOwner = await checkDomainOwnership(mainDomain, githubUsername)
        
        if (!isOwner) {
          updateProgressStep({ 
            id: "ownership", 
            message: `Ownership check failed - you must own ${mainDomain}.is-a.dev to register ${subdomain}.is-a.dev`, 
            status: "error" 
          })
          
          toast({
            title: "Ownership Required",
            description: `You must own ${mainDomain}.is-a.dev to register ${subdomain}.is-a.dev`,
            variant: "destructive",
          })
          
          setIsSubmitting(false)
          return
        }
        
        updateProgressStep({ 
          id: "ownership", 
          message: `Confirmed ownership of parent domain ${mainDomain}.is-a.dev`, 
          status: "complete" 
        })
      }
    }

    try {
      updateProgressStep({ 
        id: "prepare", 
        message: "Domain data prepared successfully", 
        status: "complete" 
      })
      
      // Add simulated progress steps for GitHub operations
      simulateGitHubProgress()
      
      const domainData: DomainData = {
        owner: {
          username: session.user!.name!,
          email: session.user!.email || undefined,
        },
        record,
      }

      if (description) {
        domainData.description = description
      }

      if (repo) {
        domainData.repo = repo
      }

      if (proxied) {
        domainData.proxied = true
      }

      if (
        redirectConfig &&
        (redirectConfig.redirect_paths ||
          (redirectConfig.custom_paths && Object.keys(redirectConfig.custom_paths).length > 0))
      ) {
        domainData.redirect_config = redirectConfig
      }

      const result = await createPullRequest(subdomain, domainData, screenshot)

      // Add final success step
      addProgressStep({ 
        id: "complete", 
        message: `All done! Pull request created at ${result.url}`, 
        status: "complete" 
      })

      toast({
        title: "Success!",
        description: "Your pull request has been created successfully.",
      })

      // Open the PR in a new tab
      window.open(result.url, "_blank")

      // Reset the form after 3 seconds (allow user to see completion)
      setTimeout(() => {
        setSubdomain("")
        setDescription("")
        setRepo("")
        setRecord({})
        setRedirectConfig(undefined)
        setProxied(false)
        setScreenshot(null)
        setIsAvailable(null)
        setShowProgress(false)
        setProgressSteps([])
        setIsSubmitting(false)
      }, 3000)
    } catch (error: any) {
      console.error("Error creating pull request:", error)
      
      // Add error step
      addProgressStep({ 
        id: "error", 
        message: `Error: ${error.message || "Failed to create pull request"}`, 
        status: "error" 
      })
      
      // Add a specific message for permission errors
      if (error.message?.includes("Resource not accessible by personal access token")) {
        addProgressStep({ 
          id: "permission-error", 
          message: "You need to sign out and sign back in to grant additional GitHub permissions", 
          status: "error" 
        })
        
        toast({
          title: "GitHub Permission Error",
          description: "Please sign out and sign back in to grant the necessary GitHub permissions.",
          variant: "destructive",
        })
        
        // Redirect to login page with reauth flag after a brief delay
        setTimeout(() => {
          router.push("/login?reauth=true")
        }, 2000)
      } else {
        toast({
          title: "Error",
          description: "Failed to create pull request. Please try again.",
          variant: "destructive",
        })
      }
      
      setIsSubmitting(false)
    }
  }

  // Helper functions for progress steps
  const addProgressStep = (step: ProgressStep) => {
    setProgressSteps(prev => [...prev, step])
  }

  const updateProgressStep = (step: ProgressStep) => {
    setProgressSteps(prev => {
      const existingIndex = prev.findIndex(s => s.id === step.id)
      if (existingIndex >= 0) {
        const newSteps = [...prev]
        newSteps[existingIndex] = step
        return newSteps
      }
      return [...prev, step]
    })
  }

  // Simulate the progress steps for GitHub operations
  const simulateGitHubProgress = () => {
    const steps = [
      { id: "auth", message: "Authenticating with GitHub...", delay: 500 },
      { id: "user", message: "Getting GitHub user information...", delay: 800 },
      { id: "fork-check", message: "Checking for existing fork...", delay: 1000 },
      { id: "fork-create", message: "Forking repository is-a-dev/register...", delay: 1500 },
      { id: "wait-fork", message: "Waiting for fork to be ready...", delay: 3000 },
      { id: "verify-fork", message: "Verifying fork access...", delay: 800 },
      { id: "get-branch", message: "Getting default branch information...", delay: 700 },
      { id: "get-commit", message: "Getting latest commit information...", delay: 800 },
      { id: "create-branch", message: `Creating branch in fork: add-${subdomain}...`, delay: 1200 },
      { id: "create-file", message: `Creating file: domains/${subdomain}.json...`, delay: 1500 },
      { id: "create-pr", message: "Creating pull request...", delay: 2000 },
    ]

    // Start with all steps as pending
    steps.forEach(step => {
      addProgressStep({
        id: step.id,
        message: step.message,
        status: "loading"
      })
    })

    // Then update them one by one with simulated delays
    let cumulativeDelay = 0
    steps.forEach((step, index) => {
      cumulativeDelay += step.delay
      
      setTimeout(() => {
        // Update this step to complete
        updateProgressStep({
          id: step.id,
          message: step.message.replace("...", ""),
          status: "complete"
        })
      }, cumulativeDelay)
    })
  }

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      {/* Terminal Progress Component */}
      <TerminalProgress 
        steps={progressSteps}
        isOpen={showProgress}
        onClose={() => {
          if (!isSubmitting) {
            setShowProgress(false)
          }
        }}
      />

      <div className="container mx-auto px-4 py-24 relative z-10">
        <header className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <NeonGlow>
              <GlitchText className="text-6xl md:text-8xl font-bold tracking-tighter" text=".is-a.dev" />
            </NeonGlow>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl text-purple-300 max-w-2xl mx-auto"
          >
            Grab your own sweet-looking .is-a.dev subdomain with our cyberpunk factory
          </motion.p>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Tabs defaultValue="register" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-black border border-purple-500">
              <TabsTrigger value="register" className="data-[state=active]:bg-purple-900">
                Register
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-purple-900">
                Preview
              </TabsTrigger>
              <TabsTrigger value="info" className="data-[state=active]:bg-purple-900">
                Info
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="register"
              className="space-y-8 p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm"
            >
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-purple-400">Check Subdomain Availability</h2>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="Enter subdomain (e.g. cyberdev or profile.cyberdev)"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ""))}
                      className="bg-black border-purple-500 focus:border-purple-300 h-12"
                    />
                    <div className="absolute right-3 top-3 text-purple-400 pointer-events-none">.is-a.dev</div>
                  </div>

                  <CyberButton onClick={handleCheckAvailability} disabled={isChecking || !subdomain} className="h-12">
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Availability"
                    )}
                  </CyberButton>
                </div>

                {isAvailable !== null && (
                  <div className={`flex items-center gap-2 ${isAvailable ? "text-green-400" : "text-red-400"}`}>
                    {isAvailable ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    <span>
                      {isAvailable ? `${subdomain}.is-a.dev is available!` : `${subdomain}.is-a.dev is already taken.`}
                    </span>
                  </div>
                )}
              </div>

              {isAvailable === true ? (
                <>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-purple-400">Domain Information</h2>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-purple-300">Description (optional)</label>
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="A brief description of your domain"
                          className="bg-black border-purple-500 focus:border-purple-300"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-purple-300">Repository URL (optional)</label>
                        <Input
                          value={repo}
                          onChange={(e) => setRepo(e.target.value)}
                          placeholder="https://github.com/username/repo"
                          className="bg-black border-purple-500 focus:border-purple-300"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="proxied"
                          checked={proxied}
                          onChange={(e) => setProxied(e.target.checked)}
                          className="rounded border-purple-500 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="proxied" className="text-sm font-medium text-purple-300">
                          Enable Cloudflare proxy
                        </label>
                      </div>
                    </div>
                  </div>

                  <RecordForm 
                    value={record} 
                    onChange={setRecord} 
                    proxied={proxied}
                    redirect_config={redirectConfig}
                  />

                  <RedirectConfigForm value={redirectConfig} onChange={setRedirectConfig} />

                  {/* Screenshot Upload - only show for non-email-only domains */}
                  {!(Object.keys(record).length === 1 && record.MX) && (
                    <div className="space-y-4 mt-6">
                      <h2 className="text-2xl font-bold text-purple-400">Website Screenshot</h2>
                      <p className="text-sm text-purple-200">
                        Please upload a screenshot of your website. This will be stored in your own GitHub repository
                        and linked in the pull request for reviewers to see.
                      </p>
                      
                      <div className="border-2 border-dashed border-purple-500 rounded-md p-6 text-center">
                        {screenshot ? (
                          <div className="space-y-4">
                            <img 
                              src={URL.createObjectURL(screenshot)} 
                              alt="Website Screenshot" 
                              className="max-h-64 mx-auto"
                            />
                            <CyberButton onClick={() => setScreenshot(null)} variant="outline">
                              Remove Screenshot
                            </CyberButton>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <p className="text-purple-300">Drag and drop an image here, or click to select</p>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  setScreenshot(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                              id="screenshot-upload"
                              ref={(input) => {
                                // Store a reference to the file input
                                if (input) {
                                  (window as any).screenshotInput = input;
                                }
                              }}
                            />
                            <CyberButton 
                              onClick={() => {
                                // Directly trigger the file input click
                                const input = (window as any).screenshotInput;
                                if (input) {
                                  input.click();
                                }
                              }} 
                              variant="outline"
                              className="cursor-pointer"
                            >
                              Select Screenshot
                            </CyberButton>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-purple-400">
                        Note: This screenshot will be uploaded to a public repository in your GitHub account.
                      </p>
                    </div>
                  )}

                  <div className="pt-4">
                    <CyberButton
                      onClick={handleSubmit}
                      disabled={isSubmitting || !subdomain || Object.keys(record).length === 0}
                      className="w-full"
                      variant="large"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Pull Request...
                        </>
                      ) : (
                        "Create Pull Request"
                      )}
                    </CyberButton>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-purple-300">
                  {isAvailable === false ? (
                    <p>This domain is already taken. Please try a different subdomain.</p>
                  ) : (
                    <p>Please check domain availability before continuing.</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="preview"
              className="p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm"
            >
              <h2 className="text-2xl font-bold text-purple-400 mb-4">JSON Preview</h2>
              
              {isAvailable === true ? (
                <>
                  <JsonPreview json={generateJsonPreview()} />

                  <div className="mt-6 text-purple-300 text-sm">
                    <p>This JSON will be used to create a file in the is-a.dev/register repository.</p>
                    <p className="mt-2">
                      The file will be named:{" "}
                      <code className="bg-purple-900/30 px-2 py-1 rounded">domains/{subdomain || "yoursubdomain"}.json</code>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-purple-300">
                  {isAvailable === false ? (
                    <p>This domain is already taken. Please try a different subdomain.</p>
                  ) : (
                    <p>Please check domain availability before continuing.</p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-purple-400 mb-4">Important Links</h2>

              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Github className="text-purple-400" />
                  <a
                    href="https://github.com/is-a-dev/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 flex items-center gap-1"
                  >
                    is-a-dev/register Repository <ExternalLink size={14} />
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <FileCode2 className="text-purple-400" />
                  <a
                    href="https://is-a.dev/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 flex items-center gap-1"
                  >
                    Documentation <ExternalLink size={14} />
                  </a>
                </li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-400 mt-8 mb-4">Report Abuse</h2>
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-1 flex-shrink-0" />
                <p className="text-purple-300">
                  If you suspect that a subdomain is abusing the service, please
                  <a
                    href="https://github.com/is-a-dev/register/issues/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 mx-1"
                  >
                    report it here
                  </a>
                  .
                </p>
              </div>

              <h2 className="text-2xl font-bold text-purple-400 mt-8 mb-4">Donations</h2>
              <div className="flex items-start gap-3">
                <Heart className="text-red-400 mt-1 flex-shrink-0" />
                <p className="text-purple-300">
                  This project is a free service for developers and will stay that way. Please consider
                  <a
                    href="https://github.com/is-a-dev/register#donations"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300 mx-1"
                  >
                    donating
                  </a>
                  to help us keep this service running forever!
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <footer className="relative z-10 border-t border-purple-800 mt-16 py-6 text-center text-purple-400 text-sm">
        <p>Built with 💜 for the developer community</p>
      </footer>
    </main>
  )
}
