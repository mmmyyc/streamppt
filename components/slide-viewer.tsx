"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Slide } from "@/types/slide"
import { cn } from "@/lib/utils"

// 定义过渡动画类型
type TransitionType =
  | 'slide-horizontal'
  | 'slide-vertical'
  | 'fade'
  | 'zoom'
  | 'rotate'
  | 'flip'
  | 'cube'

interface SlideViewerProps {
  slides: Slide[]
  currentSlideIndex: number
  onSlideChange: (index: number) => void
}

type FrameState = {
  key: string;
  src: string | null;
  title: string;
  isLoaded: boolean;
  isActive: boolean; // 当前是否在前台显示
  slideIndex: number; // Store the index associated with the slide
  ref: React.RefObject<HTMLIFrameElement | null>; // Allow null for the ref type
  className?: string;
  style?: React.CSSProperties;
};

export function SlideViewer({ slides, currentSlideIndex, onSlideChange }: SlideViewerProps) {
  const iframeRefA = useRef<HTMLIFrameElement>(null);
  const iframeRefB = useRef<HTMLIFrameElement>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState<TransitionType>('slide-horizontal');
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const slideCache = useRef<Map<string, boolean>>(new Map()); // Keep cache for loaded check
  const prevSlideIndexRef = useRef<number>(currentSlideIndex); // Ref to track previous index for direction

  // 过渡时间设置（毫秒）
  const transitionDuration = 800;

  const [frameA, setFrameA] = useState<FrameState>({
    key: `frame-a-${slides[currentSlideIndex]?.id || 'initial'}`,
    src: slides[currentSlideIndex]?.path || null,
    title: slides[currentSlideIndex]?.title || 'Frame A',
    isLoaded: false,
    isActive: true, // Start with Frame A active
    slideIndex: currentSlideIndex,
    ref: iframeRefA,
    className: '',
    style: {},
  });

  const [frameB, setFrameB] = useState<FrameState>({
    key: `frame-b-initial`,
    src: null, // Start empty
    title: 'Frame B',
    isLoaded: false,
    isActive: false, // Start with Frame B inactive
    slideIndex: -1, // Indicates no slide initially
    ref: iframeRefB,
    className: '',
    style: {},
  });

  // 随机选择过渡动画
  const selectRandomTransition = useCallback((): TransitionType => {
    const transitions: TransitionType[] = [
      'slide-horizontal', 'slide-vertical', 'fade', 'zoom', 'rotate', 'flip', 'cube'
    ];
    return transitions[Math.floor(Math.random() * transitions.length)];
  }, []);

  // 强制重新缩放
  const forceRescale = useCallback((iframeElement: HTMLIFrameElement | null) => {
    if (iframeElement?.contentWindow) {
      iframeElement.contentWindow.postMessage({ type: 'force-scale' }, '*');
    }
  }, []);

  // 应用样式
  const applyIframeStyles = useCallback((iframeElement: HTMLIFrameElement | null) => {
    if (!iframeElement?.contentDocument) return;
    const doc = iframeElement.contentDocument;
    if (doc.getElementById('ppt-viewer-styles')) return;

    const style = doc.createElement('style');
    style.id = 'ppt-viewer-styles';
    style.textContent = `
      body { overflow: hidden !important; margin: 0; padding: 0; height: 100vh; width: 100vw; }
      .slide-content { overflow: hidden !important; }
      ::-webkit-scrollbar { display: none !important; }
      * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
    `;
    requestAnimationFrame(() => {
      doc.head?.appendChild(style);
    });
  }, []);

  // 发送视口尺寸
  const sendViewportSizeToIframe = useCallback((iframeElement: HTMLIFrameElement | null) => {
    if (iframeElement?.contentWindow) {
      const message = {
        type: "resize",
        width: window.innerWidth,
        height: window.innerHeight,
      };
      iframeElement.contentWindow.postMessage(message, "*");
    }
  }, []);

  // 触发PPT内部动画
  const triggerPptAnimation = useCallback((iframeElement: HTMLIFrameElement | null) => {
    setTimeout(() => {
      if (iframeElement?.contentWindow) {
        console.log(`Triggering PPT animation for frame:`, iframeElement);
        iframeElement.contentWindow.postMessage({ type: 'ppt-animation-start' }, '*');
      }
    }, 100); // Short delay
  }, []);

  // 处理 iframe 加载完成
  const handleIframeLoad = useCallback((frameId: 'A' | 'B') => {
    console.log(`Frame ${frameId} loaded`);
    const frameSetter = frameId === 'A' ? setFrameA : setFrameB;
    const frameRef = frameId === 'A' ? iframeRefA : iframeRefB;

    frameSetter(prev => {
      if (!prev.src || !frameRef.current) {
        console.warn(`Frame ${frameId} ref not ready or no src.`);
        return { ...prev, isLoaded: false };
      }

      // 标记已加载
      slideCache.current.set(prev.src, true);

      try {
        // Pass the actual element after checking it exists
        applyIframeStyles(frameRef.current);
        sendViewportSizeToIframe(frameRef.current);
        const rescaleTimes = [50, 150, 300];
        rescaleTimes.forEach(delay => {
          setTimeout(() => forceRescale(frameRef.current), delay);
        });
      } catch (e) {
        console.error(`Could not modify Frame ${frameId} content:`, e);
      }

      // Only trigger PPT animation if this frame is active and we are not transitioning
      if (!transitioning && prev.isActive) {
        triggerPptAnimation(frameRef.current);
      }

      return { ...prev, isLoaded: true };
    });
  }, [transitioning, applyIframeStyles, sendViewportSizeToIframe, forceRescale, triggerPptAnimation]);


  // 核心切换逻辑
  useEffect(() => {
    const targetSlide = slides[currentSlideIndex];
    if (!targetSlide) return; // No slides to display

    // Determine which frame is currently active and which is inactive
    const activeFrame = frameA.isActive ? frameA : frameB;
    const inactiveFrame = frameA.isActive ? frameB : frameA;
    const activeFrameSetter = frameA.isActive ? setFrameA : setFrameB;
    const inactiveFrameSetter = frameA.isActive ? setFrameB : setFrameA;
    const inactiveFrameId = frameA.isActive ? 'B' : 'A';

    // Skip if target slide is already in the active frame
    if (activeFrame.src === targetSlide.path) {
        console.log("Target slide already active, skipping transition.");
        prevSlideIndexRef.current = currentSlideIndex; // Update previous index nonetheless
        return;
    }

    // Determine direction based on previous index
    const direction: 'next' | 'prev' = currentSlideIndex > prevSlideIndexRef.current ? 'next' : 'prev';
    setTransitionDirection(direction);

    // Check if the target slide is already loaded in the inactive frame
     if (inactiveFrame.src !== targetSlide.path) {
        console.log(`Loading target slide ${currentSlideIndex + 1} into inactive frame ${inactiveFrameId}.`);
        // Load the target slide into the inactive frame
        inactiveFrameSetter(prev => ({
            ...prev,
            key: `frame-${inactiveFrameId}-${targetSlide.id}-${Date.now()}`, // Add timestamp for uniqueness
            src: targetSlide.path,
            title: targetSlide.title || `Frame ${inactiveFrameId}`,
            isLoaded: slideCache.current.has(targetSlide.path), // Use cache
            slideIndex: currentSlideIndex,
            isActive: false,
            className: '',
            style: { opacity: 0 }, // Initially hidden
        }));
     } else {
         console.log("Target slide already in inactive frame, initiating transition.");
         // Ensure the slideIndex is correct even if reusing the frame
         if (inactiveFrame.slideIndex !== currentSlideIndex) {
             inactiveFrameSetter(prev => ({ ...prev, slideIndex: currentSlideIndex }));
         }
     }

    // Start the transition
    setTransitioning(true);
    const newTransitionType = selectRandomTransition();
    setTransitionType(newTransitionType);

    // Apply transition classes after a frame
    requestAnimationFrame(() => {
      // Ensure the state update for src loading has rendered before applying classes
      requestAnimationFrame(() => {
          const { enterClass, exitClass, initialEnterClass } = getTransitionClasses(newTransitionType, direction);

          // Set initial state for entering frame (before animation starts)
          inactiveFrameSetter(prev => ({
              ...prev,
              className: `${initialEnterClass}`,
              style: { ...prev.style, opacity: 1 } // Make it opaque for transition
          }));

          // Apply target state classes in the next frame to trigger transition
          requestAnimationFrame(() => {
              // Active frame transitions out
              activeFrameSetter(prev => ({
                  ...prev,
                  className: `${exitClass} transition-all ease-in-out gpu-accelerated`,
                  style: { transitionDuration: `${transitionDuration}ms`, zIndex: 10 }
              }));
              // Inactive frame transitions in
              inactiveFrameSetter(prev => ({
                  ...prev,
                  className: `${enterClass} transition-all ease-in-out gpu-accelerated`,
                  style: { transitionDuration: `${transitionDuration}ms`, zIndex: 20, opacity: 1 }
              }));
          });
      });
    });

    // After the transition duration
    const timer = setTimeout(() => {
      const newActiveFrame = inactiveFrame; // The one that just transitioned in
      const newActiveFrameRef = inactiveFrame.ref;
      const oldActiveFrameSetter = activeFrameSetter;
      const oldActiveFrameId = activeFrame.ref === iframeRefA ? 'A' : 'B';

      // Reset old active frame state
      oldActiveFrameSetter(prev => ({
        ...prev,
        isActive: false,
        isLoaded: false, // Mark as unloaded as it's going to background
        className: '',
        style: { opacity: 0, zIndex: 0 }, // Hide and move to back
        src: null, // Clear src to free resources if needed, or keep for faster prev navigation
        slideIndex: -1,
      }));

      // Finalize new active frame state
      inactiveFrameSetter(prev => ({ ...prev, isActive: true, className: '', style: {}}));

      setTransitioning(false);
      prevSlideIndexRef.current = currentSlideIndex; // Update previous index ref

      // Trigger PPT animation for the newly active frame if it's loaded
      if (newActiveFrame.isLoaded) {
          triggerPptAnimation(newActiveFrameRef.current);
      } else {
          console.log("New active frame not loaded yet, PPT animation will trigger on load.");
      }

      // Preload logic can be added here if needed (e.g., load index+1 into the now inactive frame)
      // Example: Preload next slide into the now inactive frame (old active one)
      const nextIndexToPreload = (currentSlideIndex + 1) % slides.length;
      const nextSlideToPreload = slides[nextIndexToPreload];
      if (nextIndexToPreload !== currentSlideIndex && nextSlideToPreload) { // Ensure it's a different slide
         console.log(`Preloading slide ${nextIndexToPreload + 1} into inactive frame ${oldActiveFrameId}`);
          oldActiveFrameSetter(prev => ({
            ...prev,
            key: `frame-${oldActiveFrameId}-${nextSlideToPreload.id}-${Date.now()}`,
            src: nextSlideToPreload.path,
            title: nextSlideToPreload.title || `Frame ${oldActiveFrameId}`,
            isLoaded: slideCache.current.has(nextSlideToPreload.path),
            slideIndex: nextIndexToPreload,
            isActive: false,
            className: '',
            style: { opacity: 0, zIndex: 0 } // Keep preloaded frame hidden
          }));
      }

    }, transitionDuration);

    return () => clearTimeout(timer);

  }, [currentSlideIndex, slides, frameA.isActive, selectRandomTransition, triggerPptAnimation]); // Dependencies

  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (iframeRefA.current) sendViewportSizeToIframe(iframeRefA.current);
      if (iframeRefB.current) sendViewportSizeToIframe(iframeRefB.current);
       setTimeout(() => {
         if (iframeRefA.current) forceRescale(iframeRefA.current);
         if (iframeRefB.current) forceRescale(iframeRefB.current);
       }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [sendViewportSizeToIframe, forceRescale]); // Use the memoized helpers


  // Get transition CSS classes (Revised)
  const getTransitionClasses = (type: TransitionType, direction: 'next' | 'prev'): { enterClass: string, exitClass: string, initialEnterClass: string } => {
      const isNext = direction === 'next';
      // Target state for the element entering
      const enterClass = 'opacity-100 transform translate-x-0 translate-y-0 scale-100 rotate-0 rotateY-0';
      // Target state for the element exiting
      let exitClass = '';
      // Initial state for the element entering (starts from here)
      let initialEnterClass = '';

      switch (type) {
          case 'slide-horizontal':
              exitClass = isNext ? '-translate-x-full opacity-100' : 'translate-x-full opacity-100';
              initialEnterClass = isNext ? 'translate-x-full' : '-translate-x-full';
              break;
          case 'slide-vertical':
              exitClass = isNext ? '-translate-y-full opacity-100' : 'translate-y-full opacity-100';
              initialEnterClass = isNext ? 'translate-y-full' : '-translate-y-full';
              break;
          case 'fade':
              exitClass = 'opacity-0';
              initialEnterClass = 'opacity-0';
              break;
          case 'zoom':
              exitClass = isNext ? 'scale-50 opacity-0' : 'scale-150 opacity-0';
              initialEnterClass = isNext ? 'scale-150 opacity-0' : 'scale-50 opacity-0';
              break;
          case 'rotate':
               exitClass = isNext ? '-rotate-90 scale-75 opacity-0' : 'rotate-90 scale-75 opacity-0';
               initialEnterClass = isNext ? 'rotate-90 scale-75 opacity-0' : '-rotate-90 scale-75 opacity-0';
              break;
           case 'flip':
               exitClass = isNext ? '-rotateY-90 opacity-0' : 'rotateY-90 opacity-0';
               initialEnterClass = isNext ? 'rotateY-90 opacity-0' : '-rotateY-90 opacity-0';
              break;
          case 'cube':
              // For cube, the exiting element needs different transforms based on direction
              exitClass = isNext ? 'translate-x-full rotate-y-90 opacity-100' : '-translate-x-full -rotate-y-90 opacity-100';
              initialEnterClass = isNext ? '-translate-x-full rotate-y-90' : 'translate-x-full -rotate-y-90'; // Starts rotated from the opposite side
              break;
          default:
              exitClass = 'opacity-0';
              initialEnterClass = 'opacity-0';
      }

      return { enterClass: `transform ${enterClass}`, exitClass: `transform ${exitClass}`, initialEnterClass: `transform ${initialEnterClass}` };
  };

  // Navigation handlers
  const goToPrevSlide = () => {
    if (currentSlideIndex > 0 && !transitioning) {
      onSlideChange(currentSlideIndex - 1);
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1 && !transitioning) {
      onSlideChange(currentSlideIndex + 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (transitioning) return;
      if (e.key === 'ArrowRight' || e.key === ' ') goToNextSlide();
      else if (e.key === 'ArrowLeft') goToPrevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, transitioning]); // Keep dependencies simple


  // --- Render ---

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">请添加幻灯片开始演示</p>
      </div>
    );
  }

  return (
    <div className={cn(
        "slide-container w-full h-full flex items-center justify-center relative bg-black overflow-hidden perspective-1000",
        transitioning && transitionType === 'cube' ? 'transform-style-3d' : ''
    )}>
        {/* Frame A */}
        <div
            className={cn(
                "absolute inset-0",
                transitioning ? frameA.className : (frameA.isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'),
                "gpu-accelerated"
            )}
            style={{
                ...frameA.style,
                 transitionProperty: transitioning ? 'transform, opacity' : 'none',
                 transitionDuration: transitioning ? `${transitionDuration}ms` : '0ms',
                 zIndex: frameA.isActive ? 20 : (transitioning ? frameA.style?.zIndex ?? 10 : 0),
            }}
        >
            {frameA.src && (
                <iframe
                    key={frameA.key} // Key based on frame ID and slide ID
                    ref={iframeRefA}
                    src={frameA.src}
                    className="slide-frame w-full h-full border-none bg-white"
                    title={frameA.title}
                    onLoad={() => handleIframeLoad('A')}
                    allow="fullscreen"
                    sandbox="allow-same-origin allow-scripts"
                    scrolling="no"
                />
            )}
        </div>

        {/* Frame B */}
        <div
             className={cn(
                "absolute inset-0",
                transitioning ? frameB.className : (frameB.isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'),
                "gpu-accelerated"
            )}
            style={{
                ...frameB.style,
                 transitionProperty: transitioning ? 'transform, opacity' : 'none',
                 transitionDuration: transitioning ? `${transitionDuration}ms` : '0ms',
                 zIndex: frameB.isActive ? 20 : (transitioning ? frameB.style?.zIndex ?? 10 : 0),
            }}
        >
             {frameB.src && (
                <iframe
                    key={frameB.key}
                    ref={iframeRefB}
                    src={frameB.src}
                    className="slide-frame w-full h-full border-none bg-white"
                    title={frameB.title}
                    onLoad={() => handleIframeLoad('B')}
                    allow="fullscreen"
                    sandbox="allow-same-origin allow-scripts"
                    scrolling="no"
                />
            )}
        </div>

        {/* Click overlay */}
         <div
            className="absolute inset-0 z-30"
            onClick={(e) => {
                 if (!transitioning) goToNextSlide();
            }}
            style={{ cursor: transitioning ? 'default' : 'pointer' }}
        />

        {/* Navigation Buttons (z-index 50) */}
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 opacity-70 hover:opacity-100 transition-opacity">
            <Button
                variant="default" size="icon"
                className={cn("h-10 w-10 rounded-full shadow-lg bg-black/50 text-white hover:bg-black/70",
                    currentSlideIndex === 0 || transitioning ? "opacity-50 cursor-not-allowed" : "")}
                onClick={goToPrevSlide}
                disabled={currentSlideIndex === 0 || transitioning}
            >
                <ChevronLeft className="h-5 w-5" /><span className="sr-only">上一页</span>
            </Button>
        </div>
        <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 opacity-70 hover:opacity-100 transition-opacity">
            <Button
                variant="default" size="icon"
                 className={cn("h-10 w-10 rounded-full shadow-lg bg-black/50 text-white hover:bg-black/70",
                     currentSlideIndex === slides.length - 1 || transitioning ? "opacity-50 cursor-not-allowed" : "")}
                onClick={goToNextSlide}
                disabled={currentSlideIndex === slides.length - 1 || transitioning}
            >
                <ChevronRight className="h-5 w-5" /><span className="sr-only">下一页</span>
            </Button>
        </div>

        {/* Slide Counter (z-index 50)*/}
        <div className="fixed bottom-4 right-4 z-50 text-sm text-white bg-black/50 px-3 py-1 rounded-full">
            {currentSlideIndex + 1} / {slides.length}
        </div>
    </div>
  );
}

