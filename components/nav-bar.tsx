"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { Github, LogOut, User, Database } from "lucide-react"
import { NeonGlow } from "@/components/neon-glow"
import { GlitchText } from "@/components/glitch-text"
import { CyberButton } from "@/components/cyber-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function NavBar() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-purple-900/50 bg-black/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <NeonGlow>
            <GlitchText className="text-2xl font-bold tracking-tighter" text=".is-a.dev" />
          </NeonGlow>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-purple-300 ${
              isActive("/") ? "text-purple-300" : "text-purple-400/70"
            }`}
          >
            Home
          </Link>
          <Link
            href="/domains"
            className={`text-sm font-medium transition-colors hover:text-purple-300 ${
              isActive("/domains") ? "text-purple-300" : "text-purple-400/70"
            }`}
          >
            Browse Domains
          </Link>
          <Link
            href="/docs"
            className={`text-sm font-medium transition-colors hover:text-purple-300 ${
              isActive("/docs") ? "text-purple-300" : "text-purple-400/70"
            }`}
          >
            Documentation
          </Link>
          <a
            href="https://github.com/is-a-dev/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-purple-400/70 transition-colors hover:text-purple-300"
          >
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-4">
          {status === "authenticated" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-purple-500/50 p-1 pr-3 hover:bg-purple-900/20 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                    <AvatarFallback className="bg-purple-900 text-white">
                      {session.user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-purple-300">{session.user?.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black border border-purple-500">
                <DropdownMenuLabel className="text-purple-300">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-purple-800/50" />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <Database size={16} />
                    <span>My Domains</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`https://github.com/${session.user?.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Github className="h-4 w-4" />
                    <span>GitHub Profile</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-purple-800/50" />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 cursor-pointer text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <CyberButton asChild variant="outline">
              <Link href="/login">
                <User className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </CyberButton>
          )}
        </div>
      </div>
    </header>
  )
}
