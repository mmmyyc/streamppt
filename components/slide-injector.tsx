"use client"

import { useEffect, useRef } from "react"

interface SlideInjectorProps {
  slides: string[]
}

export function SlideInjector({ slides }: SlideInjectorProps) {
  const injectedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Function to inject the scaler script into each slide iframe
    const injectScalerScript = () => {
      slides.forEach((slidePath) => {
        // Skip if already injected
        if (injectedRef.current.has(slidePath)) return

        try {
          // Find all iframes
          const iframes = document.querySelectorAll("iframe")

          iframes.forEach((iframe) => {
            if (iframe.src.includes(slidePath)) {
              // Wait for iframe to load
              iframe.onload = () => {
                try {
                  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document

                  if (iframeDoc) {
                    // Create script element
                    const script = iframeDoc.createElement("script")
                    script.src = "/scripts/slide-scaler.js"
                    script.async = true

                    // Append to iframe document
                    iframeDoc.head.appendChild(script)

                    // Mark as injected
                    injectedRef.current.add(slidePath)
                  }
                } catch (err) {
                  console.error("Error injecting script into iframe:", err)
                }
              }
            }
          })
        } catch (err) {
          console.error("Error finding iframe:", err)
        }
      })
    }

    // Run injection
    injectScalerScript()

    // Set up a mutation observer to detect when new iframes are added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          injectScalerScript()
        }
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
    }
  }, [slides])

  // This component doesn't render anything
  return null
}

