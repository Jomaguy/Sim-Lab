'use client'

import { useEffect, useState } from 'react'
import { Activity, ChevronDown, ChevronUp, Filter, Settings, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

// Workflow node statuses
type NodeStatus = 'idle' | 'running' | 'completed' | 'error' | 'warning'

// Workflow visualization node
interface WorkflowNode {
  id: string
  type: string
  label: string
  description?: string
  status: NodeStatus
  startTime?: Date
  endTime?: Date
  tool?: string
  parameters?: Record<string, any>
  result?: any
  error?: string
}

// Connection between workflow nodes
interface WorkflowConnection {
  id: string
  sourceId: string
  targetId: string
  label?: string
}

interface WorkflowVisualizationProps {
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  activeNodeId?: string
  onNodeClick?: (node: WorkflowNode) => void
  className?: string
  showFilters?: boolean
}

export function WorkflowVisualization({
  nodes = [],
  connections = [],
  activeNodeId,
  onNodeClick,
  className = '',
  showFilters = true
}: WorkflowVisualizationProps) {
  const [filteredNodes, setFilteredNodes] = useState<WorkflowNode[]>(nodes)
  const [statusFilter, setStatusFilter] = useState<NodeStatus[]>([])
  const [toolFilter, setToolFilter] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
  
  // Update filtered nodes when nodes or filters change
  useEffect(() => {
    let filtered = [...nodes]
    
    if (statusFilter.length > 0) {
      filtered = filtered.filter(node => statusFilter.includes(node.status))
    }
    
    if (toolFilter.length > 0) {
      filtered = filtered.filter(node => node.tool && toolFilter.includes(node.tool))
    }
    
    setFilteredNodes(filtered)
  }, [nodes, statusFilter, toolFilter])
  
  // Toggle node expansion
  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }))
  }
  
  // Toggle status filter
  const toggleStatusFilter = (status: NodeStatus) => {
    setStatusFilter(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }
  
  // Toggle tool filter
  const toggleToolFilter = (tool: string) => {
    setToolFilter(prev => 
      prev.includes(tool)
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    )
  }
  
  // Clear all filters
  const clearFilters = () => {
    setStatusFilter([])
    setToolFilter([])
  }
  
  // Get unique tools for filter
  const uniqueTools = Array.from(new Set(nodes.map(node => node.tool).filter(Boolean) as string[]))
  
  // Format duration
  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return ''
    const end = endTime || new Date()
    const durationMs = end.getTime() - startTime.getTime()
    
    if (durationMs < 1000) {
      return `${durationMs}ms`
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`
    } else {
      const minutes = Math.floor(durationMs / 60000)
      const seconds = Math.floor((durationMs % 60000) / 1000)
      return `${minutes}m ${seconds}s`
    }
  }
  
  // Node status icons and colors
  const getStatusDetails = (status: NodeStatus) => {
    switch (status) {
      case 'idle':
        return { icon: <Activity className="h-4 w-4" />, color: 'text-muted-foreground', bg: 'bg-muted' }
      case 'running':
        return { icon: <Activity className="h-4 w-4 animate-pulse" />, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' }
      case 'completed':
        return { icon: <Activity className="h-4 w-4" />, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' }
      case 'error':
        return { icon: <Activity className="h-4 w-4" />, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' }
      case 'warning':
        return { icon: <Activity className="h-4 w-4" />, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
      default:
        // Fallback for any unhandled status
        return { icon: <Activity className="h-4 w-4" />, color: 'text-muted-foreground', bg: 'bg-muted' }
    }
  }
  
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header with filters */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workflow Visualization</h2>
        
        {showFilters && (
          <div className="flex items-center gap-2">
            <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Filter className="h-4 w-4" />
                  Filters
                  {isFilterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="absolute right-4 mt-2 p-4 bg-card border rounded-md shadow-md z-10 w-64">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Status</h3>
                    <div className="flex flex-wrap gap-2">
                      {(['idle', 'running', 'completed', 'error', 'warning'] as NodeStatus[]).map(status => (
                        <Badge 
                          key={status}
                          variant={statusFilter.includes(status) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleStatusFilter(status)}
                        >
                          {status}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {uniqueTools.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Tools</h3>
                      <div className="flex flex-wrap gap-2">
                        {uniqueTools.map(tool => (
                          <Badge 
                            key={tool}
                            variant={toolFilter.includes(tool) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleToolFilter(tool)}
                          >
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full"
                    onClick={clearFilters}
                    disabled={statusFilter.length === 0 && toolFilter.length === 0}
                  >
                    Clear filters
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualization settings</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
      
      {/* Workflow visualization */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No workflow steps to display
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNodes.map((node, index) => {
              const isExpanded = expandedNodes[node.id]
              const statusDetails = getStatusDetails(node.status)
              const isActive = node.id === activeNodeId
              
              // Find connections for this node
              const outgoingConnections = connections.filter(conn => conn.sourceId === node.id)
              
              return (
                <div key={node.id} className="relative">
                  {/* Connection lines from previous node */}
                  {index > 0 && (
                    <div className="absolute left-4 -top-3 w-0.5 h-3 bg-border" />
                  )}
                  
                  {/* Node card */}
                  <Card 
                    className={cn(
                      "relative transition-colors",
                      isActive && "ring-2 ring-primary ring-offset-1",
                      statusDetails.bg
                    )}
                    onClick={() => onNodeClick?.(node)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1 rounded-md", statusDetails.color)}>
                            {node.tool ? <Wrench className="h-4 w-4" /> : statusDetails.icon}
                          </div>
                          <div>
                            <div className="font-medium">{node.label}</div>
                            {node.description && (
                              <div className="text-xs text-muted-foreground">{node.description}</div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {node.startTime && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(node.startTime, node.endTime)}
                            </span>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleNodeExpanded(node.id)
                            }}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-3 text-sm">
                          {node.tool && (
                            <div>
                              <div className="font-medium text-xs text-muted-foreground mb-1">Tool</div>
                              <div className="font-mono bg-muted p-1 rounded">{node.tool}</div>
                            </div>
                          )}
                          
                          {node.parameters && Object.keys(node.parameters).length > 0 && (
                            <div>
                              <div className="font-medium text-xs text-muted-foreground mb-1">Parameters</div>
                              <pre className="font-mono bg-muted p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(node.parameters, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {node.result && (
                            <div>
                              <div className="font-medium text-xs text-muted-foreground mb-1">Result</div>
                              <pre className="font-mono bg-muted p-2 rounded text-xs overflow-x-auto">
                                {typeof node.result === 'object' 
                                  ? JSON.stringify(node.result, null, 2)
                                  : node.result.toString()}
                              </pre>
                            </div>
                          )}
                          
                          {node.error && (
                            <div>
                              <div className="font-medium text-xs text-red-500 mb-1">Error</div>
                              <pre className="font-mono bg-red-100 dark:bg-red-900/30 p-2 rounded text-xs overflow-x-auto">
                                {node.error}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                  
                  {/* Connection lines to next nodes */}
                  {outgoingConnections.length > 0 && (
                    <div className="absolute left-4 h-3 w-0.5 bg-border" style={{ top: '100%' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
} 