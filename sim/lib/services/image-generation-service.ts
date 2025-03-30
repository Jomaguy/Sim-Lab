/**
 * Image Generation Service
 * 
 * This service detects and processes image generation requests from chat messages,
 * using the MCP client to communicate with the Stability AI service.
 */

import { createLogger } from '@/lib/logs/console-logger'
import { MCPClient } from './mcp-client'

const logger = createLogger('ImageGenService')

// Patterns for detecting image generation requests
const IMAGE_GENERATION_PATTERNS = [
  /generate (?:an |a |some )?image (?:of |showing |with |depicting )?(?<prompt>.+)/i,
  /create (?:an |a |some )?image (?:of |showing |with |depicting )?(?<prompt>.+)/i,
  /visualize (?<prompt>.+)/i,
  /show me (?:an |a |some )?image (?:of |showing |with |depicting )?(?<prompt>.+)/i,
  /draw (?<prompt>.+)/i,
  /make (?:an |a |some )?image (?:of |showing |with |depicting )?(?<prompt>.+)/i,
  /paint (?:an |a |some )?image (?:of |showing |with |depicting )?(?<prompt>.+)/i,
]

// Patterns for detecting style preferences
const STYLE_PATTERNS = {
  photographic: /photo(?:graph(?:ic)?)?|realistic|real|life-?like/i,
  'digital-art': /digital art|digital|digital painting/i,
  cinematic: /cinema(?:tic)?|movie|film|scene/i,
  anime: /anime|manga|japanese animation/i,
  'comic-book': /comic(?:[ -]?book)?|cartoon/i,
  'fantasy-art': /fantasy|magical|myth(?:ological|ic)?/i,
  'line-art': /line art|line drawing|sketch/i,
  'analog-film': /analog|film|vintage|retro/i,
  'neon-punk': /neon|cyberpunk|cyber|punk/i,
  isometric: /isometric|iso|3d grid/i,
  '3d-model': /3d|model|render|rendering/i,
  'pixel-art': /pixel|8-bit|8bit|16-bit|16bit|retro game/i,
}

// Prompt keywords to strip for better results
const STRIP_PATTERNS = [
  /^(?:please|can you|could you|would you)?/i,
  /(?:please|for me|thank you)\.?$/i,
]

export interface ImageGenerationOptions {
  width?: number
  height?: number
  negativePrompt?: string
  stylePreset?: string
  cfgScale?: number
  steps?: number
  samples?: number
  chatMessageId?: string
}

export interface DetectedImageRequest {
  isImageRequest: boolean
  prompt: string
  options: ImageGenerationOptions
}

export interface GeneratedImage {
  base64: string
  seed: number
}

export class ImageGenerationService {
  private static instance: ImageGenerationService
  private mcpClient: MCPClient
  
  private constructor() {
    this.mcpClient = MCPClient.getInstance()
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService()
    }
    return ImageGenerationService.instance
  }
  
  /**
   * Detect if a message contains an image generation request
   */
  public detectImageRequest(message: string): DetectedImageRequest {
    // No request if message is too short
    if (message.length < 10) {
      return { isImageRequest: false, prompt: '', options: {} }
    }
    
    // Check each pattern
    for (const pattern of IMAGE_GENERATION_PATTERNS) {
      const match = message.match(pattern)
      if (match && match.groups?.prompt) {
        const prompt = this.cleanPrompt(match.groups.prompt)
        const options = this.extractOptions(message)
        
        return {
          isImageRequest: true,
          prompt,
          options
        }
      }
    }
    
    return { isImageRequest: false, prompt: '', options: {} }
  }
  
  /**
   * Clean and optimize a prompt for better results
   */
  private cleanPrompt(prompt: string): string {
    let cleanedPrompt = prompt.trim()
    
    // Remove common phrases that don't add value
    STRIP_PATTERNS.forEach(pattern => {
      cleanedPrompt = cleanedPrompt.replace(pattern, '')
    })
    
    // Trim again after removing phrases
    cleanedPrompt = cleanedPrompt.trim()
    
    // Add quality enhancers for better results if the prompt is short
    if (cleanedPrompt.length < 30 && !cleanedPrompt.includes('high quality')) {
      cleanedPrompt += ', high quality, detailed'
    }
    
    return cleanedPrompt
  }
  
  /**
   * Extract generation options from the message
   */
  private extractOptions(message: string): ImageGenerationOptions {
    const options: ImageGenerationOptions = {}
    
    // Extract style preset from message
    for (const [style, pattern] of Object.entries(STYLE_PATTERNS)) {
      if (pattern.test(message)) {
        options.stylePreset = style
        break
      }
    }
    
    // Extract dimensions if mentioned
    const dimensionMatch = message.match(/(\d+)x(\d+)/i)
    if (dimensionMatch) {
      const width = parseInt(dimensionMatch[1], 10)
      const height = parseInt(dimensionMatch[2], 10)
      
      // Validate dimensions (must be multiples of 64 for Stability AI)
      if (width >= 512 && width <= 1536 && height >= 512 && height <= 1536) {
        options.width = Math.round(width / 64) * 64
        options.height = Math.round(height / 64) * 64
      }
    }
    
    // Extract negative prompt if mentioned
    const negativeMatch = message.match(/(?:without|no|don'?t include|exclude) (?<negative>.+?)(?:\.|\band\b|$)/i)
    if (negativeMatch && negativeMatch.groups?.negative) {
      options.negativePrompt = negativeMatch.groups.negative.trim()
    }
    
    return options
  }
  
  /**
   * Generate image suggestion based on the user's message
   */
  public getPromptImprovement(originalPrompt: string): string {
    // Check if prompt is too short or generic
    if (originalPrompt.length < 15) {
      return 'Consider adding more details like style, lighting, and subject features'
    }
    
    // Check if prompt lacks specificity
    if (!originalPrompt.includes(' with ') && !originalPrompt.includes(' in ')) {
      return 'Try adding context with phrases like "with dramatic lighting" or "in a forest setting"'
    }
    
    // Prompt seems detailed enough
    return ''
  }
  
  /**
   * Generate an image using the MCP client
   */
  public async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {}
  ): Promise<GeneratedImage[]> {
    logger.info('Generating image with prompt:', prompt)
    
    try {
      const response = await this.mcpClient.executeTool('generateImage', {
        prompt,
        negativePrompt: options.negativePrompt,
        width: options.width,
        height: options.height,
        stylePreset: options.stylePreset,
        cfgScale: options.cfgScale,
        steps: options.steps,
        samples: options.samples || 1
      }, {
        // Add tracking information for the workflow visualization
        chatMessageId: options.chatMessageId
      })
      
      if (response.status === 'success' && response.result.images) {
        return response.result.images.map((img: any) => ({
          base64: img.base64,
          seed: img.seed
        }))
      } else {
        throw new Error(response.error?.message || 'Failed to generate image')
      }
    } catch (error) {
      logger.error('Image generation failed:', error)
      throw error
    }
  }
} 