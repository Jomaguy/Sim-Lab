/**
 * MCP Server Configuration Types
 * 
 * This module defines the TypeScript interfaces and types for MCP server configuration
 * and communication.
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey: string;
  type: 'stability-ai';
  status: 'connected' | 'disconnected' | 'error';
  capabilities: string[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface MCPToolRequest {
  serverId: string;
  toolName: string;
  parameters: Record<string, any>;
  requestId: string;
}

export interface MCPToolResponse {
  requestId: string;
  status: 'success' | 'error';
  result?: any;
  error?: {
    message: string;
    code: string;
  };
  timing: {
    startTime: string;
    endTime: string;
    duration: number;
  };
}

export interface ImageGenerationParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  stylePreset?: string;
  cfgScale?: number;
  steps?: number;
  samples?: number;
}

export interface ImageGenerationResult {
  images: Array<{
    base64: string;
    finishReason: string;
    seed: number;
  }>;
} 