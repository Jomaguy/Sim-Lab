'use client'

import { useState, useEffect } from 'react'
import { WhisperService } from '@/lib/services/whisper-service'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mic } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export interface SpeechSettingsProps {
  storageKey?: string
  onSettingsChange?: (settings: any) => void
}

export function SpeechSettings({
  storageKey = 'speech-input-settings',
  onSettingsChange
}: SpeechSettingsProps) {
  // Get default settings
  const defaultSettings = WhisperService.getDefaultSettings()
  
  // Get settings from local storage or use defaults
  const [settings, setSettings] = useLocalStorage(
    storageKey,
    defaultSettings
  )
  
  // Update stored settings and notify parent when settings change
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(settings)
    }
  }, [settings, onSettingsChange])
  
  // Language options
  const languages = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ru', label: 'Russian' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' }
  ]
  
  // Model options
  const models = [
    { value: 'tiny', label: 'Tiny (fastest, less accurate)' },
    { value: 'base', label: 'Base (balanced)' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium (accurate)' },
    { value: 'large', label: 'Large (most accurate, slower)' }
  ]
  
  // Handle settings changes
  const updateSettings = (newSettings: any) => {
    setSettings((prev: any) => ({
      ...prev,
      ...newSettings
    }))
  }
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Speech-to-Text Settings
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label htmlFor="speech-toggle" className="text-sm">Enable Speech</Label>
            <Switch
              id="speech-toggle"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>
        </div>
        <CardDescription>
          Configure OpenAI Whisper settings for speech recognition.
        </CardDescription>
      </CardHeader>
      
      {settings.enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language-select">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(language) => updateSettings({ language })}
              >
                <SelectTrigger id="language-select">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select the language for better transcription accuracy or use "Auto-detect".
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model-select">Model</Label>
              <Select
                value={settings.model}
                onValueChange={(model) => updateSettings({ model })}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Smaller models are faster but less accurate. Larger models are more accurate but slower.
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-send" className="text-sm">Auto-send after transcription</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically send messages after speech is transcribed
                  </p>
                </div>
                <Switch
                  id="auto-send"
                  checked={settings.autoSend}
                  onCheckedChange={(autoSend) => updateSettings({ autoSend })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="continuous-listening" className="text-sm">Continuous listening mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically start listening again after processing
                  </p>
                </div>
                <Switch
                  id="continuous-listening"
                  checked={settings.continuousListening}
                  onCheckedChange={(continuousListening) => updateSettings({ continuousListening })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
} 