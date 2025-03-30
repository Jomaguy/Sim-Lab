/**
 * MCP Client Service
 * 
 * This service provides a client to communicate with MCP servers through the API.
 */

import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '@/lib/logs/console-logger'
import { useWorkflowActivityStore } from '@/stores/mcp/workflow-activity'

const logger = createLogger('MCPClient')

// Types
export interface MCPToolRequest {
  toolName: string
  parameters: Record<string, any>
  requestId: string
}

export interface MCPToolResponse {
  requestId: string
  status: 'success' | 'error'
  result?: any
  error?: {
    message: string
    code: string
    details?: any
  }
  timing: {
    startTime: string
    endTime: string
    duration: number
  }
}

export interface MCPToolDefinition {
  name: string
  description: string
  parameters: Record<string, any>
}

export interface TraceSpan {
  id: string
  name: string
  type: string
  startTime: string
  endTime: string
  duration: number
  status: 'success' | 'error' | 'pending'
  children?: TraceSpan[]
  result?: any
  error?: any
  activityNodeId?: string // Reference to the activity node in the workflow store
}

// Available MCP tools
export const MCP_TOOLS: Record<string, MCPToolDefinition> = {
  generateImage: {
    name: 'generateImage',
    description: 'Generate an image using Stability AI\'s text-to-image models',
    parameters: {
      prompt: {
        type: 'string',
        description: 'Text description of the image to generate',
        required: true
      },
      negativePrompt: {
        type: 'string',
        description: 'Text description of what to avoid in the generated image',
        required: false
      },
      width: {
        type: 'number',
        description: 'Width of the generated image (default: 1024)',
        required: false
      },
      height: {
        type: 'number',
        description: 'Height of the generated image (default: 1024)',
        required: false
      },
      stylePreset: {
        type: 'string',
        description: 'Style preset to use for the image generation',
        required: false,
        enum: [
          'photographic',
          'digital-art',
          'cinematic',
          'anime',
          'comic-book',
          'fantasy-art',
          'line-art',
          'analog-film',
          'neon-punk',
          'isometric',
          '3d-model',
          'pixel-art'
        ]
      },
      cfgScale: {
        type: 'number',
        description: 'How strongly the image should conform to the prompt (default: 7)',
        required: false
      },
      steps: {
        type: 'number',
        description: 'Number of diffusion steps to run (default: 30)',
        required: false
      },
      samples: {
        type: 'number',
        description: 'Number of images to generate (default: 1)',
        required: false
      }
    }
  },
  
  textToSpeech: {
    name: 'textToSpeech',
    description: 'Convert text to speech using ElevenLabs API',
    parameters: {
      text: {
        type: 'string',
        description: 'Text to convert to speech',
        required: true
      },
      voiceId: {
        type: 'string',
        description: 'ID of the voice to use (default: Rachel)',
        required: false
      },
      modelId: {
        type: 'string',
        description: 'ID of the model to use for generation',
        required: false
      },
      stability: {
        type: 'number',
        description: 'Stability factor for voice generation (0-1)',
        required: false
      },
      similarityBoost: {
        type: 'number',
        description: 'Voice clarity and similarity factor (0-1)',
        required: false
      },
      style: {
        type: 'number',
        description: 'Speaking style value (0-1)',
        required: false
      },
      speakerBoost: {
        type: 'boolean',
        description: 'Enhance speaker clarity and target similarity',
        required: false
      },
      speechRate: {
        type: 'number',
        description: 'Rate of speech (0.5-2.0)',
        required: false
      }
    }
  },
  
  getVoices: {
    name: 'getVoices',
    description: 'Get available voices from ElevenLabs API',
    parameters: {}
  }
}

// Create a class to handle MCP requests
export class MCPClient {
  private static instance: MCPClient
  private traceSpans: Map<string, TraceSpan> = new Map()
  private listeners: Array<(spans: TraceSpan[]) => void> = []
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MCPClient {
    if (!MCPClient.instance) {
      MCPClient.instance = new MCPClient()
    }
    return MCPClient.instance
  }
  
