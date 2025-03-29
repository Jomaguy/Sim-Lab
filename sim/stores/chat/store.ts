import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createLogger } from '@/lib/logs/console-logger'
import { useEnvironmentStore } from '../settings/environment/store'
import { useWorkflowStore } from '../workflows/workflow/store'
import { ChatMessage, ChatStore, FileAttachment } from './types'
import { calculateBlockPosition, getNextBlockNumber } from './utils'
import { 
  fileToBase64, 
  extractTextContent, 
  getFileCategory,
  validateFiles 
} from '@/lib/utils/file-validation'

const logger = createLogger('Chat Store')

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      messages: [],
      isProcessing: false,
      error: null,

      sendMessage: async (content: string, attachments?: File[]) => {
        try {
          set({ isProcessing: true, error: null })

          const workflowStore = useWorkflowStore.getState()
          const apiKey = useEnvironmentStore.getState().getVariable('OPENAI_API_KEY')

          if (!apiKey) {
            throw new Error(
              'OpenAI API key not found. Please add it to your environment variables.'
            )
          }

          // Process any attachments
          let processedAttachments: FileAttachment[] = []
          
          if (attachments && attachments.length > 0) {
            // Validate files before processing
            const validationResult = validateFiles(attachments)
            
            if (validationResult.invalid.length > 0) {
              const errorMessages = validationResult.invalid
                .map(({ file, reason }) => `${file.name}: ${reason}`)
                .join(', ')
              
              throw new Error(`Invalid files: ${errorMessages}`)
            }
            
            // Process valid files
            try {
              processedAttachments = await Promise.all(
                validationResult.valid.map(async (file) => {
                  const base64Data = await fileToBase64(file)
                  const textContent = await extractTextContent(file)
                  const category = getFileCategory(file)
                  
                  return {
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64Data,
                    textContent: textContent || undefined
                  }
                })
              )
            } catch (processingError) {
              logger.error('Failed to process attachments:', { processingError })
              throw new Error('Failed to process attached files')
            }
          }

          // User message
          const newMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now(),
            attachments: processedAttachments.length > 0 ? processedAttachments : undefined
          }

          // Format messages for OpenAI API
          const formattedMessages = [
            ...get().messages.map((msg) => {
              // Simple message format for previous messages
              return {
                role: msg.role,
                content: msg.content,
              }
            }),
            {
              role: newMessage.role,
              content: newMessage.content,
            },
          ]

          // Add message to local state first
          set((state) => ({
            messages: [...state.messages, newMessage],
          }))

          // Prepare request body with attachments
          const requestBody: any = {
            messages: formattedMessages,
            workflowState: {
              blocks: workflowStore.blocks,
              edges: workflowStore.edges,
            },
          }

          // Add image and other file content for API
          if (processedAttachments.length > 0) {
            // Add file information
            requestBody.attachments = processedAttachments.map(attachment => ({
              name: attachment.name,
              type: attachment.type,
              data: attachment.data,
              textContent: attachment.textContent
            }))
            
            // Special case for image - for backward compatibility and GPT-4V support
            const firstImage = processedAttachments.find(att => att.type.startsWith('image/'))
            if (firstImage) {
              requestBody.image = {
                data: firstImage.data,
                type: firstImage.type
              }
            }
          }

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-OpenAI-Key': apiKey,
            },
            body: JSON.stringify(requestBody),
          })

          if (!response.ok) {
            throw new Error('Failed to send message')
          }

          const data = await response.json()

          // Handle any actions returned from the API
          if (data.actions) {
            // Process all block additions first to properly calculate positions
            const blockActions = data.actions.filter((action: any) => action.name === 'addBlock')

            blockActions.forEach((action: any, index: number) => {
              const { type, name } = action.parameters
              const id = crypto.randomUUID()

              // Calculate position based on current blocks and action index
              const position = calculateBlockPosition(workflowStore.blocks, index)

              // Generate name if not provided
              const blockName = name || `${type} ${getNextBlockNumber(workflowStore.blocks, type)}`

              workflowStore.addBlock(id, type, blockName, position)
            })

            // Handle other actions (edges, removals, etc.)
            const otherActions = data.actions.filter((action: any) => action.name !== 'addBlock')

            otherActions.forEach((action: any) => {
              switch (action.name) {
                case 'addEdge': {
                  const { sourceId, targetId, sourceHandle, targetHandle } = action.parameters
                  workflowStore.addEdge({
                    id: crypto.randomUUID(),
                    source: sourceId,
                    target: targetId,
                    sourceHandle,
                    targetHandle,
                    type: 'custom',
                  })
                  break
                }
                case 'removeBlock': {
                  workflowStore.removeBlock(action.parameters.id)
                  break
                }
                case 'removeEdge': {
                  workflowStore.removeEdge(action.parameters.id)
                  break
                }
              }
            })
          }

          // Add assistant's response to chat
          if (data.message) {
            set((state) => ({
              messages: [
                ...state.messages,
                {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: data.message,
                  timestamp: Date.now(),
                },
              ],
            }))
          }
        } catch (error) {
          logger.error('Chat error:', { error })
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        } finally {
          set({ isProcessing: false })
        }
      },

      clearChat: () => set({ messages: [], error: null }),
      setError: (error) => set({ error }),
    }),
    { name: 'chat-store' }
  )
)
