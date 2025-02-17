import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useWorkflowStore } from '../store'
import { WorkflowMetadata, WorkflowRegistry } from './types'

export const useWorkflowRegistry = create<WorkflowRegistry>()(
  devtools(
    (set, get) => ({
      workflows: {},
      activeWorkflowId: null,
      isLoading: false,
      error: null,

      setActiveWorkflow: async (id: string) => {
        const { workflows } = get()
        if (!workflows[id]) {
          set({ error: `Workflow ${id} not found` })
          return
        }

        // Save current workflow state before switching
        const currentId = get().activeWorkflowId
        if (currentId) {
          const currentState = useWorkflowStore.getState()
          localStorage.setItem(
            `workflow-${currentId}`,
            JSON.stringify({
              blocks: currentState.blocks,
              edges: currentState.edges,
              loops: currentState.loops,
              history: currentState.history,
            })
          )
        }

        // Load new workflow state
        const savedState = localStorage.getItem(`workflow-${id}`)
        if (savedState) {
          const { blocks, edges, history, loops } = JSON.parse(savedState)
          useWorkflowStore.setState({
            blocks,
            edges,
            loops,
            history: history || {
              past: [],
              present: {
                state: { blocks, edges, loops: {} },
                timestamp: Date.now(),
                action: 'Initial state',
              },
              future: [],
            },
          })
        } else {
          useWorkflowStore.setState({
            blocks: {},
            edges: [],
            loops: {},
            history: {
              past: [],
              present: {
                state: { blocks: {}, edges: [], loops: {} },
                timestamp: Date.now(),
                action: 'Initial state',
              },
              future: [],
            },
            lastSaved: Date.now(),
          })
        }

        set({ activeWorkflowId: id, error: null })
      },

      addWorkflow: (metadata: WorkflowMetadata) => {
        const uniqueName = generateUniqueName(get().workflows)
        const updatedMetadata = { ...metadata, name: uniqueName }

        set((state) => ({
          workflows: {
            ...state.workflows,
            [metadata.id]: updatedMetadata,
          },
          error: null,
        }))

        // Add starter block to new workflow
        const starterId = crypto.randomUUID()
        useWorkflowStore.setState({
          blocks: {
            [starterId]: {
              id: starterId,
              type: 'starter',
              name: 'Starter',
              position: { x: 100, y: 100 },
              subBlocks: {
                startWorkflow: {
                  id: 'startWorkflow',
                  type: 'dropdown',
                  value: 'manual',
                },
                webhookPath: {
                  id: 'webhookPath',
                  type: 'short-input',
                  value: '',
                },
                webhookSecret: {
                  id: 'webhookSecret',
                  type: 'short-input',
                  value: '',
                },
                scheduleType: {
                  id: 'scheduleType',
                  type: 'dropdown',
                  value: 'daily',
                },
                minutesInterval: {
                  id: 'minutesInterval',
                  type: 'short-input',
                  value: '',
                },
                minutesStartingAt: {
                  id: 'minutesStartingAt',
                  type: 'short-input',
                  value: '',
                },
                hourlyMinute: {
                  id: 'hourlyMinute',
                  type: 'short-input',
                  value: '',
                },
                dailyTime: {
                  id: 'dailyTime',
                  type: 'short-input',
                  value: '',
                },
                weeklyDay: {
                  id: 'weeklyDay',
                  type: 'dropdown',
                  value: 'MON',
                },
                weeklyDayTime: {
                  id: 'weeklyDayTime',
                  type: 'short-input',
                  value: '',
                },
                monthlyDay: {
                  id: 'monthlyDay',
                  type: 'short-input',
                  value: '',
                },
                monthlyTime: {
                  id: 'monthlyTime',
                  type: 'short-input',
                  value: '',
                },
                cronExpression: {
                  id: 'cronExpression',
                  type: 'short-input',
                  value: '',
                },
                timezone: {
                  id: 'timezone',
                  type: 'dropdown',
                  value: 'UTC',
                },
              },
              outputs: {
                response: {
                  type: {
                    result: 'any',
                    stdout: 'string',
                    executionTime: 'number',
                  },
                },
              },
              enabled: true,
              horizontalHandles: true,
              isWide: false,
              height: 0,
            },
          },
          edges: [],
          loops: {},
          history: {
            past: [],
            present: {
              state: {
                blocks: {
                  [starterId]: {
                    id: starterId,
                    type: 'starter',
                    name: 'Starter',
                    position: { x: 100, y: 100 },
                    subBlocks: {
                      startWorkflow: {
                        id: 'startWorkflow',
                        type: 'dropdown',
                        value: 'manual',
                      },
                      webhookPath: {
                        id: 'webhookPath',
                        type: 'short-input',
                        value: '',
                      },
                      webhookSecret: {
                        id: 'webhookSecret',
                        type: 'short-input',
                        value: '',
                      },
                      scheduleType: {
                        id: 'scheduleType',
                        type: 'dropdown',
                        value: 'daily',
                      },
                      minutesInterval: {
                        id: 'minutesInterval',
                        type: 'short-input',
                        value: '',
                      },
                      minutesStartingAt: {
                        id: 'minutesStartingAt',
                        type: 'short-input',
                        value: '',
                      },
                      hourlyMinute: {
                        id: 'hourlyMinute',
                        type: 'short-input',
                        value: '',
                      },
                      dailyTime: {
                        id: 'dailyTime',
                        type: 'short-input',
                        value: '',
                      },
                      weeklyDay: {
                        id: 'weeklyDay',
                        type: 'dropdown',
                        value: 'MON',
                      },
                      weeklyDayTime: {
                        id: 'weeklyDayTime',
                        type: 'short-input',
                        value: '',
                      },
                      monthlyDay: {
                        id: 'monthlyDay',
                        type: 'short-input',
                        value: '',
                      },
                      monthlyTime: {
                        id: 'monthlyTime',
                        type: 'short-input',
                        value: '',
                      },
                      cronExpression: {
                        id: 'cronExpression',
                        type: 'short-input',
                        value: '',
                      },
                      timezone: {
                        id: 'timezone',
                        type: 'dropdown',
                        value: 'UTC',
                      },
                    },
                    outputs: {
                      response: {
                        type: {
                          result: 'any',
                          stdout: 'string',
                          executionTime: 'number',
                        },
                      },
                    },
                    enabled: true,
                    horizontalHandles: true,
                    isWide: false,
                    height: 0,
                  },
                },
                edges: [],
                loops: {},
              },
              timestamp: Date.now(),
              action: 'Initial state',
            },
            future: [],
          },
          lastSaved: Date.now(),
        })

        // Save workflow list to localStorage
        const workflows = get().workflows
        localStorage.setItem('workflow-registry', JSON.stringify(workflows))

        // Save initial workflow state to localStorage
        localStorage.setItem(`workflow-${metadata.id}`, JSON.stringify(useWorkflowStore.getState()))
      },

      removeWorkflow: (id: string) => {
        set((state) => {
          const newWorkflows = { ...state.workflows }
          delete newWorkflows[id]

          // Remove workflow state from localStorage
          localStorage.removeItem(`workflow-${id}`)

          // Update registry in localStorage
          localStorage.setItem('workflow-registry', JSON.stringify(newWorkflows))

          // If deleting active workflow, switch to another one
          let newActiveWorkflowId = state.activeWorkflowId
          if (state.activeWorkflowId === id) {
            const remainingIds = Object.keys(newWorkflows)
            // Switch to first available workflow
            newActiveWorkflowId = remainingIds[0]
            const savedState = localStorage.getItem(`workflow-${newActiveWorkflowId}`)
            if (savedState) {
              const { blocks, edges, history, loops } = JSON.parse(savedState)
              useWorkflowStore.setState({
                blocks,
                edges,
                loops,
                history: history || {
                  past: [],
                  present: {
                    state: { blocks, edges, loops },
                    timestamp: Date.now(),
                    action: 'Initial state',
                  },
                  future: [],
                },
              })
            } else {
              useWorkflowStore.setState({
                blocks: {},
                edges: [],
                loops: {},
                history: {
                  past: [],
                  present: {
                    state: { blocks: {}, edges: [], loops: {} },
                    timestamp: Date.now(),
                    action: 'Initial state',
                  },
                  future: [],
                },
                lastSaved: Date.now(),
              })
            }
          }

          return {
            workflows: newWorkflows,
            activeWorkflowId: newActiveWorkflowId,
            error: null,
          }
        })
      },

      updateWorkflow: (id: string, metadata: Partial<WorkflowMetadata>) => {
        set((state) => {
          const workflow = state.workflows[id]
          if (!workflow) return state

          const updatedWorkflows = {
            ...state.workflows,
            [id]: {
              ...workflow,
              ...metadata,
              lastModified: new Date(),
            },
          }

          // Update registry in localStorage
          localStorage.setItem('workflow-registry', JSON.stringify(updatedWorkflows))

          return {
            workflows: updatedWorkflows,
            error: null,
          }
        })
      },
    }),
    { name: 'workflow-registry' }
  )
)