  /**
   * Execute a tool call to an MCP server
   */
  public async executeTool(
    toolName: string, 
    parameters: Record<string, any>,
    options: { parentNodeId?: string; chatMessageId?: string } = {}
  ): Promise<MCPToolResponse> {
    const requestId = uuidv4()
    
    // Create a trace span for this request
    const spanId = `mcp-${requestId}`
    const startTime = new Date().toISOString()
    
    // Get workflow activity store
    let activityNodeId: string | undefined = undefined
    const workflowStore = useWorkflowActivityStore.getState()
    
    // Create workflow activity node if store is available
    if (workflowStore) {
      // Ensure we have an active session
      if (!workflowStore.activeSessionId) {
        workflowStore.createSession('MCP Tool Session', 'Session created from MCP client')
      }
      
      // Create the activity node
      activityNodeId = workflowStore.createNode({
        type: 'mcp-tool',
        label: `MCP Tool: ${toolName}`,
        description: `Parameters: ${JSON.stringify(parameters, null, 2).substring(0, 100)}...`,
        tool: toolName,
        parameters,
        chatMessageId: options.chatMessageId,
        parentId: options.parentNodeId
      })
      
      // Set as running
      workflowStore.updateNodeStatus(activityNodeId, 'running')
      
      // Connect to parent if specified
      if (options.parentNodeId) {
        workflowStore.connectNodes(options.parentNodeId, activityNodeId)
      }
    }
    
    // Initialize trace span
    const span: TraceSpan = {
      id: spanId,
      name: `MCP Tool: ${toolName}`,
      type: 'mcp-tool',
      startTime,
      endTime: startTime, // Will be updated when the request completes
      duration: 0, // Will be updated when the request completes
      status: 'pending',
      activityNodeId
    }
    
    this.traceSpans.set(spanId, span)
    this.notifyListeners()
    
    try {
      // Prepare request
      const request: MCPToolRequest = {
        toolName,
        parameters,
        requestId
      }
      
      // Make the request to the MCP API
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`MCP API error: ${response.status} ${response.statusText} - ${error}`)
      }
      
      const result = await response.json() as MCPToolResponse
      const endTime = new Date().toISOString()
      
      // Update trace span
      span.endTime = result.timing.endTime || endTime
      span.duration = result.timing.duration || 
        (new Date(span.endTime).getTime() - new Date(span.startTime).getTime())
      span.status = result.status
      
      if (result.status === 'success') {
        span.result = result.result
        
        // Update workflow activity node
        if (activityNodeId) {
          workflowStore.completeNode(activityNodeId, result.result)
        }
      } else if (result.status === 'error' && result.error) {
        span.error = result.error
        
        // Update workflow activity node
        if (activityNodeId) {
          workflowStore.failNode(activityNodeId, result.error.message)
        }
      }
      
      this.traceSpans.set(spanId, span)
      this.notifyListeners()
      
      return result
    } catch (error) {
      const endTime = new Date().toISOString()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update trace span with error
      span.endTime = endTime
      span.duration = new Date(endTime).getTime() - new Date(span.startTime).getTime()
      span.status = 'error'
      span.error = {
        message: errorMessage,
        code: 'EXECUTION_ERROR'
      }
      
      // Update workflow activity node
      if (activityNodeId) {
        workflowStore.failNode(activityNodeId, errorMessage)
      }
      
      this.traceSpans.set(spanId, span)
      this.notifyListeners()
      
      logger.error('Error executing MCP tool:', { error, toolName, parameters })
      
      return {
        requestId,
        status: 'error',
        error: {
          message: errorMessage,
          code: 'EXECUTION_ERROR'
        },
        timing: {
          startTime: span.startTime,
          endTime,
          duration: span.duration
        }
      }
    }
  }
  
  /**
   * Get active trace spans
   */
  public getTraceSpans(): TraceSpan[] {
    return Array.from(this.traceSpans.values())
  }
  
  /**
   * Add a listener for trace span updates
   */
  public addListener(callback: (spans: TraceSpan[]) => void): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }
  
  /**
   * Notify listeners of trace span updates
   */
  private notifyListeners(): void {
    const spans = this.getTraceSpans()
    this.listeners.forEach(listener => {
      try {
        listener(spans)
      } catch (error) {
        logger.error('Error in trace span listener:', { error })
      }
    })
  }
  
  /**
   * Clear all trace spans
   */
  public clearTraceSpans(): void {
    this.traceSpans.clear()
    this.notifyListeners()
  }
} 