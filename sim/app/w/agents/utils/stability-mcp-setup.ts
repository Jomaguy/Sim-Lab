/**
 * Stability AI MCP Server Setup
 * 
 * This module provides functions to configure and initialize the Stability AI MCP server.
 */

import { v4 as uuidv4 } from 'uuid';
import { MCPConnectionManager } from './mcp-connection';
import { MCPServerConfig } from './mcp-types';

/**
 * Create and configure a Stability AI MCP server using environment variables
 */
export function createStabilityAIMCPServer(connectionManager: MCPConnectionManager): string {
  const apiKey = process.env.STABILITY_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('STABILITY_AI_API_KEY environment variable is not set');
  }
  
  const serverConfig: Omit<MCPServerConfig, 'status'> = {
    id: uuidv4(),
    name: 'Stability AI Image Generation',
    url: 'https://api.stability.ai',
    apiKey,
    type: 'stability-ai',
    capabilities: ['generateImage']
  };
  
  return connectionManager.registerServer(serverConfig);
}

/**
 * Get a list of available tools from the Stability AI MCP server
 */
export function getStabilityAITools() {
  return [
    {
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
    }
  ];
} 