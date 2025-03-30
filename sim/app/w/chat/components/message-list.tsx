'use client'

import { cn } from '@/lib/utils'
import { ChatMessage } from '@/stores/chat/types'
import { FilePreviewList } from './file-preview'
import { GeneratedImage } from '@/components/chat/generated-image'
import { ImageGenerationLoading } from '@/components/chat/image-generation-loading'
import { TTSButton } from '@/components/tts/tts-button'
import { useState, useEffect } from 'react'
import { MessageAudio } from '@/components/tts/message-audio'

// Default TTS settings
const defaultTTSSettings = {
  enabled: true,
  voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel voice
  autoplay: false,
  volume: 0.7
}

interface MessageListProps {
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  const [ttsSettings, setTTSSettings] = useState(defaultTTSSettings)
  
  // Load TTS settings from localStorage if available
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('tts-settings')
      if (storedSettings) {
        setTTSSettings(JSON.parse(storedSettings))
      }
    } catch (error) {
      console.error('Error loading TTS settings:', error)
    }
  }, [])
  
  return (
    <div className="flex flex-col space-y-4 p-4">
      {messages.map(message => (
        <div
          key={message.id}
          className={cn(
            'flex w-full',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-lg px-4 py-2',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <div className="whitespace-pre-wrap flex gap-2 items-start">
              <p className="flex-1">{message.content}</p>
              {message.role === 'assistant' && message.content && (
                <TTSButton 
                  text={message.content} 
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 mt-1 shrink-0"
                  tooltip="Listen to response"
                />
              )}
            </div>
            
            {/* Display loading indicator for image generation */}
            {message.isLoading && message.imageGenerationPrompt && (
              <ImageGenerationLoading prompt={message.imageGenerationPrompt} />
            )}
            
            {/* Display regular attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2">
                {/* Display generated images with special component */}
                {message.attachments.some(att => att.generatedImage) ? (
                  <div className="flex flex-col gap-2">
                    {message.attachments
                      .filter(att => att.generatedImage)
                      .map(att => (
                        <GeneratedImage
                          key={att.id}
                          imageData={att.data}
                          prompt={att.generatedImage?.prompt || ''}
                          seed={att.generatedImage?.seed}
                        />
                      ))}
                  </div>
                ) : (
                  <FilePreviewList 
                    attachments={message.attachments} 
                    layout="list"
                  />
                )}
              </div>
            )}
            
            {/* Add MessageAudio for assistant messages */}
            {message.role === 'assistant' && message.content && ttsSettings.enabled && (
              <div className="mt-2">
                <MessageAudio 
                  text={message.content}
                  messageId={message.id}
                  settings={ttsSettings}
                  className="mt-1"
                />
              </div>
            )}
            
            <span className="text-xs opacity-70 mt-1 block">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
} 