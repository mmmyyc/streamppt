"use client"

interface SlideNavigationProps {
  totalSlides: number
  currentSlideIndex: number
  onSlideChange: (index: number) => void
}

export function SlideNavigation({ totalSlides, currentSlideIndex, onSlideChange }: SlideNavigationProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
      {/* Slide counter */}
      <span className="text-sm font-medium mr-4">
        {currentSlideIndex + 1} / {totalSlides}
      </span>

      {/* Navigation dots */}
      <div className="flex space-x-1">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlideIndex ? "bg-primary scale-125" : "bg-muted hover:bg-primary/50"
            }`}
            onClick={() => onSlideChange(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

