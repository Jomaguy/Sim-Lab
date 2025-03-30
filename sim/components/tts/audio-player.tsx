'use client'

import { useEffect, useRef, useState } from 'react'
import { PauseCircle, PlayCircle, Volume2, Download, Loader2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface AudioPlayerProps {
  audioContent: string
  contentType: string
  caption?: string
  voiceName?: string
  className?: string
  autoplay?: boolean
}

export function AudioPlayer({
  audioContent,
  contentType,
  caption,
  voiceName,
  className = '',
  autoplay = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [volume, setVolume] = useState(0.7)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  
  // Format time in MM:SS format
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }
  
  // Set up audio element and event handlers
  useEffect(() => {
    const audio = new Audio(`data:${contentType};base64,${audioContent}`)
    audioRef.current = audio
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
      if (autoplay) {
        audio.play().catch(err => console.error('Failed to autoplay:', err))
        setIsPlaying(true)
      }
    }
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      audio.currentTime = 0
    }
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.volume = volume
    
    // Clean up event listeners
    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioContent, contentType, autoplay, volume])
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(err => console.error('Failed to play:', err))
    }
    
    setIsPlaying(!isPlaying)
  }
  
  // Seek to a specific time
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return
    
    const newTime = value[0]
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }
  
  // Change volume
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return
    
    const newVolume = value[0]
    audioRef.current.volume = newVolume
    setVolume(newVolume)
  }
  
  // Download audio file
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = `data:${contentType};base64,${audioContent}`
    link.download = `audio-${Date.now()}.${contentType.split('/')[1]}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  return (
    <div className={cn("flex flex-col space-y-2 bg-card p-2 rounded-md border", className)}>
      {voiceName && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Volume2 className="h-3 w-3" />
          <span>{voiceName}</span>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isLoading}
                onClick={togglePlayPause}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <PauseCircle className="h-5 w-5" />
                ) : (
                  <PlayCircle className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPlaying ? 'Pause' : 'Play'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs min-w-[40px]">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            disabled={isLoading}
            className="flex-1"
          />
          <span className="text-xs min-w-[40px]">{formatTime(duration)}</span>
        </div>
        
        <div className="relative flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Volume</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {showVolumeSlider && (
            <div 
              className="absolute bottom-full left-1/2 -translate-x-1/2 w-24 h-8 flex items-center justify-center bg-popover rounded-md border shadow-md"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Slider
                value={[volume]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
    </div>
  )
} 