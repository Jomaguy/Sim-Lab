/**
 * MCP Connection Manager
 * 
 * This module provides utilities for connecting to and communicating with MCP servers.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  MCPServerConfig, 
  MCPToolRequest, 
  MCPToolResponse,
  ImageGenerationParams,
  ImageGenerationResult
} from './mcp-types';

// Define types for Stability AI API
interface StabilityTextPrompt {
  text: string;
  weight: number;
}

interface StabilityGenerationRequest {
  text_prompts: StabilityTextPrompt[];
  cfg_scale: number;
  width: number;
  height: number;
  steps: number;
  samples: number;
  style_preset?: string;
}

interface StabilityArtifact {
  base64: string;
  finishReason: string;
  seed: number;
}

interface StabilityGenerationResponse {
  artifacts: StabilityArtifact[];
}

export class MCPConnectionManager {
  private servers: Map<string, MCPServerConfig> = new Map();
  
  /**
   * Register a new MCP server
   */
  registerServer(config: Omit<MCPServerConfig, 'status'>): string {
    const serverId = config.id || uuidv4();
    
    this.servers.set(serverId, {
      ...config,
      id: serverId,
      status: 'disconnected'
    });
    
    return serverId;
  }
  
  /**
   * Get a server by ID
   */
  getServer(id: string): MCPServerConfig | undefined {
    return this.servers.get(id);
  }
  
  /**
   * Get all registered servers
   */
  getAllServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }
  
  /**
   * Connect to a server and verify it's working
   */
  async connectToServer(id: string): Promise<boolean> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`Server with ID ${id} not found`);
    }
    
    try {
      // For Stability AI, verify the connection by checking engine list
      if (server.type === 'stability-ai') {
        const response = await fetch(`${server.url}/v1/engines/list`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${server.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to connect to Stability AI: ${response.statusText}`);
        }
        
        // Update server status
        this.servers.set(id, {
          ...server,
          status: 'connected'
        });
        
        return true;
      }
      
      throw new Error(`Unsupported server type: ${server.type}`);
    } catch (error) {
      // Update server status to error
      this.servers.set(id, {
        ...server,
        status: 'error'
      });
      
      console.error('MCP server connection error:', error);
      return false;
    }
  }
  
  /**
   * Execute a tool on an MCP server
   */
  async executeTool<T>(request: MCPToolRequest): Promise<MCPToolResponse> {
    const server = this.servers.get(request.serverId);
    if (!server) {
      throw new Error(`Server with ID ${request.serverId} not found`);
    }
    
    const startTime = new Date().toISOString();
    
    try {
      // Handle Stability AI tools
      if (server.type === 'stability-ai') {
        if (request.toolName === 'generateImage') {
          const params = request.parameters as ImageGenerationParams;
          const result = await this.generateStabilityImage(server, params);
          
          const endTime = new Date().toISOString();
          const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
          
          return {
            requestId: request.requestId,
            status: 'success',
            result,
            timing: {
              startTime,
              endTime,
              duration
            }
          };
        }
        
        throw new Error(`Unsupported tool for Stability AI: ${request.toolName}`);
      }
      
      throw new Error(`Unsupported server type: ${server.type}`);
    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
      
      return {
        requestId: request.requestId,
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EXECUTION_ERROR'
        },
        timing: {
          startTime,
          endTime,
          duration
        }
      };
    }
  }
  
  /**
   * Generate an image using Stability AI
   */
  private async generateStabilityImage(
    server: MCPServerConfig,
    params: ImageGenerationParams
  ): Promise<ImageGenerationResult> {
    // Default to SDXL if not specified
    const engineId = 'stable-diffusion-xl-1024-v1-0';
    
    // Prepare the request body
    const body: StabilityGenerationRequest = {
      text_prompts: [
        {
          text: params.prompt,
          weight: 1.0
        }
      ],
      cfg_scale: params.cfgScale || 7,
      width: params.width || 1024,
      height: params.height || 1024,
      steps: params.steps || 30,
      samples: params.samples || 1
    };
    
    // Add negative prompt if provided
    if (params.negativePrompt) {
      body.text_prompts.push({
        text: params.negativePrompt,
        weight: -1.0
      });
    }
    
    // Add style preset if provided
    if (params.stylePreset) {
      body.style_preset = params.stylePreset;
    }
    
    // Make the API request
    const response = await fetch(`${server.url}/v1/generation/${engineId}/text-to-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${server.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Stability AI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json() as StabilityGenerationResponse;
    
    return {
      images: data.artifacts.map((artifact) => ({
        base64: artifact.base64,
        finishReason: artifact.finishReason,
        seed: artifact.seed
      }))
    };
  }
} 