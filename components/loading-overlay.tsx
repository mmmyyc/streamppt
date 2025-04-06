"use client"

import { Loader2 } from "lucide-react"

interface LoadingOverlayProps {
  isLoading: boolean
}

export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <h2 className="text-xl font-bold mb-2">加载中...</h2>
      <p className="text-muted-foreground">正在准备您的演示文稿</p>
    </div>
  )
}

