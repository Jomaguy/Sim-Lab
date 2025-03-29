'use client'

import { cn } from '@/lib/utils'
import { ChatMessage } from '@/stores/chat/types'
import { FilePreviewList } from './file-preview'

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
            
            {/* Display attachments if present */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2">
                <FilePreviewList 
                  attachments={message.attachments} 
                  layout="list"
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