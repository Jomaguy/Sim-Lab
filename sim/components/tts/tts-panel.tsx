'use client'

import { useState, useEffect } from 'react'
import { TextToSpeechService, VoiceInfo } from '@/lib/services/tts-service'
import { TTSSettings } from './tts-settings'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

interface TTSPanelProps {
  storageKey?: string
  onSettingsChange?: (settings: TTSSettings) => void
}

export function TTSPanel({
  storageKey = 'tts-settings',
  onSettingsChange
}: TTSPanelProps) {
  // Initialize with default settings
  const defaultSettings = TextToSpeechService.getDefaultSettings() as TTSSettings
  
  // Get settings from local storage or use defaults
  const [storedSettings, setStoredSettings] = useLocalStorage<TTSSettings>(
    storageKey,
    defaultSettings
  )
  
  const [settings, setSettings] = useState<TTSSettings>(storedSettings)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  
  // Load voices
  useEffect(() => {
    if (settings.enabled && voices.length === 0) {
      fetchVoices()
    }
  }, [settings.enabled, voices.length])
  
  // Update stored settings and notify parent when settings change
  useEffect(() => {
    setStoredSettings(settings)
    
    if (onSettingsChange) {
      onSettingsChange(settings)
    }
  }, [settings, setStoredSettings, onSettingsChange])
  
  // Fetch voices from service
  const fetchVoices = async (): Promise<VoiceInfo[]> => {
    setIsLoadingVoices(true)
    
    try {
      const voiceList = await TextToSpeechService.getVoices()
      setVoices(voiceList)
      
      // If no voice is selected and we get voices, select the first one
      if (!settings.voiceId && voiceList.length > 0) {
        handleSettingsChange({
          voiceId: voiceList[0].voiceId
        })
      }
      
      return voiceList
    } catch (error) {
      console.error('Failed to fetch voices:', error)
      return []
    } finally {
      setIsLoadingVoices(false)
    }
  }
  
  // Handle settings changes
  const handleSettingsChange = (newSettings: Partial<TTSSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }))
  }
  
  return (
    <TTSSettings
      settings={settings}
      onChange={handleSettingsChange}
      voices={voices}
      onFetchVoices={fetchVoices}
      isLoadingVoices={isLoadingVoices}
    />
  )
} 