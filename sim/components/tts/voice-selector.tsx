'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { VoiceInfo, TextToSpeechService } from '@/lib/services/tts-service'
import { Skeleton } from '@/components/ui/skeleton'

interface VoiceSelectorProps {
  voices?: VoiceInfo[]
  selectedVoiceId?: string
  onVoiceSelect: (voiceId: string) => void
  onFetchVoices?: () => Promise<VoiceInfo[]>
  isLoading?: boolean
  className?: string
}

export function VoiceSelector({
  voices: initialVoices,
  selectedVoiceId,
  onVoiceSelect,
  onFetchVoices,
  isLoading: initialLoading = false,
  className = '',
}: VoiceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [voices, setVoices] = useState<VoiceInfo[]>(initialVoices || [])
  const [isLoading, setIsLoading] = useState(initialLoading)
  
  // Default fetch voices function if not provided
  const defaultFetchVoices = async () => {
    return TextToSpeechService.getVoices()
  }
  
  // Fetch voices if not provided
  useEffect(() => {
    if (initialVoices) {
      setVoices(initialVoices)
      return
    }
    
    if (open && voices.length === 0) {
      setIsLoading(true)
      
      const fetchVoicesFn = onFetchVoices || defaultFetchVoices
      
      fetchVoicesFn()
        .then(fetchedVoices => {
          setVoices(fetchedVoices)
        })
        .catch(error => {
          console.error('Failed to fetch voices:', error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [open, initialVoices, onFetchVoices, voices.length])
  
  // Get the currently selected voice
  const selectedVoice = voices.find(voice => voice.voiceId === selectedVoiceId)
  
  // Group voices by category
  const groupedVoices = voices.reduce((acc, voice) => {
    const category = voice.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(voice)
    return acc
  }, {} as Record<string, VoiceInfo[]>)
  
  // Sort categories with "premade" first
  const sortedCategories = Object.keys(groupedVoices).sort((a, b) => {
    if (a === 'premade') return -1
    if (b === 'premade') return 1
    return a.localeCompare(b)
  })
  
  // Format category name for display
  const formatCategoryName = (category: string) => {
    return category === 'premade' ? 'Premade Voices' : category
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : selectedVoice ? (
            selectedVoice.name
          ) : (
            "Select voice..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search voices..." />
          <CommandEmpty>No voice found.</CommandEmpty>
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            sortedCategories.map(category => (
              <CommandGroup key={category} heading={formatCategoryName(category)}>
                {groupedVoices[category].map(voice => (
                  <CommandItem
                    key={voice.voiceId}
                    value={voice.voiceId}
                    onSelect={() => {
                      onVoiceSelect(voice.voiceId)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedVoiceId === voice.voiceId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {voice.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 