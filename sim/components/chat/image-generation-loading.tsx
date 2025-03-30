'use client'

import { Loader2 } from 'lucide-react'

interface ImageGenerationLoadingProps {
  prompt: string
}

export function ImageGenerationLoading({ prompt }: ImageGenerationLoadingProps) {
  return (
    <div className="mt-2 mb-4 p-4 border rounded-lg bg-muted/30 max-w-[300px]">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">Generating image...</span>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground">
        <span className="italic">"{prompt}"</span>
      </div>
      
      <div className="mt-3 space-y-2">
        <div className="h-2 bg-muted animate-pulse rounded-full"></div>
        <div className="h-2 bg-muted animate-pulse rounded-full w-4/5"></div>
        <div className="h-2 bg-muted animate-pulse rounded-full w-2/3"></div>
      </div>
    </div>
  )
} 