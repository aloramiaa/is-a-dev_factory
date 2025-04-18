"use client"

import { useState } from "react"
import { PlusCircle, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CyberButton } from "@/components/cyber-button"
import type { RedirectConfig } from "@/types/domain"

interface RedirectConfigFormProps {
  value: RedirectConfig | undefined
  onChange: (value: RedirectConfig | undefined) => void
}

export function RedirectConfigForm({ value, onChange }: RedirectConfigFormProps) {
  const [path, setPath] = useState("")
  const [target, setTarget] = useState("")

  const handleToggleRedirectPaths = () => {
    if (!value) {
      onChange({ redirect_paths: true, custom_paths: {} })
      return
    }

    onChange({
      ...value,
      redirect_paths: !value.redirect_paths,
    })
  }

  const handleAddCustomPath = () => {
    if (!path || !target) return

    const newConfig: RedirectConfig = {
      ...value,
      custom_paths: {
        ...(value?.custom_paths || {}),
        [path]: target,
      },
    }

    onChange(newConfig)
    setPath("")
    setTarget("")
  }

  const handleRemoveCustomPath = (pathToRemove: string) => {
    if (!value?.custom_paths) return

    const newCustomPaths = { ...value.custom_paths }
    delete newCustomPaths[pathToRemove]

    if (Object.keys(newCustomPaths).length === 0 && !value.redirect_paths) {
      onChange(undefined)
      return
    }

    onChange({
      ...value,
      custom_paths: newCustomPaths,
    })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-purple-300">Redirect Configuration</h3>
        <p className="text-sm text-purple-200">Configure custom redirects for your domain.</p>
      </div>

      <div className="p-4 border border-purple-500 rounded-md bg-black/40">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <h4 className="text-md font-bold text-purple-300">Enable Path Redirects</h4>
            <p className="text-xs text-purple-400">Redirect all paths to the same path on your target domain.</p>
          </div>
          <Switch checked={value?.redirect_paths || false} onCheckedChange={handleToggleRedirectPaths} />
        </div>

        <div className="space-y-4 mt-6">
          <h4 className="text-md font-bold text-purple-300">Custom Path Redirects</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Label htmlFor="redirect-path" className="text-sm text-purple-300 mb-1 block">
                Path
              </Label>
              <Input
                id="redirect-path"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/github"
                className="bg-black border-purple-500 focus:border-purple-300"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="redirect-target" className="text-sm text-purple-300 mb-1 block">
                Target URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="redirect-target"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="https://github.com/username"
                  className="bg-black border-purple-500 focus:border-purple-300 flex-1"
                />
                <CyberButton onClick={handleAddCustomPath} disabled={!path || !target}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add
                </CyberButton>
              </div>
            </div>
          </div>

          {value?.custom_paths && Object.keys(value.custom_paths).length > 0 && (
            <div className="mt-4 space-y-2">
              <h5 className="text-sm font-medium text-purple-300">Current Custom Paths</h5>
              <div className="space-y-2">
                {Object.entries(value.custom_paths).map(([path, target]) => (
                  <div
                    key={path}
                    className="flex items-center justify-between p-2 border border-purple-500/30 rounded-md"
                  >
                    <div className="flex-1">
                      <span className="text-purple-300 font-mono text-sm">{path}</span>
                      <span className="text-purple-400 mx-2">→</span>
                      <span className="text-purple-200 font-mono text-sm">{target}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomPath(path)}
                      className="text-purple-400 hover:text-red-400 transition-colors"
                      aria-label="Remove custom path"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
