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
import { ImageGenerationService, DetectedImageRequest } from '@/lib/services/image-generation-service'
import { useWorkflowActivityStore } from '@/stores/mcp/workflow-activity'

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
          
          // Ensure environment store is initialized and try to load variables if needed
          const environmentStore = useEnvironmentStore.getState()
          if (!environmentStore.variables || Object.keys(environmentStore.variables).length === 0) {
            await environmentStore.loadEnvironmentVariables()
          }
          
          const apiKey = environmentStore.getVariable('OPENAI_API_KEY')
          const activityStore = useWorkflowActivityStore.getState()
          
          // Create a workflow activity node for this message
          let chatNodeId: string | undefined = undefined
          if (activityStore && (!activityStore.activeSessionId)) {
            activityStore.createSession('Chat Session', 'Chat interaction session')
          }

          if (!apiKey) {
            throw new Error(
              'OpenAI API key not found. Please add it to your environment variables.'
            )
          }

          // Process any attachments
          let processedAttachments: FileAttachment[] = []
          
          if (attachments && attachments.length > 0) {
            // Validate files
            const validationResult = validateFiles(attachments)
            if (validationResult.invalid.length > 0) {
              throw new Error(`File error: ${validationResult.invalid[0].reason}`)
            }
            
            // Process each file
            for (const file of attachments) {
              const base64 = await fileToBase64(file)
              const textContent = await extractTextContent(file)
              
              processedAttachments.push({
                id: crypto.randomUUID(),
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                textContent: textContent || undefined
              })
            }
          }

          // Add user message to chat
          const newMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            timestamp: Date.now(),
            attachments: processedAttachments.length > 0 ? processedAttachments : undefined
          }
          
          // Create a workflow activity node for the user message
          if (activityStore) {
            chatNodeId = activityStore.createNode({
              type: 'user-message',
              label: 'User Message',
              description: content.length > 50 ? `${content.substring(0, 50)}...` : content,
              chatMessageId: newMessage.id
            })
            activityStore.completeNode(chatNodeId)
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

          // Check if this is an image generation request
          const imageGenService = ImageGenerationService.getInstance()
          const imageRequest: DetectedImageRequest = imageGenService.detectImageRequest(content)
          
          if (imageRequest.isImageRequest) {
            logger.info('Detected image generation request:', { prompt: imageRequest.prompt })
            
            // Create a workflow activity node for the image generation
            let imageGenNodeId: string | undefined = undefined
            
            try {
              // Add a loading message
              const loadingMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `Generating image with prompt: "${imageRequest.prompt}"`,
                timestamp: Date.now(),
                isLoading: true,
                imageGenerationPrompt: imageRequest.prompt
              }
              
              // Create the activity node
              if (activityStore) {
                imageGenNodeId = activityStore.createNode({
                  type: 'image-generation',
                  label: 'Image Generation',
                  description: imageRequest.prompt,
                  tool: 'generateImage',
                  parameters: {
                    prompt: imageRequest.prompt,
                    ...imageRequest.options
                  },
                  chatMessageId: loadingMessage.id,
                  parentId: chatNodeId
                })
                activityStore.updateNodeStatus(imageGenNodeId, 'running')
                
                // Connect to user message if it exists
                if (chatNodeId) {
                  activityStore.connectNodes(chatNodeId, imageGenNodeId)
                }
              }
              
              set((state) => ({
                messages: [...state.messages, loadingMessage],
              }))
              
              // Generate the image
              const generatedImages = await imageGenService.generateImage(
                imageRequest.prompt, 
                {
                  ...imageRequest.options,
                  chatMessageId: loadingMessage.id
                }
              )
              
              if (generatedImages && generatedImages.length > 0) {
                // Remove the loading message and add a message with the generated image
                set((state) => ({
                  messages: state.messages.filter(msg => msg.id !== loadingMessage.id),
                }))
                
                const imageAttachments: FileAttachment[] = generatedImages.map(img => {
                  // Make sure the base64 data doesn't include the data URL prefix
                  const base64Data = img.base64.startsWith('data:') 
                    ? img.base64.split(',')[1] 
                    : img.base64
                    
                  return {
                    id: crypto.randomUUID(),
                    name: `generated-image-${img.seed || Date.now()}.png`,
                    type: 'image/png',
                    size: Math.ceil(base64Data.length * 0.75), // Approximate size from base64
                    data: base64Data,
                    generatedImage: {
                      prompt: imageRequest.prompt,
                      seed: img.seed
                    }
                  }
                })
                
                const generatedImageMessage: ChatMessage = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `Here's the image I generated based on your prompt: "${imageRequest.prompt}"`,
                  timestamp: Date.now(),
                  attachments: imageAttachments
                }
                
                // Update the workflow activity node with success
                if (activityStore && imageGenNodeId) {
                  activityStore.completeNode(imageGenNodeId, {
                    numImages: generatedImages.length,
                    seeds: generatedImages.map(img => img.seed)
                  })
                  
                  // Create a node for the assistant reply
                  const replyNodeId = activityStore.createNode({
                    type: 'assistant-message',
                    label: 'Assistant Reply',
                    description: 'Generated image response',
                    chatMessageId: generatedImageMessage.id,
                    parentId: imageGenNodeId
                  })
                  
                  // Connect the nodes
                  activityStore.connectNodes(imageGenNodeId, replyNodeId)
                  activityStore.completeNode(replyNodeId)
                }
                
                set((state) => ({
                  messages: [...state.messages, generatedImageMessage],
                  isProcessing: false
                }))
                
                return
              }
            } catch (error) {
              logger.error('Image generation error:', error)
              
              // Update the workflow activity node with error
              if (activityStore && imageGenNodeId) {
                activityStore.failNode(imageGenNodeId, error instanceof Error ? error.message : 'Unknown error')
              }
              
              // Remove loading messages for image generation
              set((state) => ({
                messages: state.messages.filter(
                  msg => !msg.isLoading || !msg.imageGenerationPrompt
                ),
              }))
              
              // Continue with normal chat flow if image generation fails
              logger.info('Falling back to standard chat after image generation failure')
            }
          }

          // Create activity node for the API request
          let apiNodeId: string | undefined = undefined
          if (activityStore) {
            apiNodeId = activityStore.createNode({
              type: 'api-request',
              label: 'Chat API Request',
              description: 'Request to the chat API',
              chatMessageId: newMessage.id,
              parentId: chatNodeId,
              parameters: {
                numMessages: formattedMessages.length,
                hasAttachments: processedAttachments.length > 0
              }
            })
            
            // Connect to user message if it exists
            if (chatNodeId) {
              activityStore.connectNodes(chatNodeId, apiNodeId)
            }
            
            activityStore.updateNodeStatus(apiNodeId, 'running')
          }

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
            if (activityStore && apiNodeId) {
              activityStore.failNode(apiNodeId, `API error: ${response.status} ${response.statusText}`)
            }
            throw new Error('Failed to send message')
          }

          const data = await response.json()
          
          // Complete the API request node
          if (activityStore && apiNodeId) {
            activityStore.completeNode(apiNodeId, {
              status: response.status,
              hasWorkflow: data.workflowCreated || false
            })
          }

          // Handle workflow creation if "Create Workflow" was requested
          if (data.workflowCreated && data.workflowId && data.blockIds) {
            const { workflowId, blockIds } = data
            
            // Add message about workflow creation
            const workflowMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `I've created a new workflow for you. You can view and edit it in the workflow editor.`,
              timestamp: Date.now(),
            }
            
            // Create a workflow activity node for workflow creation
            if (activityStore && apiNodeId) {
              const workflowNodeId = activityStore.createNode({
                type: 'workflow-creation',
                label: 'Workflow Created',
                description: `Created workflow ID: ${workflowId}`,
                chatMessageId: workflowMessage.id,
                parentId: apiNodeId,
                parameters: {
                  workflowId,
                  blockIds
                }
              })
              
              // Connect the nodes
              activityStore.connectNodes(apiNodeId, workflowNodeId)
              activityStore.completeNode(workflowNodeId)
            }
            
            set((state) => ({
              messages: [
                ...state.messages,
                workflowMessage
              ],
            }))
          }

          // Add assistant's response to chat
          if (data.message) {
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: data.message,
              timestamp: Date.now(),
            }
            
            // Create a workflow activity node for the assistant response
            if (activityStore && apiNodeId) {
              const responseNodeId = activityStore.createNode({
                type: 'assistant-message',
                label: 'Assistant Reply',
                description: data.message.length > 50 ? `${data.message.substring(0, 50)}...` : data.message,
                chatMessageId: assistantMessage.id,
                parentId: apiNodeId
              })
              
              // Connect the nodes
              activityStore.connectNodes(apiNodeId, responseNodeId)
              activityStore.completeNode(responseNodeId)
            }
            
            set((state) => ({
              messages: [
                ...state.messages,
                assistantMessage
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
