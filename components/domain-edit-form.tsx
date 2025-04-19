"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Loader2, ChevronRight, ChevronLeft, CheckCircle, Clipboard, TerminalSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CyberButton } from "@/components/cyber-button"
import { RecordForm } from "@/components/record-form"
import { RedirectConfigForm } from "@/components/redirect-config-form"
import { JsonPreview } from "@/components/json-preview"
import { useToast } from "@/hooks/use-toast"
import { validateDnsRecords } from "@/lib/dns-validation"
import type { DomainData, DomainRecord, RedirectConfig, DomainOwner } from "@/types/domain"

// Define the steps for the form
const STEPS = {
  DOMAIN_INFO: 0,
  DNS_RECORDS: 1,
  REDIRECT_CONFIG: 2,
  SCREENSHOT: 3,
  REVIEW: 4,
}

// Helper function to check if a domain record only has MX records
const isEmailOnly = (record: DomainRecord): boolean => {
  return Object.keys(record).length === 1 && Object.keys(record)[0] === "MX";
}

interface DomainEditFormProps {
  initialDomain: {
    name: string;
    domain: string;
    description?: string;
    record?: DomainRecord;
    owner?: DomainOwner;
    data?: any;
  };
}

export function DomainEditForm({ initialDomain }: DomainEditFormProps) {
  const { data: session, status } = useSession()
  const { toast } = useToast()
  
  // Form state
  const [currentStep, setCurrentStep] = useState(STEPS.DOMAIN_INFO)
  const [description, setDescription] = useState(initialDomain.description || "")
  const [repo, setRepo] = useState(initialDomain.data?.repo || "")
  const [record, setRecord] = useState<DomainRecord>(initialDomain.record || {})
  const [redirectConfig, setRedirectConfig] = useState<RedirectConfig | undefined>(
    initialDomain.data?.redirect_config
  )
  const [proxied, setProxied] = useState(initialDomain.data?.proxied || false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  
  // Status tracking
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressSteps, setProgressSteps] = useState<Array<{
    id: string;
    message: string;
    status: "pending" | "loading" | "complete" | "error";
  }>>([])
  const [pullRequestUrl, setPullRequestUrl] = useState<string | null>(null)
  const [pullRequestJson, setPullRequestJson] = useState<string | null>(null)
  
  // Navigation functions
  const nextStep = () => {
    setCurrentStep((prev) => prev + 1)
  }
  
  const prevStep = () => {
    setCurrentStep((prev) => prev - 1)
  }
  
  // Generate JSON preview for the domain
  const generateJsonPreview = () => {
    if (!initialDomain.name || !session?.user?.name) return null

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
  const addProgressStep = (step: { id: string; message: string; status: "pending" | "loading" | "complete" | "error" }) => {
    setProgressSteps((prev) => [...prev, step])
  }
  
  // Update a progress step in the terminal progress display
  const updateProgressStep = (step: { id: string; message: string; status: "pending" | "loading" | "complete" | "error" }) => {
    setProgressSteps((prev) => 
      prev.map((s) => (s.id === step.id ? { ...s, ...step } : s))
    )
  }
  
  // Create the pull request for updating domain
  const handleSubmit = async () => {
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

    // Check if screenshot is required (for non-email domains)
    if (!isEmailOnly(record) && !screenshot) {
      toast({
        title: "Screenshot Required",
        description: "Please upload a screenshot of your website. It's mandatory for non-mail server domains.",
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
      // Construct a clean domain data object
      const domainData: DomainData = {
        owner: {
          username: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        record: Object.entries(record).reduce((acc, [key, value]) => {
          acc[key as keyof DomainRecord] = value;
          return acc;
        }, {} as DomainRecord),
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
          (redirectConfig.custom_paths && Object.keys(redirectConfig.custom_paths || {}).length > 0))
      ) {
        domainData.redirect_config = redirectConfig
      }

      // Generate JSON for manual PR creation
      const domainDataJson = JSON.stringify(domainData)
      setPullRequestJson(domainDataJson)

      if (!initialDomain.name) {
        throw new Error("Missing domain name");
      }

      // Create form data for API request
      const formData = new FormData()
      formData.append("subdomain", initialDomain.name)
      formData.append("domainData", domainDataJson)
      if (screenshot) {
        formData.append("screenshot", screenshot)
      }

      // Update progress step
      updateProgressStep({
        id: "connect",
        message: "Connected to GitHub API",
        status: "complete"
      })

      // Add fork progress step
      addProgressStep({
        id: "fork",
        message: "Forking repository...",
        status: "loading"
      })

      try {
        // Submit form data to API
        const response = await fetch("/api/update-domain", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error("API Error response:", errorData)
          throw new Error(errorData.error || "Failed to update domain")
        }

        const result = await response.json()

        // Update fork progress
        updateProgressStep({
          id: "fork",
          message: "Repository forked successfully",
          status: "complete"
        })

        // If screenshot was uploaded
        if (screenshot) {
          addProgressStep({
            id: "screenshot",
            message: "Uploading screenshot...",
            status: "loading"
          })
          
          updateProgressStep({
            id: "screenshot",
            message: "Screenshot uploaded successfully",
            status: "complete"
          })
        }

        // Add file creation step
        addProgressStep({
          id: "create",
          message: "Creating domain JSON file...",
          status: "loading"
        })
        
        updateProgressStep({
          id: "create",
          message: "Domain JSON file created successfully",
          status: "complete"
        })

        // Add PR creation step
        addProgressStep({
          id: "pr",
          message: "Creating pull request...",
          status: "loading"
        })
        
        updateProgressStep({
          id: "pr",
          message: "Pull request created successfully",
          status: "complete"
        })

        // Set the actual PR URL
        setPullRequestUrl(result.url)
        
        addProgressStep({
          id: "complete",
          message: "Process completed successfully!",
          status: "complete"
        })
        
        setIsSubmitting(false)
      } catch (error: any) {
        console.error("Error updating domain:", error)
        
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
    } catch (error: any) {
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
      
      toast({
        title: "Error",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      })
      
      setIsSubmitting(false)
    }
  }
  
  // Copy JSON to clipboard
  const handleCopyJson = () => {
    if (pullRequestJson) {
      navigator.clipboard.writeText(pullRequestJson)
      toast({
        title: "Copied!",
        description: "JSON data copied to clipboard",
      })
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-black/60 backdrop-blur-sm border border-purple-500 rounded-md p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-purple-400 mb-6">Editing {initialDomain.name}.is-a.dev</h1>
        
        <div className="mb-6 pb-4 border-b border-purple-800/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-purple-300">
              <span className="text-purple-400 font-medium">Current Status:</span> Active
            </div>
            <div className="text-sm text-purple-300">
              <span className="text-purple-400 font-medium">Owner:</span> {initialDomain.owner?.username}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          {currentStep === STEPS.DOMAIN_INFO && (
            <motion.div
              key="domain-info"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-purple-400">Step 1: Domain Information</h2>
              <p className="text-purple-300">Update information about your domain.</p>

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

              <div className="flex justify-end mt-6">
                <CyberButton onClick={nextStep} className="w-1/3 sm:w-auto">
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
              <h2 className="text-xl font-bold text-purple-400">Step 2: DNS Records</h2>
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
                <CyberButton onClick={nextStep} disabled={Object.keys(record).length === 0} className="w-1/3 sm:w-auto">
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
              <h2 className="text-xl font-bold text-purple-400">Step 3: Redirect Configuration</h2>
              <p className="text-purple-300">Configure custom redirects for your domain (optional).</p>

              <RedirectConfigForm value={redirectConfig} onChange={setRedirectConfig} />

              <div className="flex justify-between mt-6">
                <CyberButton onClick={prevStep} variant="outline" className="w-1/3 sm:w-auto">
                  <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="sm:inline">Back</span>
                </CyberButton>
                <CyberButton onClick={nextStep} className="w-1/3 sm:w-auto">
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
              <h2 className="text-xl font-bold text-purple-400">Step 4: Website Screenshot</h2>
              <p className="text-purple-300">
                {isEmailOnly(record) 
                  ? "Upload a screenshot of your website (optional for mail server domains)." 
                  : "Upload a screenshot of your website (required for all non-mail server domains)."}
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

              <div className="flex justify-between mt-6">
                <CyberButton onClick={prevStep} variant="outline" className="w-1/3 sm:w-auto">
                  <ChevronLeft className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="sm:inline">Back</span>
                </CyberButton>
                <CyberButton 
                  onClick={() => {
                    if (!isEmailOnly(record) && !screenshot) {
                      toast({
                        title: "Screenshot Required",
                        description: "Please upload a screenshot of your website. It's mandatory for non-mail server domains.",
                        variant: "destructive",
                      });
                      return;
                    }
                    nextStep();
                  }} 
                  className="w-1/3 sm:w-auto"
                >
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
              <h2 className="text-xl font-bold text-purple-400">Step 5: Review & Submit</h2>
              <p className="text-purple-300">Review your domain configuration and submit your update request.</p>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-purple-300 mb-2">Domain Configuration</h3>
                  <JsonPreview json={generateJsonPreview()} />

                  <div className="mt-6 pt-4 border-t border-purple-800">
                    {showProgress && (
                      <div className="mb-6 border border-purple-500 rounded-md overflow-hidden">
                        <div className="bg-black p-2">
                          <div className="flex items-center gap-2 mb-2">
                            <TerminalSquare className="h-4 w-4 text-purple-400" />
                            <span className="text-purple-300 text-sm font-mono">
                              Terminal Progress
                            </span>
                          </div>
                          <div className="p-3 bg-gray-900 rounded-md font-mono text-xs h-60 overflow-y-auto">
                            {progressSteps.map((step, index) => (
                              <div key={index} className="mb-2">
                                <span className={`mr-2 ${
                                  step.status === "loading" ? "text-yellow-400" :
                                  step.status === "complete" ? "text-green-400" :
                                  "text-red-400"
                                }`}>
                                  {step.status === "loading" ? "⟳" : 
                                   step.status === "complete" ? "✓" : 
                                   "✗"}
                                </span>
                                <span className={`${
                                  step.status === "loading" ? "text-yellow-200" :
                                  step.status === "complete" ? "text-green-200" :
                                  "text-red-200"
                                }`}>
                                  {step.message}
                                </span>
                                {step.status === "loading" && (
                                  <span className="animate-pulse">...</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!pullRequestUrl ? (
                      <CyberButton
                        onClick={handleSubmit}
                        disabled={isSubmitting || Object.keys(record).length === 0}
                        className="w-full"
                        variant="large"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creating Update Pull Request...
                          </>
                        ) : (
                          "Update Domain"
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
                            Your domain update request has been submitted. You can view your pull request here:
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
                        <li>Update the file at <code className="bg-black/40 px-1 py-0.5 rounded">domains/{initialDomain.name}.json</code></li>
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
        </div>
      </div>
    </div>
  )
} 