import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createLogger } from '@/lib/logs/console-logger'

const logger = createLogger('MCP Workflow Activity')

// Workflow node status
export type ActivityNodeStatus = 'idle' | 'running' | 'completed' | 'error' | 'warning'

// MCP activity node
export interface ActivityNode {
  id: string
  type: string // 'api', 'tool', 'chat', etc.
  label: string
  description?: string
  status: ActivityNodeStatus
  startTime: Date
  endTime?: Date
  tool?: string
  parameters?: Record<string, any>
  result?: any
  error?: string
  chatMessageId?: string // Reference to related chat message if any
  parentId?: string // Reference to parent node if this is a sub-activity
}

// Connection between activity nodes
export interface ActivityConnection {
  id: string
  sourceId: string
  targetId: string
  label?: string
}

// Node creation options
export interface CreateNodeOptions {
  type: string
  label: string
  description?: string
  tool?: string
  parameters?: Record<string, any>
  chatMessageId?: string
  parentId?: string
}

// Session to group activities
export interface ActivitySession {
  id: string
  name: string
  startTime: Date
  endTime?: Date
  description?: string
}

// Main workflow activity store state
interface WorkflowActivityState {
  // Data
  nodes: Record<string, ActivityNode>
  connections: Record<string, ActivityConnection>
  sessions: Record<string, ActivitySession>
  activeSessionId?: string
  
  // Actions
  createSession: (name: string, description?: string) => string
  endSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void
  
  createNode: (options: CreateNodeOptions) => string
  updateNodeStatus: (nodeId: string, status: ActivityNodeStatus) => void
  completeNode: (nodeId: string, result?: any) => void
  failNode: (nodeId: string, error: string) => void
  
  connectNodes: (sourceId: string, targetId: string, label?: string) => string
  
  clearSession: (sessionId: string) => void
  clearAll: () => void
  
  // Selectors
  getSessionNodes: (sessionId: string) => ActivityNode[]
  getSessionConnections: (sessionId: string) => ActivityConnection[]
  getNodesByStatus: (status: ActivityNodeStatus) => ActivityNode[]
  getNodesByType: (type: string) => ActivityNode[]
  getNodesByTool: (tool: string) => ActivityNode[]
}

