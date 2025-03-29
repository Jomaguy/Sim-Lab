'use client'

import { useEffect, useRef, useState } from 'react'
import { FileIcon, Image as ImageIcon, Paperclip, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatStore } from '@/stores/chat/store'
import { MessageList } from './message-list'
import { FilePreviewList } from './file-preview'
import { ALL_ACCEPTED_FILE_TYPES, validateFiles } from '@/lib/utils/file-validation'

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

  const processFiles = (files: File[]) => {
    if (files.length === 0) return

    // Validate files
    const validation = validateFiles([...selectedFiles, ...files])
    
    // Handle errors
    if (validation.invalid.length > 0) {
      setFileErrors(validation.invalid.map(({file, reason}) => `${file.name}: ${reason}`))
    } else {
      setFileErrors([])
    }
    
    // Add valid files to selection
    if (validation.valid.length > 0) {
      setSelectedFiles(prev => [...prev, ...validation.valid])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    processFiles(Array.from(e.target.files))
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    
    // Clear errors when files are removed
    if (fileErrors.length > 0) {
      setFileErrors([])
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files))
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
      className="flex-1 flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 bg-primary/10 flex items-center justify-center">
            <div className="bg-background p-8 rounded-lg shadow-lg text-center">
              <Paperclip className="mx-auto h-12 w-12 text-primary/60 mb-4" />
              <p className="text-lg font-medium">Drop files here</p>
              <p className="text-sm text-muted-foreground mt-1">
                Support for documents, images, and more
              </p>
            </div>
          </div>
        )}
        
        {/* File preview area */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 border rounded-lg p-3 bg-muted/20">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected ({formatSize(totalSize)})
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
                className="h-7 px-2"
              >
                Clear all
              </Button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative border rounded-md overflow-hidden bg-background">
                  <div className="p-2 flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <div className="h-8 w-8 bg-muted/30 rounded-md flex items-center justify-center">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 bg-muted/30 rounded-md flex items-center justify-center">
                        <FileIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{formatSize(file.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Error messages */}
        {fileErrors.length > 0 && (
          <div className="mb-3 p-3 border border-red-200 rounded-lg bg-red-50 text-red-700">
            <div className="font-medium mb-1">There were issues with your files:</div>
            <ul className="text-sm list-disc list-inside">
              {fileErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Message input */}
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
    </div>
  )
} 