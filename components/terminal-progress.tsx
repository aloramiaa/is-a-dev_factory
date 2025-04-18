"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Terminal, LoaderCircle, CheckCircle, AlertCircle } from "lucide-react"

export type Step = {
  id: string
  message: string
  status: "pending" | "loading" | "complete" | "error"
}

interface TerminalProgressProps {
  steps: Step[]
  isOpen: boolean
  onClose?: () => void
}

export function TerminalProgress({ steps, isOpen, onClose }: TerminalProgressProps) {
  const [blinkCursor, setBlinkCursor] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom as new steps are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [steps])

  // Blink cursor animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkCursor(prev => !prev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="w-full max-w-2xl bg-black border border-purple-600 rounded-lg shadow-2xl shadow-purple-800/30 overflow-hidden"
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between bg-purple-900/60 px-4 py-2 border-b border-purple-600">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-purple-300" />
              <span className="text-purple-300 font-mono text-sm">is-a.dev domain registration</span>
            </div>
            <button 
              onClick={onClose} 
              className="text-purple-300 hover:text-white focus:outline-none"
            >
              ×
            </button>
          </div>
          
          {/* Terminal content */}
          <div 
            ref={containerRef}
            className="bg-black p-4 font-mono text-sm text-green-400 h-80 overflow-y-auto flex flex-col gap-1"
          >
            {steps.map((step) => (
              <div key={step.id} className="flex items-start gap-2">
                <div className="flex-shrink-0 pt-0.5">
                  {step.status === "loading" && (
                    <LoaderCircle className="h-4 w-4 text-yellow-400 animate-spin" />
                  )}
                  {step.status === "complete" && (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  )}
                  {step.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  {step.status === "pending" && (
                    <span className="text-purple-400">$</span>
                  )}
                </div>
                <div className="flex-1">
                  {step.message}
                  {step.status === "loading" && (
                    <span className={blinkCursor ? "opacity-100" : "opacity-0"}>_</span>
                  )}
                </div>
              </div>
            ))}
            
            {/* Command prompt */}
            <div className="flex items-center gap-2 mt-1 text-purple-400">
              <span>$</span>
              <span className={`h-4 w-2 bg-purple-400 inline-block ${blinkCursor ? "opacity-100" : "opacity-0"}`}></span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 