// Create the workflow activity store
export const useWorkflowActivityStore = create<WorkflowActivityState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        nodes: {},
        connections: {},
        sessions: {},
        
        // Create a new session
        createSession: (name, description) => {
          const id = crypto.randomUUID()
          const session: ActivitySession = {
            id,
            name,
            startTime: new Date(),
            description
          }
          
          set(state => ({
            sessions: {
              ...state.sessions,
              [id]: session
            },
            activeSessionId: id
          }))
          
          logger.info(`Created new session: ${name} (${id})`)
          return id
        },
        
        // End an existing session
        endSession: (sessionId) => {
          set(state => {
            if (!state.sessions[sessionId]) return state
            
            return {
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...state.sessions[sessionId],
                  endTime: new Date()
                }
              }
            }
          })
          
          logger.info(`Ended session: ${sessionId}`)
        },
        
        // Set the active session
        setActiveSession: (sessionId) => {
          set({ activeSessionId: sessionId })
        },
        
        // Create a new activity node
        createNode: (options) => {
          const id = crypto.randomUUID()
          const { type, label, description, tool, parameters, chatMessageId, parentId } = options
          
          const node: ActivityNode = {
            id,
            type,
            label,
            description,
            status: 'idle',
            startTime: new Date(),
            tool,
            parameters,
            chatMessageId,
            parentId
          }
          
          set(state => ({
            nodes: {
              ...state.nodes,
              [id]: node
            }
          }))
          
          logger.info(`Created node: ${label} (${id})`, { type, tool })
          return id
        },
        
        // Update a node's status
        updateNodeStatus: (nodeId, status) => {
          set(state => {
            if (!state.nodes[nodeId]) return state
            
            return {
              nodes: {
                ...state.nodes,
                [nodeId]: {
                  ...state.nodes[nodeId],
                  status
                }
              }
            }
          })
          
          logger.info(`Updated node ${nodeId} status: ${status}`)
        },
        
        // Mark a node as completed
        completeNode: (nodeId, result) => {
          set(state => {
            if (!state.nodes[nodeId]) return state
            
            return {
              nodes: {
                ...state.nodes,
                [nodeId]: {
                  ...state.nodes[nodeId],
                  status: 'completed',
                  endTime: new Date(),
                  result
                }
              }
            }
          })
          
          logger.info(`Completed node: ${nodeId}`)
        },
        
        // Mark a node as failed
        failNode: (nodeId, error) => {
          set(state => {
            if (!state.nodes[nodeId]) return state
            
            return {
              nodes: {
                ...state.nodes,
                [nodeId]: {
                  ...state.nodes[nodeId],
                  status: 'error',
                  endTime: new Date(),
                  error
                }
              }
            }
          })
          
          logger.info(`Failed node: ${nodeId}`, { error })
        },
        
        // Connect two nodes
        connectNodes: (sourceId, targetId, label) => {
          const id = crypto.randomUUID()
          
          const connection: ActivityConnection = {
            id,
            sourceId,
            targetId,
            label
          }
          
          set(state => ({
            connections: {
              ...state.connections,
              [id]: connection
            }
          }))
          
          logger.info(`Connected nodes: ${sourceId} -> ${targetId}`)
          return id
        },
        
        // Clear a session and all its nodes/connections
        clearSession: (sessionId) => {
          set(state => {
            const sessionNodes = Object.values(state.nodes).filter(
              node => state.sessions[sessionId] && 
                      node.startTime >= state.sessions[sessionId].startTime && 
                      (!state.sessions[sessionId].endTime || 
                       !node.endTime || 
                       node.endTime <= state.sessions[sessionId].endTime)
            )
            
            const sessionNodeIds = new Set(sessionNodes.map(node => node.id))
            
            const remainingNodes = Object.entries(state.nodes).reduce(
              (acc, [id, node]) => {
                if (!sessionNodeIds.has(id)) {
                  acc[id] = node
                }
                return acc
              }, 
              {} as Record<string, ActivityNode>
            )
            
            const remainingConnections = Object.entries(state.connections).reduce(
              (acc, [id, conn]) => {
                if (!sessionNodeIds.has(conn.sourceId) && !sessionNodeIds.has(conn.targetId)) {
                  acc[id] = conn
                }
                return acc
              },
              {} as Record<string, ActivityConnection>
            )
            
            const remainingSessions = { ...state.sessions }
            delete remainingSessions[sessionId]
            
            const activeSessionId = state.activeSessionId === sessionId 
              ? Object.keys(remainingSessions)[0] 
              : state.activeSessionId
            
            return {
              nodes: remainingNodes,
              connections: remainingConnections,
              sessions: remainingSessions,
              activeSessionId
            }
          })
          
          logger.info(`Cleared session: ${sessionId}`)
        },
        
        // Clear all data
        clearAll: () => {
          set({
            nodes: {},
            connections: {},
            sessions: {},
            activeSessionId: undefined
          })
          
          logger.info('Cleared all workflow activity data')
        },
        
        // Selectors
        getSessionNodes: (sessionId) => {
          const state = get()
          const session = state.sessions[sessionId]
          
          if (!session) return []
          
          return Object.values(state.nodes).filter(node => 
            node.startTime >= session.startTime && 
            (!session.endTime || !node.endTime || node.endTime <= session.endTime)
          )
        },
        
        getSessionConnections: (sessionId) => {
          const state = get()
          const sessionNodes = state.getSessionNodes(sessionId)
          const sessionNodeIds = new Set(sessionNodes.map(node => node.id))
          
          return Object.values(state.connections).filter(conn => 
            sessionNodeIds.has(conn.sourceId) && sessionNodeIds.has(conn.targetId)
          )
        },
        
        getNodesByStatus: (status) => {
          return Object.values(get().nodes).filter(node => node.status === status)
        },
        
        getNodesByType: (type) => {
          return Object.values(get().nodes).filter(node => node.type === type)
        },
        
        getNodesByTool: (tool) => {
          return Object.values(get().nodes).filter(node => node.tool === tool)
        }
      }),
      {
        name: 'mcp-workflow-activity',
        partialize: (state) => ({
          // Only persist completed sessions and their nodes/connections to avoid excessive storage
          sessions: Object.entries(state.sessions).reduce(
            (acc, [id, session]) => {
              if (session.endTime) {
                acc[id] = session
              }
              return acc
            },
            {} as Record<string, ActivitySession>
          ),
          // Don't store nodes, connections, or active session
        })
      }
    )
  )
) 