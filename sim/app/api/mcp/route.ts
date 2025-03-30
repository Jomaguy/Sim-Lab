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

const TextToSpeechRequestSchema = z.object({
  text: z.string(),
  voiceId: z.string().optional(),
  modelId: z.string().optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional(),
  style: z.number().min(0).max(1).optional(),
  speakerBoost: z.boolean().optional(),
  speechRate: z.number().min(0.5).max(2.0).optional()
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

// ElevenLabs Text-to-Speech integration
async function textToSpeech(params: z.infer<typeof TextToSpeechRequestSchema>) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set')
  }
  
  // Default voice is Rachel
  const voiceId = params.voiceId || '21m00Tcm4TlvDq8ikWAM'
  const modelId = params.modelId || 'eleven_multilingual_v2'
  
  // Prepare API parameters
  const body = {
    text: params.text,
    model_id: modelId,
    voice_settings: {
      stability: params.stability ?? 0.5,
      similarity_boost: params.similarityBoost ?? 0.75,
      style: params.style ?? 0.0,
      use_speaker_boost: params.speakerBoost ?? true
    }
  }
  
  if (params.speechRate && params.speechRate !== 1.0) {
    // We need to add SSML for speech rate
    body.text = `<speak><prosody rate="${params.speechRate}">${params.text}</prosody></speak>`
  }
  
  // Make the API request
  const startTime = new Date()
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  // The response is binary audio data
  const audioData = await response.arrayBuffer()
  const base64Audio = Buffer.from(audioData).toString('base64')
  
  // Get voice information to return the voice name
  const voiceInfo = await getVoiceInfo(voiceId, apiKey)
  
  const endTime = new Date()
  
  return {
    audioBase64: base64Audio,
    audioContentType: 'audio/mpeg',
    voiceId,
    voiceName: voiceInfo?.name || 'Unknown',
    timing: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime()
    }
  }
}

// Get all available voices from ElevenLabs
async function getVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set')
  }
  
  // Make the API request
  const startTime = new Date()
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'xi-api-key': apiKey
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  
  const data = await response.json()
  const endTime = new Date()
  
  // Transform the response to our needed format
  return {
    voices: data.voices.map((voice: any) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      previewUrl: voice.preview_url
    })),
    timing: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime()
    }
  }
}

// Helper function to get information about a specific voice
async function getVoiceInfo(voiceId: string, apiKey: string) {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const voice = await response.json()
    return {
      voiceId: voice.voice_id,
      name: voice.name
    }
  } catch (error) {
    logger.error('Error fetching voice info:', { error, voiceId })
    return null
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
    
    if (toolName === 'textToSpeech') {
      const ttsParams = TextToSpeechRequestSchema.parse(parameters)
      const result = await textToSpeech(ttsParams)
      
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
    
    if (toolName === 'getVoices') {
      const result = await getVoices()
      
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