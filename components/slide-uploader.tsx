"use client"

import type React from "react"

import { useRef, type ReactNode } from "react"

interface SlideUploaderProps {
  children: ReactNode
  onUpload: (files: FileList | null) => void
}

export function SlideUploader({ children, onUpload }: SlideUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpload(e.target.files)
    // Reset the input value so the same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="relative" onClick={handleClick}>
      {children}
      <input ref={fileInputRef} type="file" accept=".html" multiple onChange={handleChange} className="hidden" />
    </div>
  )
}

