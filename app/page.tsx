"use client"

import { useState, useEffect } from "react"
import { PresentationLayout } from "@/components/presentation-layout"
import { SlideViewer } from "@/components/slide-viewer"
import { LoadingOverlay } from "@/components/loading-overlay"
import { defaultSlides } from "@/lib/default-slides"
import type { Slide } from "@/types/slide"
import { SlideInjector } from "@/components/slide-injector"

export default function Home() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [slidePaths, setSlidePaths] = useState<string[]>([])

  useEffect(() => {
    // Initialize with default slides
    setSlides(defaultSlides)

    // Hide loading overlay after a delay
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    // Extract slide paths for the injector
    setSlidePaths(defaultSlides.map((slide) => slide.path))

    return () => clearTimeout(timer)
  }, [])

  // Apply global overflow settings
  useEffect(() => {
    // Prevent scrolling on the body when in presentation mode
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Restore scrolling when component unmounts
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const handleSlideUpload = (newSlides: Slide[]) => {
    setSlides((prevSlides) => [...prevSlides, ...newSlides])
    // Navigate to the first new slide
    const newIndex = slides.length
    if (newIndex < slides.length + newSlides.length) {
      setCurrentSlideIndex(newIndex)
    }

    // Add new slide paths for the injector
    setSlidePaths((prev) => [...prev, ...newSlides.map((slide) => slide.path)])
  }

  const handleSlideChange = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlideIndex(index)
    }
  }

  const handleSlidesReorder = (reorderedSlides: Slide[]) => {
    setSlides(reorderedSlides)
    
    // Update slide paths in the same order
    setSlidePaths(reorderedSlides.map((slide) => slide.path))
  }

  const handleSlideDelete = (slideId: string) => {
    // 找到要删除的幻灯片索引
    const slideIndex = slides.findIndex(slide => slide.id === slideId);
    if (slideIndex === -1) return;
    
    // 创建新的幻灯片数组，排除要删除的幻灯片
    const updatedSlides = slides.filter(slide => slide.id !== slideId);
    
    // 获取要删除的幻灯片的URL，以便之后释放
    const slidePathToRevoke = slides[slideIndex].path;
    
    // 更新幻灯片数组
    setSlides(updatedSlides);
    
    // 更新幻灯片路径数组
    setSlidePaths(updatedSlides.map(slide => slide.path));
    
    // 如果没有幻灯片了，当前索引设为0
    if (updatedSlides.length === 0) {
      setCurrentSlideIndex(0);
    }
    // 如果删除的是当前显示的幻灯片
    else if (slideIndex === currentSlideIndex) {
      // 如果删除的是最后一张幻灯片，显示新的最后一张
      if (slideIndex >= updatedSlides.length) {
        setCurrentSlideIndex(updatedSlides.length - 1);
      }
      // 否则保持当前索引（会自动显示下一张）
    }
    // 如果删除的幻灯片在当前幻灯片之前，当前索引需要减1
    else if (slideIndex < currentSlideIndex) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
    
    // 如果幻灯片URL是Blob URL，则释放它以避免内存泄漏
    if (slidePathToRevoke.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(slidePathToRevoke);
      } catch (e) {
        console.error('Error revoking object URL:', e);
      }
    }
  }

  return (
    <main className="min-h-screen h-screen max-h-screen bg-background overflow-hidden">
      <LoadingOverlay isLoading={loading} />
      <PresentationLayout
        slides={slides}
        currentSlideIndex={currentSlideIndex}
        onSlideChange={handleSlideChange}
        onSlideUpload={handleSlideUpload}
        onSlidesReorder={handleSlidesReorder}
        onSlideDelete={handleSlideDelete}
      >
        <SlideViewer slides={slides} currentSlideIndex={currentSlideIndex} onSlideChange={handleSlideChange} />
      </PresentationLayout>
      <SlideInjector slides={slidePaths} />
    </main>
  )
}

