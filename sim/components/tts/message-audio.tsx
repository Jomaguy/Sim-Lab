'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TextToSpeechService, TTSResponse } from '@/lib/services/tts-service'
import { TTSSettings } from './tts-settings'
import { AudioPlayer } from './audio-player'
import { Skeleton } from '@/components/ui/skeleton'

interface MessageAudioProps {
  text: string
  messageId: string
  settings: TTSSettings
  className?: string
}

export function MessageAudio({
  text,
  messageId,
  settings,
  className = ''
}: MessageAudioProps) {
  const [isTTSEnabled, setIsTTSEnabled] = useState(settings.enabled)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<TTSResponse | null>(null)
  
  // Auto-generate TTS if enabled in settings
  useEffect(() => {
    // Update local state when settings change
    setIsTTSEnabled(settings.enabled)
    
    // Don't auto-generate if TTS is disabled or if we already have audio
    if (!settings.enabled || audioData) {
      return
    }
    
    generateAudio()
  }, [settings.enabled, settings.voiceId])
  
  // Generate audio from text
  const generateAudio = async () => {
    // Don't generate if we already have audio or text is empty
    if (audioData || !text || text.trim().length === 0) {
      return
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      const ttsService = TextToSpeechService.getInstance()
      const result = await ttsService.generateSpeech({
        text,
        voiceId: settings.voiceId,
        chatMessageId: messageId
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
      setIsGenerating(false)
    }
  }
  
  // Early return if TTS is disabled
  if (!isTTSEnabled) {
    return null
  }
  
  // Show loading state
  if (isGenerating) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Skeleton className="h-8 w-40" />
      </div>
    )
  }
  
  // Show error state
  if (error) {
    return (
      <div className={`flex items-center gap-2 text-destructive ${className}`}>
        <VolumeX className="h-4 w-4" />
        <span className="text-xs">TTS Error: {error}</span>
      </div>
    )
  }
  
  // Show audio player if we have audio data
  if (audioData) {
    return (
      <AudioPlayer
        audioContent={audioData.audioContent}
        contentType={audioData.contentType}
        voiceName={audioData.voiceName}
        autoplay={settings.autoplay}
        className={className}
      />
    )
  }
  
  // Show generate button if we don't have audio yet
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center gap-1 h-8 ${className}`}
            onClick={generateAudio}
          >
            <Volume2 className="h-4 w-4" />
            <span className="text-xs">Generate audio</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Generate audio for this message</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 