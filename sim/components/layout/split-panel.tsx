'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SplitPanelProps {
  leftPanel: ReactNode
  rightPanel: ReactNode
  defaultRatio?: number // 0-1, representing the ratio of the left panel
  minLeftWidth?: number
  minRightWidth?: number
  className?: string
  resizeClassName?: string
  persistKey?: string // Key for localStorage persistence
}

export function SplitPanel({
  leftPanel,
  rightPanel,
  defaultRatio = 0.7,
  minLeftWidth = 300,
  minRightWidth = 300,
  className = '',
  resizeClassName = '',
  persistKey
}: SplitPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftRatio, setLeftRatio] = useState(
    persistKey 
      ? parseFloat(localStorage.getItem(persistKey) || defaultRatio.toString())
      : defaultRatio
  )
  const [isResizing, setIsResizing] = useState(false)
  const [isRightCollapsed, setIsRightCollapsed] = useState(false)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)
  
  // Last non-collapsed ratio - used when uncollapsing
  const lastRatioRef = useRef(leftRatio)
  
  // Store initial mouse position and panel size during resizing
  const resizeState = useRef({
    startX: 0,
    startWidth: 0,
    startRatio: 0
  })
  
  // Save the ratio to localStorage if persistKey is provided
  useEffect(() => {
    if (persistKey && !isLeftCollapsed && !isRightCollapsed) {
      localStorage.setItem(persistKey, leftRatio.toString())
    }
  }, [leftRatio, persistKey, isLeftCollapsed, isRightCollapsed])
  
  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    updateWidth()
    
    const observer = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    window.addEventListener('resize', updateWidth)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [])
  
  // Handle mouse down on the resize handle
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    
    setIsResizing(true)
    
    // Store the starting position
    resizeState.current = {
      startX: e.clientX,
      startWidth: containerRef.current?.offsetWidth || 0,
      startRatio: leftRatio
    }
    
    // Add event listeners
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }
  
  // Handle mouse move during resize
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return
    
    const deltaX = e.clientX - resizeState.current.startX
    const containerWidth = resizeState.current.startWidth
    
    let newLeftWidth = (resizeState.current.startRatio * containerWidth) + deltaX
    
    // Enforce minimum widths
    if (newLeftWidth < minLeftWidth) {
      newLeftWidth = minLeftWidth
    } else if (newLeftWidth > containerWidth - minRightWidth) {
      newLeftWidth = containerWidth - minRightWidth
    }
    
    const newRatio = newLeftWidth / containerWidth
    setLeftRatio(newRatio)
    
    if (!isLeftCollapsed && !isRightCollapsed) {
      lastRatioRef.current = newRatio
    }
  }
  
  // Handle mouse up after resize
  const handleResizeEnd = () => {
    setIsResizing(false)
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
  }
  
  // Handle collapsing the right panel
  const toggleRightPanel = () => {
    if (!isRightCollapsed) {
      // Collapse right panel
      lastRatioRef.current = leftRatio
      setLeftRatio(1)
      setIsRightCollapsed(true)
    } else {
      // Uncollapse right panel
      setLeftRatio(lastRatioRef.current)
      setIsRightCollapsed(false)
    }
  }
  
  // Handle collapsing the left panel
  const toggleLeftPanel = () => {
    if (!isLeftCollapsed) {
      // Collapse left panel
      lastRatioRef.current = leftRatio
      setLeftRatio(0)
      setIsLeftCollapsed(true)
    } else {
      // Uncollapse left panel
      setLeftRatio(lastRatioRef.current)
      setIsLeftCollapsed(false)
    }
  }
  
  // Calculate actual panel widths
  const leftWidth = `${leftRatio * 100}%`
  const rightWidth = `${(1 - leftRatio) * 100}%`
  
  return (
    <div 
      ref={containerRef}
      className={cn("flex flex-row h-full w-full relative", className)}
      style={{ cursor: isResizing ? 'col-resize' : 'default' }}
    >
      {/* Left panel */}
      <div 
        className="h-full overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: leftWidth }}
      >
        {leftPanel}
      </div>
      
      {/* Resize handle */}
      <div 
        className={cn(
          "w-1 h-full bg-border hover:bg-primary/40 cursor-col-resize flex flex-col items-center justify-center group relative",
          { "bg-primary/80": isResizing },
          resizeClassName
        )}
        onMouseDown={handleResizeStart}
      >
        {/* Collapse toggle buttons */}
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={toggleLeftPanel}
            className="absolute top-1/2 -left-6 transform -translate-y-1/2 p-1 rounded-full bg-muted hover:bg-muted-foreground/20"
            title={isLeftCollapsed ? "Expand left panel" : "Collapse left panel"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <button 
            onClick={toggleRightPanel}
            className="absolute top-1/2 -right-6 transform -translate-y-1/2 p-1 rounded-full bg-muted hover:bg-muted-foreground/20"
            title={isRightCollapsed ? "Expand right panel" : "Collapse right panel"}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Right panel */}
      <div 
        className="h-full overflow-hidden transition-[width] duration-300 ease-in-out"
        style={{ width: rightWidth }}
      >
        {rightPanel}
      </div>
    </div>
  )
} 