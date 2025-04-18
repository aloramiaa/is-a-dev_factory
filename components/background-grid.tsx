"use client"

import { useEffect, useState } from "react"

export function BackgroundGrid() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [])

  return (
    <>
      <div className="fixed inset-0 grid-background z-0" />

      <div
        className="fixed inset-0 bg-gradient-to-b from-purple-900/20 via-black/40 to-black/80 z-0"
        style={{
          backgroundPosition: `${mousePosition.x * 0.02}px ${mousePosition.y * 0.02}px`,
        }}
      />

      {/* Animated glow spots */}
      <div
        className="fixed w-96 h-96 rounded-full bg-purple-600/20 blur-[100px] animate-pulse z-0"
        style={{
          left: `calc(${mousePosition.x}px - 12rem)`,
          top: `calc(${mousePosition.y}px - 12rem)`,
          opacity: 0.3,
          transition: "left 0.5s ease-out, top 0.5s ease-out",
        }}
      />

      <div
        className="fixed w-64 h-64 rounded-full bg-cyan-600/20 blur-[80px] animate-pulse z-0"
        style={{
          animationDelay: "1s",
          left: "70%",
          top: "30%",
        }}
      />

      <div
        className="fixed w-80 h-80 rounded-full bg-fuchsia-600/20 blur-[90px] animate-pulse z-0"
        style={{
          animationDelay: "2s",
          left: "20%",
          top: "60%",
        }}
      />

      {/* Scanlines effect */}
      <div className="scanlines" />
    </>
  )
}
