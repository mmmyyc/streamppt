"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Sidebar } from "@/components/sidebar"
import { SlideNavigation } from "@/components/slide-navigation"
import { FullscreenButton } from "@/components/fullscreen-button"
import { SidebarToggle } from "@/components/sidebar-toggle"
import type { Slide } from "@/types/slide"

interface PresentationLayoutProps {
  children: ReactNode
  slides: Slide[]
  currentSlideIndex: number
  onSlideChange: (index: number) => void
  onSlideUpload: (slides: Slide[]) => void
  onSlidesReorder: (slides: Slide[]) => void
  onSlideDelete: (slideId: string) => void
}

export function PresentationLayout({
  children,
  slides,
  currentSlideIndex,
  onSlideChange,
  onSlideUpload,
  onSlidesReorder,
  onSlideDelete,
}: PresentationLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (currentSlideIndex > 0) {
            onSlideChange(currentSlideIndex - 1)
          }
          break
        case "ArrowRight":
          if (currentSlideIndex < slides.length - 1) {
            onSlideChange(currentSlideIndex + 1)
          }
          break
        case "Escape":
          if (sidebarOpen) {
            setSidebarOpen(false)
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentSlideIndex, onSlideChange, sidebarOpen, slides.length])

  return (
    <div className={`relative flex h-full min-h-full max-h-full overflow-hidden bg-background ${isFullscreen ? "fullscreen-mode" : ""}`}>
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        slides={slides}
        currentSlideIndex={currentSlideIndex}
        onSlideChange={onSlideChange}
        onSlideUpload={onSlideUpload}
        onSlidesReorder={onSlidesReorder}
        onSlideDelete={onSlideDelete}
      />

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <SidebarToggle open={sidebarOpen} setOpen={setSidebarOpen} />
        <FullscreenButton />

        <div className="w-full h-full flex items-center justify-center p-4 overflow-hidden">{children}</div>

        <SlideNavigation
          totalSlides={slides.length}
          currentSlideIndex={currentSlideIndex}
          onSlideChange={onSlideChange}
        />
      </div>
    </div>
  )
}

