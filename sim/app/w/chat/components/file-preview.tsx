'use client'

import Image from 'next/image'
import { FileIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileAttachment } from '@/stores/chat/types'
import { getFileCategory, getFileExtension } from '@/lib/utils/file-validation'

// File type to icon mapping
const fileIcons = {
  pdf: () => <FileIcon className="h-8 w-8 text-red-500" />,
  docx: () => <FileIcon className="h-8 w-8 text-blue-500" />,
  txt: () => <FileIcon className="h-8 w-8 text-gray-500" />,
  csv: () => <FileIcon className="h-8 w-8 text-green-500" />,
  json: () => <FileIcon className="h-8 w-8 text-amber-500" />,
  xlsx: () => <FileIcon className="h-8 w-8 text-emerald-500" />,
  js: () => <FileIcon className="h-8 w-8 text-yellow-500" />,
  ts: () => <FileIcon className="h-8 w-8 text-blue-500" />,
  py: () => <FileIcon className="h-8 w-8 text-blue-800" />,
  html: () => <FileIcon className="h-8 w-8 text-orange-500" />,
  css: () => <FileIcon className="h-8 w-8 text-blue-400" />,
  default: () => <FileIcon className="h-8 w-8 text-gray-500" />
}

interface FilePreviewProps {
  attachment: FileAttachment
  onRemove?: () => void
  showRemove?: boolean
  className?: string
}

export function FilePreview({ 
  attachment, 
  onRemove, 
  showRemove = false,
  className 
}: FilePreviewProps) {
  const { name, type, size, data } = attachment
  const extension = getFileExtension(name)
  const category = type ? 
    type.startsWith('image/') ? 'image' : 
    Object.entries(fileIcons).find(([key]) => extension === key) ? extension : 
    'default' 
    : 'default'
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Render icon based on file type
  const renderIcon = () => {
    const IconComponent = fileIcons[category as keyof typeof fileIcons] || fileIcons.default
    return <IconComponent />
  }

  return (
    <div className={cn("border rounded-md overflow-hidden flex flex-col", className)}>
      {/* Show image preview for images */}
      {category === 'image' ? (
        <div className="relative aspect-video w-full bg-muted/30">
          <Image
            src={data}
            alt={name}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className="p-4 flex items-center justify-center aspect-video bg-muted/10">
          {renderIcon()}
        </div>
      )}
      
      {/* File info */}
      <div className="p-2 bg-muted/30 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-xs text-muted-foreground">{formatFileSize(size)}</div>
        </div>
        
        {/* Remove button */}
        {showRemove && onRemove && (
          <button 
            onClick={onRemove}
            className="p-1 hover:bg-muted rounded-sm"
            title="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

interface FilePreviewListProps {
  attachments: FileAttachment[]
  onRemove?: (id: string) => void
  showRemove?: boolean
  layout?: 'grid' | 'list'
  className?: string
}

export function FilePreviewList({
  attachments,
  onRemove,
  showRemove = false,
  layout = 'grid',
  className
}: FilePreviewListProps) {
  if (!attachments.length) return null

  return (
    <div 
      className={cn(
        layout === 'grid' 
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2" 
          : "flex flex-col space-y-2",
        className
      )}
    >
      {attachments.map((attachment) => (
        <FilePreview
          key={attachment.id}
          attachment={attachment}
          showRemove={showRemove}
          onRemove={onRemove ? () => onRemove(attachment.id) : undefined}
        />
      ))}
    </div>
  )
} 