/**
 * PPT Slide Scaler
 * 
 * Ensures slides scale properly and animations run smoothly
 */

(function() {
  // Configuration
  const config = {
    debug: false,
    scaleFactor: 0.95,
    initialScaleDelay: 50,   // 初始缩放延迟
    maxScaleAttempts: 5,     // 最大尝试次数
    retryInterval: 150,      // 重试间隔
    minContentWidth: 10,     // 最小内容宽度（用于检测是否加载）
    minContentHeight: 10,    // 最小内容高度（用于检测是否加载）
    animationStaggerDelay: 100, // 动画错开延迟
    useRaf: true,            // 使用requestAnimationFrame
  };

  // State management
  const state = {
    isScaling: false,
    scaleAttempts: 0,
    targetWidth: 0,
    targetHeight: 0,
    observer: null,
    visibilityObserver: null,
    resizeTimeout: null,
    readyForScaling: false,
  };

  // Handle messages from parent window
  window.addEventListener('message', function(event) {
    const message = event.data;
    
    if (message.type === 'resize') {
      handleResize(message.width, message.height);
    } else if (message.type === 'transition-start') {
      // 转场开始，什么都不做
    } else if (message.type === 'transition-end') {
      // 转场结束，强制重新缩放
      forceRescale();
    } else if (message.type === 'force-scale') {
      // 强制重新缩放
      forceRescale();
    } else if (message.type === 'ppt-animation-start') {
      // PPT内部动画开始
      startPptAnimations();
    }
  });

  // Handle window resize events
  window.addEventListener('resize', function() {
    if (state.resizeTimeout) clearTimeout(state.resizeTimeout);
    
    state.resizeTimeout = setTimeout(function() {
      scaleContent();
    }, 50); // 添加一个短暂延迟，避免频繁调整
  });

  // Force rescale (used for initialization problems)
  function forceRescale() {
    state.scaleAttempts = 0;
    attemptRescale();
  }

  // 使用RAF优化执行时序
  function rafCallback(callback) {
    if (config.useRaf) {
      return requestAnimationFrame(() => {
        requestAnimationFrame(callback); // 双重RAF确保更平滑
      });
    } else {
      return setTimeout(callback, 16); // 约60fps
    }
  }

  // Scale content to fit viewport
  function scaleContent() {
    if (!state.readyForScaling) {
      log('尚未准备好缩放');
      return;
    }
    
    if (state.isScaling) {
      log('正在进行缩放，忽略本次请求');
      return;
    }
    
    state.isScaling = true;
    
    rafCallback(() => {
      try {
        const content = document.querySelector('.slide-content');
        
        if (!content) {
          log('未找到内容元素，无法缩放');
          state.isScaling = false;
          return;
        }
        
        // 获取内容原始尺寸
        const contentWidth = content.offsetWidth;
        const contentHeight = content.offsetHeight;
        
        // 检查内容尺寸是否合理
        if (contentWidth < config.minContentWidth || contentHeight < config.minContentHeight) {
          log('内容尺寸不合理，稍后重试', contentWidth, contentHeight);
          state.isScaling = false;
          return;
        }

        // 获取视口尺寸
        const viewportWidth = state.targetWidth || window.innerWidth;
        const viewportHeight = state.targetHeight || window.innerHeight;
        
        if (!viewportWidth || !viewportHeight) {
          log('视口尺寸无效');
          state.isScaling = false;
          return;
        }
        
        // 计算缩放比例
        const xScale = viewportWidth / contentWidth;
        const yScale = viewportHeight / contentHeight;
        let scale = Math.min(xScale, yScale) * config.scaleFactor;
        
        // 应用缩放
        log(`应用缩放: ${scale.toFixed(3)}`);
        
        // 应用性能优化属性
        content.style.transformOrigin = 'center center';
        content.style.willChange = 'transform';
        
        // 重要：先将元素居中，再应用缩放，避免视觉跳跃
        content.style.position = 'absolute';
        content.style.top = '50%';
        content.style.left = '50%';
        
        // 强制重新计算样式，确保位置应用
        content.offsetHeight;
        
        // 然后应用缩放
        content.style.transform = `translate3d(-50%, -50%, 0) scale3d(${scale}, ${scale}, 1)`;
        
        // 确保清晰的文本渲染
        content.style.backfaceVisibility = 'hidden';
        content.style.webkitFontSmoothing = 'antialiased';
        content.style.perspective = '1000px';
        
        // 强制绘制更新
        forceReflow(content);
        
        // 清理性能优化属性
        rafCallback(() => {
          content.style.willChange = 'auto';
        });
      } catch (err) {
        log('缩放过程中发生错误', err);
      } finally {
        state.isScaling = false;
      }
    });
  }

  // Handle resize message from parent
  function handleResize(width, height) {
    if (!width || !height || width < 10 || height < 10) {
      log('无效的尺寸', width, height);
      return;
    }
    
    log('处理尺寸变化', width, height);
    state.targetWidth = width;
    state.targetHeight = height;
    
    clearTimeout(state.resizeTimeout);
    state.resizeTimeout = setTimeout(() => {
      scaleContent();
    }, 50); // 添加一个短暂延迟，避免频繁调整
  }

  // Prepare for slide transition
  function prepareForTransition() {
    // Add hardware acceleration to all elements with animations
    enhancePerformance();
    
    // Pause animations temporarily
    document.querySelectorAll('*').forEach(function(el) {
      if (el.style.animationPlayState) {
        el.dataset.animationPlayState = el.style.animationPlayState;
        el.style.animationPlayState = 'paused';
      }
    });
  }

  // Clean up after transition
  function cleanupAfterTransition() {
    // Resume animations
    document.querySelectorAll('*').forEach(function(el) {
      if (el.dataset.animationPlayState) {
        el.style.animationPlayState = el.dataset.animationPlayState;
        delete el.dataset.animationPlayState;
      }
    });
    
    // Rescale if needed
    setTimeout(function() {
      scaleContent(true);
    }, 50);
  }

  // Enhance performance during transitions
  function enhancePerformance() {
    document.querySelectorAll('img, video, canvas, svg').forEach(function(el) {
      // Use hardware acceleration for media elements
      el.style.willChange = 'transform';
      
      // Apply compositing optimizations
      el.style.backfaceVisibility = 'hidden';
      el.style.perspective = '1000px';
      
      // Mark for cleanup later
      el.dataset.optimized = 'true';
    });
  }

  // Optimize animations
  function optimizeAnimations() {
    document.querySelectorAll('*').forEach(function(el) {
      const computedStyle = window.getComputedStyle(el);
      
      // Check for any kind of animation or transition
      const hasAnimation = 
        computedStyle.animationName !== 'none' ||
        computedStyle.transition !== 'all 0s ease 0s';
      
      if (hasAnimation) {
        // Use hardware acceleration for elements with animations
        el.style.willChange = 'transform, opacity';
        
        // Apply additional optimizations
        el.style.backfaceVisibility = 'hidden';
        
        // Store original transform for possible restoration
        if (!el.dataset.originalTransform && el.style.transform) {
          el.dataset.originalTransform = el.style.transform;
        }
      }
    });
  }

  // Cleanup optimizations when they're no longer needed
  function cleanupOptimizations() {
    document.querySelectorAll('[data-optimized="true"]').forEach(function(el) {
      // Remove optimization properties
      el.style.willChange = 'auto';
      el.style.backfaceVisibility = '';
      
      // Remove tracking attribute
      delete el.dataset.optimized;
    });
  }

  // Apply base styles to the document
  function applyBaseStyles() {
    const style = document.createElement('style');
    style.id = 'ppt-base-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      body {
        opacity: 0;
        animation: fadeIn 0.5s ease-out forwards;
        animation-delay: 0.1s;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      * {
        transform-style: preserve-3d;
        backface-visibility: hidden;
      }
      
      .slide-content {
        position: relative !important;
        max-width: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        transform: translate3d(0,0,0);
        transform-origin: center center;
        will-change: transform;
      }
      
      /* 优化动画性能 */
      .animated, [data-animation], .animate, [data-animate], 
      .anim-slide, .anim-par, .anim-seq, [data-anim] {
        will-change: transform, opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      /* 防止动画闪烁 */
      @supports (transform: translate3d(0,0,0)) {
        body, .slide-content, .animated, [data-animation], 
        .anim-slide, .anim-par, .anim-seq {
          transform: translate3d(0,0,0);
        }
      }
      
      /* 平滑动画过渡 */
      .animate-active {
        transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
      }
    `;
    
    // Only add if not already present
    if (!document.getElementById('ppt-base-styles')) {
      document.head.appendChild(style);
    }
  }

  // Initial setup sequence with retries
  function initializeScaling(attempt = 0) {
    // Apply basic styles first
    applyBaseStyles();
    
    // Check if document/content is ready for scaling
    const contentEl = document.querySelector('.slide-content') || document.body;
    
    if (!contentEl || contentEl.scrollWidth <= 0 || contentEl.scrollHeight <= 0) {
      // Content not ready yet, retry if under max attempts
      if (attempt < config.maxScaleAttempts) {
        setTimeout(() => initializeScaling(attempt + 1), config.retryInterval);
      }
      return;
    }
    
    // Content is ready, apply scaling
    scaleContent(true);
  }

  // Initial scaling
  document.addEventListener('DOMContentLoaded', function() {
    // Start initialization sequence
    setTimeout(() => {
      initializeScaling();
    }, config.initialScaleDelay);
  });

  // Run scale when images and assets finish loading
  window.addEventListener('load', function() {
    // Force a rescale when everything is loaded
    setTimeout(() => {
      scaleContent(true);
    }, 200);
    
    // Periodically clean up optimizations to save memory
    setInterval(cleanupOptimizations, 10000);
  });
  
  // Also handle visibility changes (when tab becomes active again)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      setTimeout(() => {
        scaleContent(true);
      }, 200);
    }
  });

  // 尝试重新缩放
  function attemptRescale() {
    if (state.scaleAttempts < config.maxScaleAttempts) {
      state.scaleAttempts++;
      log(`尝试重新缩放 ${state.scaleAttempts}/${config.maxScaleAttempts}`);
      
      // 立即进行一次缩放
      scaleContent();
      
      // 安排下一次尝试
      setTimeout(() => {
        scaleContent();
        
        // 检查是否需要继续尝试
        if (state.scaleAttempts < config.maxScaleAttempts) {
          setTimeout(attemptRescale, config.retryInterval);
        }
      }, config.initialScaleDelay);
    }
  }

  // 强制重新计算样式和绘制
  function forceReflow(element) {
    if (!element) return;
    
    // 读取属性触发重排
    void element.offsetHeight;
    
    // 在下一帧再次检查和调整（解决某些浏览器中的渲染异常）
    requestAnimationFrame(() => {
      if (element && element.style) {
        // 确保变换已应用
        const currentTransform = element.style.transform;
        if (currentTransform) {
          element.style.transform = currentTransform + ' translateZ(0)';
          requestAnimationFrame(() => {
            if (element && element.style) {
              element.style.transform = currentTransform;
            }
          });
        }
      }
    });
  }

  // 设置可见性变化监听
  function setupVisibilityObserver() {
    // 监听文档可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        log('文档变为可见，重新缩放');
        setTimeout(forceRescale, 100);
      }
    });
    
    // 如果支持 Intersection Observer，设置可见性检测
    if (typeof IntersectionObserver !== 'undefined') {
      const content = document.querySelector('.slide-content');
      if (content && !state.visibilityObserver) {
        state.visibilityObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                log('内容变为可见，重新缩放');
                setTimeout(forceRescale, 100);
              }
            });
          },
          { threshold: 0.1 }
        );
        
        state.visibilityObserver.observe(content);
      }
    }
  }

  // 启动PPT内部动画
  function startPptAnimations() {
    log('启动PPT内部动画');
    
    try {
      // 优化动画性能
      document.body.style.willChange = 'transform';
      document.body.style.backfaceVisibility = 'hidden';
      
      rafCallback(() => {
        // 确保所有动画元素可见并启用
        document.querySelectorAll('[data-animation], .animated, .animate, [data-animate]').forEach((el, index) => {
          // 使用RAF和错开时间，确保动画更平滑
          setTimeout(() => {
            rafCallback(() => {
              if (el.style.visibility === 'hidden') {
                el.style.visibility = 'visible';
              }
              
              if (el.style.display === 'none') {
                el.style.display = 'block';
              }
              
              // 添加硬件加速
              el.style.willChange = 'transform, opacity';
              el.style.transform = el.style.transform || 'translate3d(0,0,0)';
              el.style.backfaceVisibility = 'hidden';
              
              // 恢复动画的播放状态
              if (el.style.animationPlayState === 'paused') {
                el.style.animationPlayState = 'running';
              }
            });
          }, index * 20); // 每个元素间隔细微错开，降低渲染峰值
        });
        
        // 查找并启动PowerPoint特有的动画
        const pptAnimations = document.querySelectorAll('.anim-slide, .anim-par, .anim-seq');
        if (pptAnimations.length > 0) {
          log(`找到${pptAnimations.length}个PPT动画元素`);
          
          // 为PowerPoint动画添加激活类
          pptAnimations.forEach((el, index) => {
            // 延迟激活每个动画以创建序列效果
            setTimeout(() => {
              rafCallback(() => {
                // 添加硬件加速
                el.style.willChange = 'transform, opacity';
                el.style.backfaceVisibility = 'hidden';
                el.style.transform = el.style.transform || 'translate3d(0,0,0)';
                
                el.classList.add('animate-active');
                
                // 查找子动画元素并激活
                el.querySelectorAll(':scope > [data-anim]').forEach((childEl, childIndex) => {
                  setTimeout(() => {
                    childEl.style.willChange = 'transform, opacity';
                    childEl.classList.add('animate-active');
                  }, childIndex * 50); // 子动画错开显示
                });
              });
            }, index * config.animationStaggerDelay); // 主动画错开显示
          });
        }
        
        // 触发自定义动画事件，方便PowerPoint内部JavaScript使用
        const animEvent = new CustomEvent('ppt-animation-triggered');
        document.dispatchEvent(animEvent);
        
        // 运行可能存在的PowerPoint动画函数
        if (typeof window.startAnimations === 'function') {
          window.startAnimations();
        }
        
        // 播放可能存在的媒体元素
        document.querySelectorAll('video, audio').forEach(media => {
          if (media.paused && !media.ended && media.currentTime === 0) {
            media.style.willChange = 'transform';
            
            const playPromise = media.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                // 忽略自动播放限制错误
                log('媒体自动播放受限', error);
              });
            }
          }
        });
        
        // 定时清理willChange属性以释放资源
        setTimeout(() => {
          document.querySelectorAll('[style*="will-change"]').forEach(el => {
            el.style.willChange = 'auto';
          });
        }, 5000); // 动画完成后清理
      });
    } catch (err) {
      console.error('启动PPT动画时发生错误', err);
    }
  }
})();


