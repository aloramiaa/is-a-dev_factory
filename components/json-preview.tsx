"use client"
import { motion } from "framer-motion"

interface JsonPreviewProps {
  json: string | null
}

export function JsonPreview({ json }: JsonPreviewProps) {
  if (!json) {
    return (
      <div className="p-6 border border-dashed border-purple-700 rounded-md bg-black/60 text-purple-400 text-center">
        Fill in the form to generate JSON preview
      </div>
    )
  }

  // Format the JSON with syntax highlighting
  const formattedJson = json
    .replace(/"([^"]+)":/g, '<span class="text-cyan-400">"$1"</span>:')
    .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="text-yellow-400">$1</span>')
    .replace(/\{|\}/g, '<span class="text-purple-400">$&</span>')
    .replace(/\[|\]/g, '<span class="text-purple-400">$&</span>')
    .replace(/true|false/g, '<span class="text-yellow-400">$&</span>')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 border border-purple-700 rounded-md bg-black/60 overflow-auto max-h-[400px]"
    >
      <pre className="text-purple-300 font-mono text-sm" dangerouslySetInnerHTML={{ __html: formattedJson }} />
    </motion.div>
  )
}
