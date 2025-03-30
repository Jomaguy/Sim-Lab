/**
 * Text-to-Speech Service
 * 
 * Service for generating speech from text using ElevenLabs API.
 */

'use client'

import { createLogger } from '@/lib/logs/console-logger'
import { MCPClient } from '@/lib/services/mcp-client'

const logger = createLogger('TTS Service')

// API endpoints
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

// Types
export interface TTSOptions {
  text: string
  voiceId?: string
  modelId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  speakerBoost?: boolean
  speechRate?: number
  chatMessageId?: string
}

export interface VoiceInfo {
  voiceId: string
  name: string
  category?: string
  description?: string
  previewUrl?: string
  samples?: Array<{ fileName: string; mimeType: string; sampleId: string }>
}

export interface TTSResult {
  audioBase64: string
  audioContentType: string
  text: string
  voiceId: string
  voiceName?: string
}

export interface CaptionType {
  name: string
  description: string
  template: string
}

export interface TTSResponse {
  audioContent: string
  contentType: string
  voiceName: string
}

export class TextToSpeechService {
  private static instance: TextToSpeechService
  private mcpClient: MCPClient
  private availableVoices: VoiceInfo[] = []
  private hasLoadedVoices: boolean = false
  
  // Default voice options
  private defaultVoice: string = '21m00Tcm4TlvDq8ikWAM' // Rachel voice
  private defaultModel: string = 'eleven_multilingual_v2'
  
  // Caption types
  public captionTypes: CaptionType[] = [
    {
      name: 'Descriptive',
      description: 'Detailed description of the image contents',
      template: 'This image shows {subject} with {details}. The scene has {atmosphere} with {colors} colors.'
    },
    {
      name: 'Storytelling',
      description: 'Narrative that tells a story about the image',
      template: 'In this captivating scene, {subject} {action}. {backstory}. {emotion}'
    },
    {
      name: 'Poetic',
      description: 'Artistic and poetic description',
      template: 'A {adjective} vision of {subject}, where {poetic_description}. {metaphor}'
    },
    {
      name: 'Technical',
      description: 'Technical analysis of the image',
      template: 'The image depicts {subject} with {technical_details}. Notable elements include {elements}.'
    },
    {
      name: 'Emotional',
      description: 'Focus on emotions evoked by the image',
      template: 'This powerful image evokes a sense of {emotion}. {subject} {action}, creating a feeling of {feeling}.'
    }
  ]
  
  private constructor() {
    this.mcpClient = MCPClient.getInstance()
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): TextToSpeechService {
    if (!TextToSpeechService.instance) {
      TextToSpeechService.instance = new TextToSpeechService()
    }
    return TextToSpeechService.instance
  }
  
  /**
   * Create a caption for an image based on its description
   */
  public generateCaption(
    imageDescription: string, 
    captionType: string = 'Descriptive',
    additionalContext: string = ''
  ): string {
    // Find the requested caption type or default to descriptive
    const captionTemplate = this.captionTypes.find(t => t.name === captionType) || this.captionTypes[0]
    
    // Use the image description or context to build a better caption
    // In a real implementation, this might call an LLM to generate a proper caption
    
    // Simple placeholder implementation - in practice, we'd use more sophisticated NLP
    let caption = captionTemplate.template
    
    // Extract potential subjects from the image description
    const words = imageDescription.split(' ')
    const potentialSubjects = words.filter(w => w.length > 4).slice(0, 3).join(' and ')
    
    // Replace template variables with content
    caption = caption.replace('{subject}', potentialSubjects || 'the scene')
    caption = caption.replace('{details}', additionalContext || 'interesting details')
    caption = caption.replace('{atmosphere}', 'a captivating atmosphere')
    caption = caption.replace('{colors}', 'vibrant')
    caption = caption.replace('{action}', 'presents an interesting scene')
    caption = caption.replace('{backstory}', 'There\'s a story unfolding in this moment')
    caption = caption.replace('{emotion}', 'It evokes a sense of wonder')
    caption = caption.replace('{adjective}', 'stunning')
    caption = caption.replace('{poetic_description}', 'elements dance in harmony')
    caption = caption.replace('{metaphor}', 'Like a dream captured in pixels')
    caption = caption.replace('{technical_details}', 'notable composition and lighting')
    caption = caption.replace('{elements}', 'key visual elements')
    caption = caption.replace('{feeling}', 'wonder and appreciation')
    
    return caption
  }
  
  /**
   * Generate speech from text
   */
  public async generateSpeech(options: TTSOptions): Promise<TTSResult> {
    const {
      text,
      voiceId = this.defaultVoice,
      modelId = this.defaultModel,
      stability = 0.5,
      similarityBoost = 0.75,
      style = 0,
      speakerBoost = true,
      speechRate = 1.0
    } = options
    
    logger.info('Generating speech:', { text: text.substring(0, 50) + '...', voiceId, modelId })
    
    try {
      // Use the MCP client to call the textToSpeech tool
      const response = await this.mcpClient.executeTool('textToSpeech', {
        text,
        voiceId,
        modelId,
        stability,
        similarityBoost,
        style,
        speakerBoost,
        speechRate
      }, {
        chatMessageId: options.chatMessageId
      })
      
      if (response.status === 'success' && response.result) {
        logger.info('Speech generated successfully')
        return {
          audioBase64: response.result.audioBase64,
          audioContentType: response.result.audioContentType,
          text,
          voiceId,
          voiceName: response.result.voiceName
        }
      } else {
        throw new Error(response.error?.message || 'Failed to generate speech')
      }
    } catch (error) {
      logger.error('Speech generation failed:', error)
      throw error
    }
  }
  
