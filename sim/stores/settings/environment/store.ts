import { create } from 'zustand'
import { createLogger } from '@/lib/logs/console-logger'
import { API_ENDPOINTS } from '../../constants'
import { EnvironmentStore, EnvironmentVariable } from './types'

const logger = createLogger('Environment Store')

export const useEnvironmentStore = create<EnvironmentStore>()((set, get) => ({
  variables: {},
  isLoading: false,
  error: null,

  // Load environment variables from DB and local env
  loadEnvironmentVariables: async () => {
    try {
      set({ isLoading: true, error: null })

      // First try to load from database
      const response = await fetch(API_ENDPOINTS.ENVIRONMENT)
      let dbVariables: Record<string, EnvironmentVariable> = {}

      if (response.ok) {
        const { data } = await response.json()
        if (data && typeof data === 'object') {
          dbVariables = data
        }
      }

      // Merge with local environment variables
      const localVariables: Record<string, EnvironmentVariable> = {}
      if (typeof window !== 'undefined') {
        // Access environment variables from window._env
        const env = (window as any)._env || {}
        Object.entries(env).forEach(([key, value]) => {
          if (typeof value === 'string') {
            localVariables[key] = { key, value }
          }
        })
      }

      // Merge variables, with local variables taking precedence
      const mergedVariables = {
        ...dbVariables,
        ...localVariables,
      }

      set({
        variables: mergedVariables,
        isLoading: false,
      })
    } catch (error) {
      logger.error('Error loading environment variables:', { error })
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },

  // Save environment variables to DB
  saveEnvironmentVariables: async (variables: Record<string, string>) => {
    try {
      set({ isLoading: true, error: null })

      // Transform variables to the format expected by the store
      const transformedVariables = Object.entries(variables).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: { key, value },
        }),
        {}
      )

      // Update local state immediately (optimistic update)
      set({ variables: transformedVariables })

      // Send to DB
      const response = await fetch(API_ENDPOINTS.ENVIRONMENT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables: Object.entries(transformedVariables).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: (value as EnvironmentVariable).value,
            }),
            {}
          ),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save environment variables: ${response.statusText}`)
      }

      set({ isLoading: false })
    } catch (error) {
      logger.error('Error saving environment variables:', { error })
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })

      // Reload from DB to ensure consistency
      get().loadEnvironmentVariables()
    }
  },

  // Legacy method updated to use the new saveEnvironmentVariables
  setVariables: (variables: Record<string, string>) => {
    get().saveEnvironmentVariables(variables)
  },

  getVariable: (key: string): string | undefined => {
    return get().variables[key]?.value
  },

  getAllVariables: (): Record<string, EnvironmentVariable> => {
    return get().variables
  },
}))
