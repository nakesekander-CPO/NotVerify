import { createContext, useContext, useReducer, useCallback } from 'react'

const ContentCreationContext = createContext(null)

export function useContentCreation() {
  const ctx = useContext(ContentCreationContext)
  if (!ctx) throw new Error('useContentCreation must be used within ContentCreationProvider')
  return ctx
}

const initialState = {
  savedContent: [],
  learningEvents: [],
  activeSession: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SAVE_CONTENT':
      return { ...state, savedContent: [action.payload, ...state.savedContent] }
    case 'ADD_LEARNING_EVENT':
      return { ...state, learningEvents: [action.payload, ...state.learningEvents] }
    case 'SET_ACTIVE_SESSION':
      return { ...state, activeSession: action.payload }
    case 'CLEAR_ACTIVE_SESSION':
      return { ...state, activeSession: null }
    default:
      return state
  }
}

function formatDate() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  return `${months[now.getMonth()]} ${now.getDate()}`
}

export default function ContentCreationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const saveContent = useCallback((contentData) => {
    const item = {
      id: `content-${Date.now()}`,
      ...contentData,
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'SAVE_CONTENT', payload: item })
    return item
  }, [])

  const addLearningEvent = useCallback((description, color = '#0088FF', type = 'creation') => {
    dispatch({
      type: 'ADD_LEARNING_EVENT',
      payload: { date: formatDate(), description, color, type },
    })
  }, [])

  const setActiveSession = useCallback((session) => {
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: session })
  }, [])

  const clearActiveSession = useCallback(() => {
    dispatch({ type: 'CLEAR_ACTIVE_SESSION' })
  }, [])

  return (
    <ContentCreationContext.Provider value={{
      savedContent: state.savedContent,
      learningEvents: state.learningEvents,
      activeSession: state.activeSession,
      saveContent,
      addLearningEvent,
      setActiveSession,
      clearActiveSession,
    }}>
      {children}
    </ContentCreationContext.Provider>
  )
}
