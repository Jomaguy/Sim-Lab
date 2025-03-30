'use client'

import { useState } from 'react'
import { Volume2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { TextToSpeechService } from '@/lib/services/tts-service'
import { AudioPlayer } from './audio-player'

interface TTSButtonProps {
  text: string
  voiceId?: string
  className?: string
  tooltip?: string
  variant?: 'default' | 'secondary' | 'ghost' | 'outline' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  autoplay?: boolean
}

export function TTSButton({
  text,
  voiceId,
  className = '',
  tooltip = 'Listen to text',
  variant = 'ghost',
  size = 'icon',
  autoplay = false
}: TTSButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<{
    audioContent: string;
    contentType: string;
    voiceName: string;
  } | null>(null)
  
  // Don't show button for empty text
  if (!text || text.trim().length === 0) {
    return null
  }
  
  const handleClick = async () => {
    if (isLoading || audioData) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const ttsService = TextToSpeechService.getInstance()
      const result = await ttsService.generateSpeech({
        text,
        voiceId
      })
      
      setAudioData({
        audioContent: result.audioBase64,
        contentType: result.audioContentType,
        voiceName: result.voiceName || 'Unknown Voice'
      })
    } catch (err) {
      console.error('TTS error:', err)
      setError(err instanceof Error ? err.message : 'Failed to convert text to speech')
    } finally {
      setIsLoading(false)
    }
  }
  
  // If we have audio data, show the audio player
  if (audioData) {
    return (
      <AudioPlayer
        audioContent={audioData.audioContent}
        contentType={audioData.contentType}
        caption={text}
        voiceName={audioData.voiceName}
        autoplay={autoplay}
        className={className}
      />
    )
  }
  
  // Otherwise show the button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleClick}
            disabled={isLoading}
            aria-label="Convert text to speech"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{error || tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 