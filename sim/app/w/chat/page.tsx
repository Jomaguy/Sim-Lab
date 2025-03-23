import { ChatContainer } from './components/chat-container'

export default function ChatPage() {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">AI Chat</h1>
        </div>
        <ChatContainer />
      </div>
    </div>
  )
} 