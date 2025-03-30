import { MCPActivityPanel } from '@/components/mcp/activity-panel'
import { ChatContainer } from './components/chat-container'

export default function ChatPage() {
  // Clear the stored SplitPanel state from localStorage to prevent it from influencing future sessions
  if (typeof window !== 'undefined') {
    localStorage.removeItem('chat-workflow-split')
    localStorage.removeItem('chat-workflow-split-v2')
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">AI Chat</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-5 h-full">
            {/* Workflow panel - 1/5 of width */}
            <div className="col-span-1 border-r h-full overflow-auto">
              <MCPActivityPanel />
            </div>
            
            {/* Chat panel - 4/5 of width */}
            <div className="col-span-4 h-full overflow-auto">
              <ChatContainer />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 