  /**
   * Fetch available voices from ElevenLabs
   */
  public async getAvailableVoices(forceRefresh: boolean = false): Promise<VoiceInfo[]> {
    // Return cached voices if available and not forced to refresh
    if (this.hasLoadedVoices && !forceRefresh) {
      return this.availableVoices
    }
    
    try {
      // Use the MCP client to call the getVoices tool
      const response = await this.mcpClient.executeTool('getVoices', {})
      
      if (response.status === 'success' && response.result && response.result.voices) {
        this.availableVoices = response.result.voices
        this.hasLoadedVoices = true
        return this.availableVoices
      } else {
        // If API call fails, return default voices
        logger.warn('Failed to get voices, using defaults')
        return this.getDefaultVoices()
      }
    } catch (error) {
      logger.error('Error fetching voices:', error)
      // Return default voices on error
      return this.getDefaultVoices()
    }
  }
  
  /**
   * Get default voices if API call fails
   */
  private getDefaultVoices(): VoiceInfo[] {
    return [
      {
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        name: 'Rachel',
        category: 'premade',
        description: 'A warm, friendly female voice with a natural tone'
      },
      {
        voiceId: 'AZnzlk1XvdvUeBnXmlld',
        name: 'Domi',
        category: 'premade',
        description: 'A soft, calm female voice'
      },
      {
        voiceId: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella',
        category: 'premade',
        description: 'A mature, professional female voice'
      },
      {
        voiceId: 'ErXwobaYiN019PkySvjV',
        name: 'Antoni',
        category: 'premade',
        description: 'A precise, articulate male voice'
      },
      {
        voiceId: 'MF3mGyEYCl7XYWbV9V6O',
        name: 'Elli',
        category: 'premade',
        description: 'A youthful, energetic female voice'
      }
    ]
  }
  
  /**
   * Detect if text is a request for speech generation
   */
  public detectTTSRequest(message: string): { isTTSRequest: boolean; text?: string; voiceId?: string } {
    // Patterns that might indicate TTS requests
    const ttsPatterns = [
      /generate (audio|speech|voice) (for|from|of|saying)?\s?["']?([^"']+)["']?/i,
      /read (this|the following|aloud|out loud)?\s?["']?([^"']+)["']?/i,
      /say\s?["']?([^"']+)["']?/i,
      /narrate\s?["']?([^"']+)["']?/i,
      /speak\s?["']?([^"']+)["']?/i,
      /create (a|an) (narration|audio) (for|saying)?\s?["']?([^"']+)["']?/i
    ]
    
    // Try to match against patterns
    for (const pattern of ttsPatterns) {
      const match = message.match(pattern)
      if (match) {
        // Extract the text to be spoken - this depends on the pattern
        let text
        if (pattern.toString().includes('(for|from|of|saying)?')) {
          text = match[3]
        } else if (pattern.toString().includes('(this|the following|aloud|out loud)?')) {
          text = match[2]
        } else if (pattern.toString().includes('(a|an) (narration|audio) (for|saying)?')) {
          text = match[4]
        } else {
          text = match[1]
        }
        
        // Check for voice specification
        const voiceMatch = message.match(/(?:with|using) (?:the |a |an )?(?:voice(?: of)? |narrator )?(Rachel|Domi|Bella|Antoni|Elli)/i)
        const voiceId = voiceMatch ? this.voiceNameToId(voiceMatch[1]) : undefined
        
        return {
          isTTSRequest: true,
          text,
          voiceId
        }
      }
    }
    
    return { isTTSRequest: false }
  }
  
  /**
   * Convert voice name to voice ID
   */
  private voiceNameToId(name: string): string | undefined {
    const voiceMap: Record<string, string> = {
      'rachel': '21m00Tcm4TlvDq8ikWAM',
      'domi': 'AZnzlk1XvdvUeBnXmlld',
      'bella': 'EXAVITQu4vr4xnSDxMaL',
      'antoni': 'ErXwobaYiN019PkySvjV',
      'elli': 'MF3mGyEYCl7XYWbV9V6O'
    }
    
    return voiceMap[name.toLowerCase()]
  }
  
  /**
   * Get available voices from ElevenLabs
   */
  static async getVoices(): Promise<VoiceInfo[]> {
    try {
      const instance = TextToSpeechService.getInstance()
      return await instance.getAvailableVoices(true)
    } catch (error) {
      console.error('Error fetching voices:', error)
      throw new Error('Failed to fetch voices from ElevenLabs')
    }
  }
  
  /**
   * Convert text to speech using ElevenLabs API (static version)
   */
  static async convertTextToSpeech(
    text: string, 
    voiceId?: string
  ): Promise<TTSResponse> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for text-to-speech conversion')
    }
    
    try {
      // Get the singleton instance
      const instance = TextToSpeechService.getInstance()
      
      // Use the instance method to generate speech
      const result = await instance.generateSpeech({
        text,
        voiceId
      })
      
      return {
        audioContent: result.audioBase64,
        contentType: result.audioContentType,
        voiceName: result.voiceName || 'Unknown Voice'
      }
    } catch (error) {
      console.error('Error converting text to speech:', error)
      throw new Error('Failed to convert text to speech using ElevenLabs')
    }
  }
  
  /**
   * Get a settings object with default values
   */
  static getDefaultSettings() {
    return {
      enabled: true,
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
      autoplay: true,
      volume: 0.7
    }
  }
} 