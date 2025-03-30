'use client'

import { cn } from '@/lib/utils'
import { ChatMessage } from '@/stores/chat/types'
import { FilePreviewList } from './file-preview'
import { GeneratedImage } from '@/components/chat/generated-image'
import { ImageGenerationLoading } from '@/components/chat/image-generation-loading'

interface MessageListProps {
  messages: ChatMessage[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
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
            <p className="whitespace-pre-wrap">{message.content}</p>
            
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
            
            <span className="text-xs opacity-70 mt-1 block">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
} 