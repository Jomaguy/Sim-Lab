import { SplitPanel } from '@/components/layout/split-panel'
import { ChatContainer } from './components/chat-container'
import { MCPActivityPanel } from '@/components/mcp/activity-panel'

export default function ChatPage() {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">AI Chat</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <SplitPanel
            leftPanel={<ChatContainer />}
            rightPanel={<MCPActivityPanel />}
            defaultRatio={0.7}
            persistKey="chat-workflow-split"
          />
        </div>
      </div>
    </div>
  )
} 