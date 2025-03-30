import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console-logger'

const logger = createLogger('MCPApi')

// Validation schemas
const ImageGenerationRequestSchema = z.object({
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  stylePreset: z.string().optional(),
  cfgScale: z.number().optional(),
  steps: z.number().optional(),
  samples: z.number().optional(),
})

const RequestSchema = z.object({
  toolName: z.string(),
  parameters: z.record(z.any()),
  requestId: z.string(),
})

// Stability AI API integration
async function generateImage(params: z.infer<typeof ImageGenerationRequestSchema>) {
  const apiKey = process.env.STABILITY_AI_API_KEY
  
  if (!apiKey) {
    throw new Error('STABILITY_AI_API_KEY environment variable is not set')
  }
  
  // Default to SDXL if not specified
  const engineId = 'stable-diffusion-xl-1024-v1-0'
  
  // Prepare the request body
  const body: any = {
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
  }
  
  // Add negative prompt if provided
  if (params.negativePrompt) {
    body.text_prompts.push({
      text: params.negativePrompt,
      weight: -1.0
    })
  }
  
  // Add style preset if provided
  if (params.stylePreset) {
    body.style_preset = params.stylePreset
  }
  
  // Make the API request
  const startTime = new Date()
  const response = await fetch(`https://api.stability.ai/v1/generation/${engineId}/text-to-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Stability AI API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json()
  const endTime = new Date()
  
  return {
    images: data.artifacts.map((artifact: any) => {
      // Ensure we have clean base64 data without data URL prefix
      const base64 = artifact.base64
        ? (artifact.base64.startsWith('data:') ? artifact.base64.split(',')[1] : artifact.base64)
        : ''
        
      return {
        base64,
        finishReason: artifact.finishReason,
        seed: artifact.seed
      }
    }),
    timing: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime()
    }
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)
  
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = RequestSchema.parse(body)
    const { toolName, parameters, requestId } = validatedData
    
    // Start timing
    const startTime = new Date()
    
    // Handle specific tools
    if (toolName === 'generateImage') {
      const imageParams = ImageGenerationRequestSchema.parse(parameters)
      const result = await generateImage(imageParams)
      
      const endTime = new Date()
      
      return NextResponse.json({
        requestId,
        status: 'success',
        result,
        timing: {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: endTime.getTime() - startTime.getTime()
        }
      })
    }
    
    // Unknown tool
    return NextResponse.json(
      { 
        requestId,
        status: 'error',
        error: {
          message: `Unsupported MCP tool: ${toolName}`,
          code: 'UNSUPPORTED_TOOL'
        },
        timing: {
          startTime: startTime.toISOString(),
          endTime: new Date().toISOString(),
          duration: new Date().getTime() - startTime.getTime()
        }
      }, 
      { status: 400 }
    )
  } catch (error) {
    logger.error(`[${requestId}] MCP API error:`, { error })
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          requestId,
          status: 'error',
          error: {
            message: 'Invalid request format',
            code: 'VALIDATION_ERROR',
            details: error.errors
          },
          timing: {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 0
          }
        }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        requestId,
        status: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'EXECUTION_ERROR'
        },
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0
        }
      }, 
      { status: 500 }
    )
  }
} 