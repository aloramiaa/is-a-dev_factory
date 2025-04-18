import type React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CyberButtonProps extends React.ComponentProps<typeof Button> {
  variant?: "default" | "large" | "outline" | "ghost"
}

export function CyberButton({ children, className, variant = "default", ...props }: CyberButtonProps) {
  const baseStyles =
    "relative overflow-hidden cyber-border bg-black text-purple-300 hover:text-white transition-all duration-300"

  const variantStyles = {
    default:
      "before:absolute before:inset-0 before:bg-purple-600/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity after:absolute after:inset-0 after:bg-gradient-to-r after:from-purple-600/0 after:via-purple-600/30 after:to-purple-600/0 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
    large:
      "text-lg py-6 before:absolute before:inset-0 before:bg-purple-600/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity after:absolute after:inset-0 after:bg-gradient-to-r after:from-purple-600/0 after:via-purple-600/30 after:to-purple-600/0 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
    outline: "border border-purple-500 hover:bg-purple-900/20",
    ghost: "bg-transparent hover:bg-purple-900/20 border-none shadow-none",
  }

  return (
    <Button className={cn(baseStyles, variantStyles[variant as keyof typeof variantStyles], className)} {...props}>
      {children}
    </Button>
  )
}
