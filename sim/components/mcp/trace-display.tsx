'use client'

import { useEffect, useState } from 'react'
import { Clock, Image as ImageIcon, LoaderCircle, Zap } from 'lucide-react'
import { MCPClient, TraceSpan } from '@/lib/services/mcp-client'
import { cn } from '@/lib/utils'

export function MCPTraceDisplay() {
  const [traceSpans, setTraceSpans] = useState<TraceSpan[]>([])
  const [expanded, setExpanded] = useState(false)
  const [hasActiveSpans, setHasActiveSpans] = useState(false)

  useEffect(() => {
    const mcpClient = MCPClient.getInstance()
    
    // Initial set
    setTraceSpans(mcpClient.getTraceSpans())
    
    // Subscribe to updates
    const unsubscribe = mcpClient.addListener((spans) => {
      setTraceSpans([...spans])
      
      // Check if there are any pending spans
      const hasActive = spans.some(span => span.status === 'pending')
      setHasActiveSpans(hasActive)
      
      // Auto-expand when we have active spans
      if (hasActive && !expanded) {
        setExpanded(true)
      }
    })
    
    return unsubscribe
  }, [expanded])
  
  // No display if no spans
  if (traceSpans.length === 0) {
    return null
  }
  
  const handleClearTraces = () => {
    MCPClient.getInstance().clearTraceSpans()
  }
  
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Collapsed view */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={cn(
            "flex items-center rounded-full px-4 py-2 shadow-md text-white",
            hasActiveSpans 
              ? "bg-primary animate-pulse" 
              : "bg-muted-foreground/80 hover:bg-muted-foreground"
          )}
        >
          <Zap className="mr-2 h-4 w-4" />
          <span>MCP Activity</span>
          {hasActiveSpans && (
            <LoaderCircle className="ml-2 h-3 w-3 animate-spin" />
          )}
        </button>
      )}
      
      {/* Expanded view */}
      {expanded && (
        <div className="bg-popover rounded-lg border shadow-lg w-96 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <h3 className="font-medium flex items-center">
              <Zap className="mr-2 h-4 w-4 text-primary" />
              MCP Trace Spans
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleClearTraces}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Minimize
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1">
            {traceSpans.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No MCP activity to display
              </div>
            ) : (
              <div className="divide-y">
                {traceSpans.map(span => (
                  <TraceSpanItem key={span.id} span={span} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TraceSpanItem({ span }: { span: TraceSpan }) {
  const [expanded, setExpanded] = useState(false)
  const hasResult = span.result && Object.keys(span.result).length > 0
  const hasError = span.error && Object.keys(span.error).length > 0
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'error': return 'text-red-500'
      case 'pending': return 'text-amber-500'
      default: return 'text-muted-foreground'
    }
  }
  
  const formatTimeSince = (isoTime: string) => {
    const now = new Date()
    const time = new Date(isoTime)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    return `${Math.floor(diffInSeconds / 3600)}h ago`
  }
  
  const getSpanIcon = () => {
    if (span.name.toLowerCase().includes('image')) {
      return <ImageIcon className="h-4 w-4 mr-2" />
    }
    return <Zap className="h-4 w-4 mr-2" />
  }
  
  return (
    <div className="p-3">
      <div 
        className={cn(
          "flex items-center justify-between cursor-pointer",
          (hasResult || hasError) && "mb-2"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          {getSpanIcon()}
          <span className="font-medium text-sm">{span.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs", getStatusColor(span.status))}>
            {span.status}
          </span>
          <span className="text-xs flex items-center text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            {span.status === 'pending' ? 'In progress' : `${span.duration}ms`}
          </span>
        </div>
      </div>
      
      {/* Status-specific content */}
      {span.status === 'pending' && (
        <div className="flex items-center justify-center py-2">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Result preview for image generation */}
      {span.status === 'success' && span.name.toLowerCase().includes('image') && span.result?.images && (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            {span.result.images.slice(0, 4).map((img: any, idx: number) => (
              <div key={idx} className="aspect-square relative overflow-hidden rounded-md border">
                <img 
                  src={img.base64} 
                  alt={`Generated image ${idx + 1}`}
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatTimeSince(span.endTime)}
          </div>
        </div>
      )}
      
      {/* Error display */}
      {span.status === 'error' && hasError && (
        <div className="text-xs text-red-500 mt-1 p-2 bg-red-50 rounded-md dark:bg-red-950/20">
          {span.error.message}
        </div>
      )}
      
      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 text-xs border-t pt-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="text-muted-foreground">Start:</div>
            <div>{new Date(span.startTime).toLocaleTimeString()}</div>
            
            <div className="text-muted-foreground">End:</div>
            <div>{span.status === 'pending' ? 'In progress' : new Date(span.endTime).toLocaleTimeString()}</div>
            
            <div className="text-muted-foreground">Duration:</div>
            <div>{span.status === 'pending' ? 'In progress' : `${span.duration}ms`}</div>
          </div>
        </div>
      )}
    </div>
  )
} 