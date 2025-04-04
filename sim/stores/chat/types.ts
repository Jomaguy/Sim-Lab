export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  data: string
  preview?: string
  textContent?: string
  generatedImage?: {
    prompt: string
    seed?: number
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  attachments?: FileAttachment[]
  isLoading?: boolean
  imageGenerationPrompt?: string
}

export interface ChatState {
  messages: ChatMessage[]
  isProcessing: boolean
  error: string | null
}

export interface ChatActions {
  sendMessage: (content: string, attachments?: File[]) => Promise<void>
  clearChat: () => void
  setError: (error: string | null) => void
}

export type ChatStore = ChatState & ChatActions
