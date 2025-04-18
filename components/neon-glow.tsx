import type React from "react"

interface NeonGlowProps {
  children: React.ReactNode
  color?: string
}

export function NeonGlow({ children, color = "purple" }: NeonGlowProps) {
  return <div className="neon-glow">{children}</div>
}
