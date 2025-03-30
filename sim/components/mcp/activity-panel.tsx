'use client'

import { useEffect, useState } from 'react'
import { Clock, Database, RotateCcw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkflowVisualization } from '@/components/workflow/workflow-visualization'
import { useWorkflowActivityStore, ActivityNode } from '@/stores/mcp/workflow-activity'
import { useMCPActivity } from '@/hooks/use-mcp-activity'

interface MCPActivityPanelProps {
  className?: string
}

export function MCPActivityPanel({ className = '' }: MCPActivityPanelProps) {
  const mcpActivity = useMCPActivity()
  const sessions = useWorkflowActivityStore(state => state.sessions)
  const activeSessionId = useWorkflowActivityStore(state => state.activeSessionId)
  const setActiveSession = useWorkflowActivityStore(state => state.setActiveSession)
  
  const [activeTab, setActiveTab] = useState('current')
  const [selectedNode, setSelectedNode] = useState<ActivityNode | null>(null)
  
  // Get nodes and connections for the active session
  const sessionNodes = mcpActivity.getSessionNodes()
  const sessionConnections = mcpActivity.getSessionConnections()
  
  // Get historical sessions (excluding the active one)
  const historicalSessions = Object.values(sessions)
    .filter(session => session.id !== activeSessionId)
    .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  
  // Format session name for display
  const formatSessionDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date)
  }
  
  // Clear the current session
  const handleClearSession = () => {
    if (activeSessionId) {
      mcpActivity.clearCurrentSession()
    }
  }
  
  // Handle node click
  const handleNodeClick = (node: ActivityNode) => {
    setSelectedNode(node)
  }
  
  // Load historical session
  const loadHistoricalSession = (sessionId: string) => {
    setActiveSession(sessionId)
    setActiveTab('current')
  }
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="p-4 border-b flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="current">Current Session</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {selectedNode && <TabsTrigger value="details">Details</TabsTrigger>}
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              title="Clear current session"
              onClick={handleClearSession}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <TabsContent value="current" className="flex-1 overflow-hidden">
          {sessionNodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <Database className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">No activity yet</h3>
              <p className="max-w-md">
                Workflow activity will be recorded as you use tools and interact with the chat.
              </p>
            </div>
          ) : (
            <WorkflowVisualization
              nodes={sessionNodes}
              connections={sessionConnections}
              activeNodeId={selectedNode?.id}
              onNodeClick={handleNodeClick}
            />
          )}
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 overflow-auto p-4">
          {historicalSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-2">No session history</h3>
              <p>Previous sessions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historicalSessions.map(session => (
                <div key={session.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{session.name}</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => loadHistoricalSession(session.id)}
                    >
                      View
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <div>Started: {formatSessionDate(session.startTime)}</div>
                    {session.endTime && <div>Ended: {formatSessionDate(session.endTime)}</div>}
                    {session.description && <div className="mt-2">{session.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        {selectedNode && (
          <TabsContent value="details" className="flex-1 overflow-auto p-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">{selectedNode.label}</h3>
                {selectedNode.description && (
                  <p className="text-muted-foreground">{selectedNode.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Type</div>
                  <div className="font-mono bg-muted px-2 py-1 rounded">{selectedNode.type}</div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Status</div>
                  <div className="font-mono bg-muted px-2 py-1 rounded">{selectedNode.status}</div>
                </div>
                
                <div>
                  <div className="font-medium mb-1">Started</div>
                  <div className="font-mono bg-muted px-2 py-1 rounded">
                    {formatSessionDate(selectedNode.startTime)}
                  </div>
                </div>
                
                {selectedNode.endTime && (
                  <div>
                    <div className="font-medium mb-1">Completed</div>
                    <div className="font-mono bg-muted px-2 py-1 rounded">
                      {formatSessionDate(selectedNode.endTime)}
                    </div>
                  </div>
                )}
              </div>
              
              {selectedNode.tool && (
                <div>
                  <div className="font-medium mb-1">Tool</div>
                  <div className="font-mono bg-muted p-2 rounded">{selectedNode.tool}</div>
                </div>
              )}
              
              {selectedNode.parameters && Object.keys(selectedNode.parameters).length > 0 && (
                <div>
                  <div className="font-medium mb-1">Parameters</div>
                  <pre className="font-mono bg-muted p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedNode.parameters, null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedNode.result && (
                <div>
                  <div className="font-medium mb-1">Result</div>
                  <pre className="font-mono bg-muted p-3 rounded text-xs overflow-x-auto">
                    {typeof selectedNode.result === 'object' 
                      ? JSON.stringify(selectedNode.result, null, 2)
                      : selectedNode.result.toString()}
                  </pre>
                </div>
              )}
              
              {selectedNode.error && (
                <div>
                  <div className="font-medium text-red-500 mb-1">Error</div>
                  <pre className="font-mono bg-red-100 dark:bg-red-900/30 p-3 rounded text-xs overflow-x-auto">
                    {selectedNode.error}
                  </pre>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
} 