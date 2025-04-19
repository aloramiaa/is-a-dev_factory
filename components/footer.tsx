"use client"

import { Heart, MessageCircle, Globe, Github } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-purple-800 mt-8 py-6 text-center text-purple-400 text-xs sm:text-sm">
      <div className="container mx-auto px-4">
        <p className="flex items-center justify-center gap-1">
          Built with <Heart className="h-4 w-4 text-pink-500 fill-pink-500" /> for the developer community by{" "}
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-purple-300 hover:text-purple-100 font-medium underline underline-offset-2">
                Alora Mia
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0 bg-black border border-purple-500">
              <div className="grid gap-1">
                <Link 
                  href="https://discord.com/users/994135527815118898" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-purple-900/40 transition-colors text-purple-200"
                >
                  <MessageCircle className="h-4 w-4 text-purple-400" />
                  <span>Discord DM</span>
                </Link>
                <Link 
                  href="https://alora.is-a.dev/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-purple-900/40 transition-colors text-purple-200"
                >
                  <Globe className="h-4 w-4 text-purple-400" />
                  <span>Personal Website</span>
                </Link>
                <Link 
                  href="https://github.com/aloramiaa" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-purple-900/40 transition-colors text-purple-200"
                >
                  <Github className="h-4 w-4 text-purple-400" />
                  <span>GitHub Profile</span>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </p>
      </div>
    </footer>
  )
} 