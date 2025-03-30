import { useEffect } from 'react'
import { useWorkflowActivityStore, ActivityNode, ActivityConnection } from '@/stores/mcp/workflow-activity'
import { useChatStore } from '@/stores/chat/store'

interface UseMCPActivityOptions {
  sessionName?: string
  sessionDescription?: string
  autoCreateSession?: boolean
}

/**
 * Hook to connect MCP activities with the chat interface
 */
export function useMCPActivity(options: UseMCPActivityOptions = {}) {
  const { 
    sessionName = 'Chat Session', 
    sessionDescription = 'Automatic session created from chat', 
    autoCreateSession = true 
  } = options
  
  const workflowActivityStore = useWorkflowActivityStore()
  const chatStore = useChatStore()
  const chatMessages = chatStore.messages
  
  // Create a session automatically if requested
  useEffect(() => {
    if (autoCreateSession && !workflowActivityStore.activeSessionId) {
      workflowActivityStore.createSession(sessionName, sessionDescription)
    }
  }, [autoCreateSession, sessionName, sessionDescription, workflowActivityStore])
  
  // Track chat messages and create nodes for them
  useEffect(() => {
    // Skip if no active session
    if (!workflowActivityStore.activeSessionId) return
    
    // Get the most recent message
    const lastMessageIndex = chatMessages.length - 1
    if (lastMessageIndex < 0) return
    
    const lastMessage = chatMessages[lastMessageIndex]
    
    // Check if we already created a node for this message
    const existingNodes = Object.values(workflowActivityStore.nodes)
      .filter(node => node.chatMessageId === lastMessage.id)
    
    if (existingNodes.length > 0) return
    
    // Create a node for this message
    const nodeType = lastMessage.role === 'user' ? 'user-message' : 'assistant-message'
    const nodeDescription = lastMessage.content.length > 100 
      ? `${lastMessage.content.substring(0, 100)}...` 
      : lastMessage.content
    
    const nodeId = workflowActivityStore.createNode({
      type: nodeType,
      label: `${lastMessage.role === 'user' ? 'User' : 'Assistant'} message`,
      description: nodeDescription,
      chatMessageId: lastMessage.id,
    })
    
    // If this is a response to a previous message, connect them
    if (lastMessageIndex > 0 && lastMessage.role === 'assistant') {
      const prevMessage = chatMessages[lastMessageIndex - 1]
      
      // Find the node for the previous message
      const prevNodes = Object.values(workflowActivityStore.nodes)
        .filter(node => node.chatMessageId === prevMessage.id)
      
      if (prevNodes.length > 0) {
        workflowActivityStore.connectNodes(prevNodes[0].id, nodeId)
      }
    }
    
    // Mark the node as completed
    workflowActivityStore.completeNode(nodeId)
  }, [chatMessages, workflowActivityStore])
  
  /**
   * Start tracking a new tool activity
   */
  const trackToolStart = (
    tool: string, 
    params: Record<string, any> = {}, 
    options: { label?: string; description?: string } = {}
  ) => {
    if (!workflowActivityStore.activeSessionId) {
      workflowActivityStore.createSession(sessionName, sessionDescription)
    }
    
    // Create a node for this tool call
    const nodeId = workflowActivityStore.createNode({
      type: 'tool',
      label: options.label || `Tool: ${tool}`,
      description: options.description,
      tool,
      parameters: params
    })
    
    // Mark it as running
    workflowActivityStore.updateNodeStatus(nodeId, 'running')
    
    return nodeId
  }
  
  /**
   * Complete a tool activity
   */
  const trackToolComplete = (nodeId: string, result?: any) => {
    workflowActivityStore.completeNode(nodeId, result)
  }
  
  /**
   * Mark a tool activity as failed
   */
  const trackToolError = (nodeId: string, error: string) => {
    workflowActivityStore.failNode(nodeId, error)
  }
  
  /**
   * Get workflow nodes for the current session
   */
  const getSessionNodes = (): ActivityNode[] => {
    if (!workflowActivityStore.activeSessionId) return []
    return workflowActivityStore.getSessionNodes(workflowActivityStore.activeSessionId)
  }
  
  /**
   * Get workflow connections for the current session
   */
  const getSessionConnections = (): ActivityConnection[] => {
    if (!workflowActivityStore.activeSessionId) return []
    return workflowActivityStore.getSessionConnections(workflowActivityStore.activeSessionId)
  }
  
  /**
   * Clear the current session
   */
  const clearCurrentSession = () => {
    if (workflowActivityStore.activeSessionId) {
      workflowActivityStore.clearSession(workflowActivityStore.activeSessionId)
    }
  }
  
  /**
   * Create a new session
   */
  const createNewSession = (name = sessionName, description = sessionDescription) => {
    return workflowActivityStore.createSession(name, description)
  }
  
  return {
    // Actions
    trackToolStart,
    trackToolComplete,
    trackToolError,
    clearCurrentSession,
    createNewSession,
    
    // Data access
    getSessionNodes,
    getSessionConnections,
    
    // Direct store access
    store: workflowActivityStore
  }
} 