const generateUniqueName = (existingWorkflows: Record<string, WorkflowMetadata>): string => {
  // Extract numbers from existing workflow names using regex
  const numbers = Object.values(existingWorkflows)
    .map((w) => {
      const match = w.name.match(/Workflow (\d+)/)
      return match ? parseInt(match[1]) : 0
    })
    .filter((n) => n > 0)

  if (numbers.length === 0) {
    return 'Workflow 1'
  }

  // Find the maximum number and add 1
  const nextNumber = Math.max(...numbers) + 1
  return `Workflow ${nextNumber}`
}

// Initialize registry from localStorage
const initializeRegistry = () => {
  const savedRegistry = localStorage.getItem('workflow-registry')
  if (savedRegistry) {
    const workflows = JSON.parse(savedRegistry)
    useWorkflowRegistry.setState({ workflows })
  }

  // Add event listeners for page unload
  window.addEventListener('beforeunload', () => {
    const currentId = useWorkflowRegistry.getState().activeWorkflowId
    if (currentId) {
      const currentState = useWorkflowStore.getState()
      localStorage.setItem(
        `workflow-${currentId}`,
        JSON.stringify({
          blocks: currentState.blocks,
          edges: currentState.edges,
          loops: currentState.loops,
          history: currentState.history,
        })
      )
    }
  })
}

if (typeof window !== 'undefined') {
  initializeRegistry()
}
