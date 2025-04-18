"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

interface GlitchTextProps {
  text: string
  className?: string
}

export function GlitchText({ text, className = "" }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    // Randomly trigger glitch effect
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsGlitching(true)
        setTimeout(() => setIsGlitching(false), 200)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.span
      className={`glitch-effect ${className}`}
      data-text={text}
      animate={{
        opacity: isGlitching ? [1, 0.8, 1] : 1,
        x: isGlitching ? [0, -2, 2, 0] : 0,
      }}
      transition={{ duration: 0.2 }}
    >
      {text}
    </motion.span>
  )
}
