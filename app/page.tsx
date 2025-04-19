"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Github, FileCode2, AlertTriangle, Heart, ExternalLink } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { BackgroundGrid } from "@/components/background-grid"
import { NavBar } from "@/components/nav-bar"
import { MultiStepForm } from "@/components/multi-step-form"
import { TerminalProgress } from "@/components/terminal-progress"
import type { ProgressStep } from "@/app/actions/github"

export default function Home() {
  const [showProgress, setShowProgress] = useState(false)
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <BackgroundGrid />
      <NavBar />

      {/* Terminal Progress Component */}
      <TerminalProgress 
        steps={progressSteps}
        isOpen={showProgress}
        onClose={() => {
            setShowProgress(false)
        }}
      />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <header className="text-center mb-10 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6"
          >
            <NeonGlow>
              <GlitchText className="text-4xl sm:text-6xl md:text-8xl font-bold tracking-tighter" text=".is-a.dev" />
            </NeonGlow>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-base sm:text-xl text-purple-300 max-w-2xl mx-auto px-2"
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
            <TabsList className="relative w-full mb-6 md:mb-8 flex h-12 rounded-md bg-black border border-purple-500 overflow-hidden">
              <TabsTrigger 
                value="register" 
                className="flex-1 h-full text-sm sm:text-base text-center border-r border-purple-500 text-purple-100 transition-colors rounded-none data-[state=active]:bg-purple-900 data-[state=active]:text-white"
              >
                Register
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="flex-1 h-full text-sm sm:text-base text-center border-r border-purple-500 text-purple-100 transition-colors rounded-none data-[state=active]:bg-purple-900 data-[state=active]:text-white"
              >
                Preview
              </TabsTrigger>
              <TabsTrigger 
                value="info" 
                className="flex-1 h-full text-sm sm:text-base text-center text-purple-100 transition-colors rounded-none data-[state=active]:bg-purple-900 data-[state=active]:text-white"
              >
                Info
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="register"
              className="space-y-8 p-4 sm:p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm"
            >
              <MultiStepForm />
            </TabsContent>

            <TabsContent
              value="preview"
              className="p-4 sm:p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mb-4">JSON Preview</h2>
              <p className="text-center py-8 text-purple-300">
                Fill out the registration form to see the JSON preview.
              </p>
            </TabsContent>

            <TabsContent value="info" className="p-4 sm:p-6 border border-purple-500 rounded-md bg-black/60 backdrop-blur-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mb-4">Important Links</h2>

              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Github className="text-purple-400 flex-shrink-0" />
                  <a
                    href="https://github.com/is-a-dev/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 flex items-center gap-1 text-sm sm:text-base break-words"
                  >
                    is-a-dev/register Repository <ExternalLink size={14} className="flex-shrink-0" />
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <FileCode2 className="text-purple-400 flex-shrink-0" />
                  <a
                    href="https://is-a.dev/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-100 flex items-center gap-1 text-sm sm:text-base"
                  >
                    Documentation <ExternalLink size={14} className="flex-shrink-0" />
                  </a>
                </li>
              </ul>

              <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mt-8 mb-4">Report Abuse</h2>
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-yellow-400 mt-1 flex-shrink-0" />
                <p className="text-purple-300 text-sm sm:text-base">
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

              <h2 className="text-xl sm:text-2xl font-bold text-purple-400 mt-8 mb-4">Donations</h2>
              <div className="flex items-start gap-3">
                <Heart className="text-red-400 mt-1 flex-shrink-0" />
                <p className="text-purple-300 text-sm sm:text-base">
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

      <footer className="relative z-10 border-t border-purple-800 mt-8 py-6 text-center text-purple-400 text-xs sm:text-sm">
        <p>Built with 💜 for the developer community</p>
      </footer>
    </main>
  )
}
