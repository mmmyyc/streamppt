"use client"

import { useState, useEffect } from "react"
import { Maximize, Minimize } from "lucide-react"
import { Button } from "@/components/ui/button"

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          // Force resize event to ensure content scales properly
          window.dispatchEvent(new Event("resize"))
        })
        .catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
    } else {
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => {
            // Force resize event after exiting fullscreen
            setTimeout(() => {
              window.dispatchEvent(new Event("resize"))
            }, 100)
          })
          .catch((err) => {
            console.error(`Error exiting fullscreen: ${err.message}`)
          })
      }
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="fixed top-4 right-4 z-40 bg-background/80 backdrop-blur-sm"
      onClick={toggleFullscreen}
    >
      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      <span className="sr-only">{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</span>
    </Button>
  )
}

