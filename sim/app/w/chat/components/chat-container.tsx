'use client'

import { useEffect, useRef, useState } from 'react'
import { FileIcon, Image as ImageIcon, Paperclip, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatStore } from '@/stores/chat/store'
import { MessageList } from './message-list'
import { FilePreviewList } from './file-preview'
import { ALL_ACCEPTED_FILE_TYPES, validateFiles } from '@/lib/utils/file-validation'
import { MCPTraceDisplay } from '@/components/mcp/trace-display'

// Constants for image validation
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export function ChatContainer() {
  const { messages, isProcessing, error, sendMessage } = useChatStore()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!message.trim() && selectedFiles.length === 0) || isProcessing) return

    await sendMessage(message, selectedFiles.length > 0 ? selectedFiles : undefined)
    setMessage('')
    setSelectedFiles([])
    setFileErrors([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileList = Array.from(files)
    
    // Validate files
    const { valid, invalid } = validateFiles(fileList)
    
    if (invalid.length > 0) {
      setFileErrors(invalid.map(({file, reason}) => `${file.name}: ${reason}`))
    } else {
      setFileErrors([])
    }
    
    setSelectedFiles([...selectedFiles, ...valid])
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if we're leaving the main container
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (
      x < rect.left ||
      x >= rect.right ||
      y < rect.top ||
      y >= rect.bottom
    ) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    // Handle dropped files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files)
      
      // Validate files
      const { valid, invalid } = validateFiles(fileList)
      
      if (invalid.length > 0) {
        setFileErrors(invalid.map(({file, reason}) => `${file.name}: ${reason}`))
      } else {
        setFileErrors([])
      }
      
      setSelectedFiles([...selectedFiles, ...valid])
    }
  }

  // Format bytes to human-readable size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Calculate total size of selected files
  const totalSize = selectedFiles.reduce((size, file) => size + file.size, 0)

  return (
    <div 
      className="flex flex-col flex-1 max-h-full overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="max-w-md text-center space-y-4">
              <h2 className="text-xl font-bold">Welcome to AI Chat</h2>
              <p className="text-muted-foreground">
                Start a conversation with the AI assistant or try the following:
              </p>
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  className="text-sm justify-start"
                  onClick={() => setMessage("Generate an image of a sunset over the mountains")}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Generate an image of a sunset over mountains
                </Button>
                <Button
                  variant="outline"
                  className="text-sm justify-start"
                  onClick={() => setMessage("What can you help me with?")}
                >
                  <FileIcon className="mr-2 h-4 w-4" />
                  What can you help me with?
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* File preview area */}
      {selectedFiles.length > 0 && (
        <div className="border-t p-3 bg-muted/30">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              Selected files ({selectedFiles.length})
            </span>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
          <FilePreviewList
            attachments={selectedFiles.map((file, index) => ({
              id: index.toString(),
              name: file.name,
              type: file.type,
              size: file.size,
              data: URL.createObjectURL(file)
            }))}
            onRemove={(id) => handleRemoveFile(parseInt(id))}
            showRemove={true}
          />
        </div>
      )}
      
      {/* File error messages */}
      {fileErrors.length > 0 && (
        <div className="border-t p-2 bg-destructive/10 text-destructive text-sm">
          <div className="font-medium mb-1">Unable to attach some files:</div>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {fileErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="border-t p-2 bg-destructive/10 text-destructive text-sm">
          <div className="font-medium">Error:</div>
          <div>{error}</div>
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 border-2 border-dashed border-primary rounded-lg">
          <div className="text-center">
            <Paperclip className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Drop files to attach</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Supports images, documents, and code files
            </p>
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleFileClick}
            disabled={isProcessing}
            className="flex-shrink-0"
            title="Attach files"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedFiles.length > 0 ? "Add a message with your files..." : "Type your message..."}
            className="flex-1"
            disabled={isProcessing}
          />
          <input
            type="file"
            accept={ALL_ACCEPTED_FILE_TYPES.join(',')}
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isProcessing || (!message.trim() && selectedFiles.length === 0)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
      
      {/* MCP Trace Display */}
      <MCPTraceDisplay />
    </div>
  )
} 