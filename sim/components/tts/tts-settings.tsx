'use client'

import { useState } from 'react'
import { AlertCircle, Speaker, VolumeX } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { VoiceSelector } from './voice-selector'
import { VoiceInfo } from '@/lib/services/tts-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'

export interface TTSSettings {
  enabled: boolean
  voiceId: string
  autoplay: boolean
  volume: number
}

interface TTSSettingsProps {
  settings: TTSSettings
  onChange: (settings: TTSSettings) => void
  onFetchVoices?: () => Promise<VoiceInfo[]>
  voices?: VoiceInfo[]
  isLoadingVoices?: boolean
}

export function TTSSettings({
  settings,
  onChange,
  onFetchVoices,
  voices,
  isLoadingVoices = false
}: TTSSettingsProps) {
  const updateSettings = (update: Partial<TTSSettings>) => {
    onChange({
      ...settings,
      ...update
    })
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Speaker className="h-5 w-5" />
            Text-to-Speech Settings
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="tts-toggle" className="text-sm">Enable TTS</Label>
            <Switch
              id="tts-toggle"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>
        </div>
        <CardDescription>
          Configure ElevenLabs voice settings for text-to-speech.
        </CardDescription>
      </CardHeader>
      
      {settings.enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Voice</Label>
            <VoiceSelector
              voices={voices}
              selectedVoiceId={settings.voiceId}
              onVoiceSelect={(voiceId) => updateSettings({ voiceId })}
              onFetchVoices={onFetchVoices}
              isLoading={isLoadingVoices}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="volume-slider" className="text-sm">Volume</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <Slider
                id="volume-slider"
                value={[settings.volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([volume]) => updateSettings({ volume })}
                className="flex-1"
              />
              <Speaker className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="autoplay-toggle"
              checked={settings.autoplay}
              onCheckedChange={(autoplay) => updateSettings({ autoplay })}
            />
            <div className="flex items-center gap-1">
              <Label htmlFor="autoplay-toggle" className="text-sm">
                Autoplay Audio
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Automatically play audio when received from the AI</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
} 