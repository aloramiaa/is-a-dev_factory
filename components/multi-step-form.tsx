"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ChevronRight, ChevronLeft, CheckCircle, Clipboard, TerminalSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CyberButton } from "@/components/cyber-button"
import { RecordForm } from "@/components/record-form"
import { RedirectConfigForm } from "@/components/redirect-config-form"
import { JsonPreview } from "@/components/json-preview"
import { useToast } from "@/hooks/use-toast"
import { validateDnsRecords } from "@/lib/dns-validation"
import { checkSubdomainAvailability, createPullRequest, checkDomainOwnership, ProgressStep } from "@/app/actions/github"
import type { DomainData, DomainRecord, RedirectConfig } from "@/types/domain"
import { Octokit } from "@octokit/rest"

// Define the steps for the form
const STEPS = {
  DOMAIN_CHECK: 0,
  DOMAIN_INFO: 1,
  DNS_RECORDS: 2,
  REDIRECT_CONFIG: 3,
  SCREENSHOT: 4,
  REVIEW: 5,
}

export function MultiStepForm() {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // Form state
  const [currentStep, setCurrentStep] = useState(STEPS.DOMAIN_CHECK)
  const [subdomain, setSubdomain] = useState("")
  const [description, setDescription] = useState("")
  const [repo, setRepo] = useState("")
  const [record, setRecord] = useState<DomainRecord>({})
  const [redirectConfig, setRedirectConfig] = useState<RedirectConfig | undefined>(undefined)
  const [proxied, setProxied] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  
  // Status tracking
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null)
  const [pullRequestJson, setPullRequestJson] = useState<string | null>(null)
  
  // Reset availability check when subdomain changes
  useEffect(() => {
    if (isAvailable !== null) {
      setIsAvailable(null)
    }
  }, [subdomain])
  
  // Navigation functions
  const nextStep = () => {
    setCurrentStep((prev) => prev + 1)
  }
  
  const prevStep = () => {
    setCurrentStep((prev) => prev - 1)
  }
  
  // Check if the domain is available
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
      
      // Auto-advance to next step if available
      if (available) {
        setTimeout(() => nextStep(), 1000)
      }
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
  
  // Generate JSON preview for the domain
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
  
  // Add a progress step to the terminal progress display
  const addProgressStep = (step: ProgressStep) => {
    setProgressSteps((prev) => [...prev, step])
  }
  
  // Update a progress step in the terminal progress display
  const updateProgressStep = (step: ProgressStep) => {
    setProgressSteps((prev) => 
      prev.map((s) => (s.id === step.id ? { ...s, ...step } : s))
    )
  }
  
  // Create the pull request
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

    // Show progress terminal
    setShowProgress(true)
    setIsSubmitting(true)
    
    // Add initial progress step
    addProgressStep({
      id: "connect",
      message: "Connecting to GitHub API...",
      status: "loading"
    })

    try {
      // Simulate GitHub API flow with progress updates
      const domainData: DomainData = {
        owner: {
          username: session?.user?.name || "",
          email: session?.user?.email || "",
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

      // Generate JSON for manual PR creation
      setPullRequestJson(JSON.stringify(domainData, null, 2))

      // Update progress step
      updateProgressStep({
        id: "connect",
        message: "Connected to GitHub API",
        status: "complete"
      })

      // Add more progress steps
      addProgressStep({
        id: "fork",
        message: "Forking repository...",
        status: "loading"
      })

      // Simulate progress with delays
      setTimeout(() => {
        updateProgressStep({
          id: "fork",
          message: "Forked repository",
          status: "complete"
        })
        
        // Upload screenshot step (if provided)
        if (screenshot) {
          addProgressStep({
            id: "screenshot",
            message: "Uploading screenshot...",
            status: "loading"
          })
          
          setTimeout(() => {
            updateProgressStep({
              id: "screenshot",
              message: "Screenshot uploaded",
              status: "complete"
            })
            createJsonFile()
          }, 1500)
        } else {
          createJsonFile()
        }
      }, 2000)
      
      // Create JSON file step
      function createJsonFile() {
        addProgressStep({
          id: "create",
          message: "Creating domain JSON file...",
          status: "loading"
        })
        
        setTimeout(() => {
          updateProgressStep({
            id: "create",
            message: "Domain JSON file created",
            status: "complete"
          })
          createPr()
        }, 1500)
      }
      
      // Create Pull Request step
      function createPr() {
        addProgressStep({
          id: "pr",
          message: "Creating pull request...",
          status: "loading"
        })
        
        setTimeout(() => {
          updateProgressStep({
            id: "pr",
            message: "Pull request created",
            status: "complete"
          })
          
          // Set a fake PR URL for now
          setPullRequestUrl(`https://github.com/is-a-dev/register/pull/new-pr-${Math.floor(Math.random() * 10000)}`)
          
          addProgressStep({
            id: "complete",
            message: "Process completed successfully!",
            status: "complete"
          })
          
          setIsSubmitting(false)
        }, 2000)
      }
    } catch (error) {
      console.error("Error creating pull request:", error)
      
      // Update the last step to error
      const lastStep = progressSteps[progressSteps.length - 1]
      if (lastStep) {
        updateProgressStep({
          id: lastStep.id,
          message: "Error: " + (error instanceof Error ? error.message : "Unknown error"),
          status: "error"
        })
      }
      
      addProgressStep({
        id: "error",
        message: "An error occurred during the process. You can try the manual method.",
        status: "error"
      })
      
      toast({
        title: "Error",
        description: "Failed to create pull request. You can try the manual method.",
        variant: "destructive",
      })
      
      setIsSubmitting(false)
    }
  }
  
  // Copy JSON to clipboard
  const handleCopyJson = () => {
    if (pullRequestJson) {
      navigator.clipboard.writeText(pullRequestJson);
      toast({
        title: "Copied!",
        description: "JSON data copied to clipboard",
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {currentStep === STEPS.DOMAIN_CHECK && (
          <motion.div
            key="domain-check"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-purple-400">Step 1: Check Subdomain Availability</h2>
            <p className="text-purple-300">Enter your desired subdomain to check if it's available.</p>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Enter subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ""))}
                  className="bg-black border-purple-500 focus:border-purple-300 h-12 pr-20 sm:pr-24"
                />
                <div className="absolute right-3 top-3 text-purple-400 pointer-events-none">.is-a.dev</div>
              </div>

              <CyberButton onClick={handleCheckAvailability} disabled={isChecking || !subdomain} className="h-12 w-full md:w-auto">
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
                {isAvailable ? <CheckCircle size={20} /> : <Loader2 size={20} />}
                <span>
                  {isAvailable ? `${subdomain}.is-a.dev is available!` : `${subdomain}.is-a.dev is already taken.`}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === STEPS.DOMAIN_INFO && (
          <motion.div
            key="domain-info"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-purple-400">Step 2: Domain Information</h2>
            <p className="text-purple-300">Provide additional information about your domain.</p>

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

            <div className="flex justify-between mt-6">
              <CyberButton onClick={prevStep} variant="outline" className="w-1/3 sm:w-auto">
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="sm:inline">Back</span>
              </CyberButton>
              <CyberButton onClick={nextStep} className="w-1/2 sm:w-auto">
                <span className="sm:inline">Next</span>
                <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
              </CyberButton>
            </div>
          </motion.div>
        )}

        {currentStep === STEPS.DNS_RECORDS && (
          <motion.div
            key="dns-records"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-purple-400">Step 3: DNS Records</h2>
            <p className="text-purple-300">Configure DNS records for your domain.</p>

            <RecordForm 
              value={record} 
              onChange={setRecord} 
              proxied={proxied}
              redirect_config={redirectConfig}
            />

            <div className="flex justify-between mt-6">
              <CyberButton onClick={prevStep} variant="outline" className="w-1/3 sm:w-auto">
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="sm:inline">Back</span>
              </CyberButton>
              <CyberButton onClick={nextStep} disabled={Object.keys(record).length === 0} className="w-1/2 sm:w-auto">
                <span className="sm:inline">Next</span>
                <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
              </CyberButton>
            </div>
          </motion.div>
        )}

        {currentStep === STEPS.REDIRECT_CONFIG && (
          <motion.div
            key="redirect-config"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-purple-400">Step 4: Redirect Configuration</h2>
            <p className="text-purple-300">Configure custom redirects for your domain (optional).</p>

            <RedirectConfigForm value={redirectConfig} onChange={setRedirectConfig} />

            <div className="flex justify-between mt-6">
              <CyberButton onClick={prevStep} variant="outline" className="w-1/3 sm:w-auto">
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="sm:inline">Back</span>
              </CyberButton>
              <CyberButton onClick={nextStep} className="w-1/2 sm:w-auto">
                <span className="sm:inline">Next</span>
                <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
              </CyberButton>
            </div>
          </motion.div>
        )}

        {currentStep === STEPS.SCREENSHOT && (
          <motion.div
            key="screenshot"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-purple-400">Step 5: Website Screenshot</h2>
            <p className="text-purple-300">Upload a screenshot of your website (optional but recommended).</p>

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

            <div className="flex justify-between mt-6">
              <CyberButton onClick={prevStep} variant="outline" className="w-1/3 sm:w-auto">
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="sm:inline">Back</span>
              </CyberButton>
              <CyberButton onClick={nextStep} className="w-1/2 sm:w-auto">
                <span className="sm:inline">Next</span>
                <ChevronRight className="ml-1 sm:ml-2 h-4 w-4" />
              </CyberButton>
            </div>
          </motion.div>
        )}

        {currentStep === STEPS.REVIEW && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-purple-400">Step 6: Review & Submit</h2>
            <p className="text-purple-300">Review your domain configuration and submit your request.</p>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <h3 className="text-lg font-bold text-purple-300 mb-2">Domain Configuration</h3>
                <JsonPreview json={generateJsonPreview()} />

                <div className="mt-6 pt-4 border-t border-purple-800">
                  {!pullRequestUrl ? (
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
                        "Generate Pull Request"
                      )}
                    </CyberButton>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-900/20 border border-green-500 rounded-md text-green-300">
                        <h4 className="font-bold flex items-center">
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Pull Request Generated Successfully!
                        </h4>
                        <p className="mt-2">
                          Your domain registration request has been submitted. You can view your pull request here:
                        </p>
                        <a 
                          href={pullRequestUrl} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-2 text-blue-400 underline"
                        >
                          {pullRequestUrl}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                <details className="group cursor-pointer">
                  <summary className="flex items-center gap-2 text-lg font-semibold text-purple-300">
                    <TerminalSquare className="h-5 w-5" />
                    <span>Alternative: Manual PR Method</span>
                    <div className="ml-auto transition-transform duration-300 group-open:rotate-180">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </summary>
                  
                  <div className="p-4 mt-4 bg-purple-900/20 border border-purple-500 rounded-md">
                    <p className="text-sm text-purple-200 mb-4">
                      If the automatic process fails, you can manually create a pull request by following these steps:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-purple-200 space-y-2">
                      <li>Fork the <a href="https://github.com/is-a-dev/register" target="_blank" rel="noopener noreferrer" className="text-blue-400">is-a-dev/register</a> repository</li>
                      <li>Create a new file at <code className="bg-black/40 px-1 py-0.5 rounded">domains/{subdomain || "yoursubdomain"}.json</code></li>
                      <li>Copy the JSON configuration below</li>
                      <li>Create a pull request to the main repository</li>
                    </ol>
                    
                    <div className="mt-4 p-2 bg-black/40 rounded-md relative">
                      <pre className="text-xs text-purple-200 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {pullRequestJson || generateJsonPreview()}
                      </pre>
                      <button 
                        onClick={handleCopyJson}
                        className="absolute top-2 right-2 text-purple-400 hover:text-purple-300"
                        title="Copy JSON"
                      >
                        <Clipboard size={16} />
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <CyberButton onClick={prevStep} variant="outline" disabled={isSubmitting} className="w-1/3 sm:w-auto">
                <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="sm:inline">Back</span>
              </CyberButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 