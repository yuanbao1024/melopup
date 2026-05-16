import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { PetMood, AppView, Song, AIAnalysis, AIRecommendation, PetAccessory, UserProfile } from '../types'
import { userProfile as userProfileService } from '../services/userProfile'
import { getApiConfig } from '../services/aiService'

interface AppState {
  view: AppView
  petMood: PetMood
  currentSong: Song | null
  playlist: Song[]
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  analysis: AIAnalysis | null
  recommendations: AIRecommendation[]
  isAnalyzing: boolean
  isRecommending: boolean
  analyserData: Uint8Array | null
  apiConfigured: boolean
  accessories: PetAccessory[]
  userProfile: UserProfile
}

type AppAction =
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'SET_PET_MOOD'; payload: PetMood }
  | { type: 'SET_CURRENT_SONG'; payload: Song | null }
  | { type: 'SET_PLAYLIST'; payload: Song[] }
  | { type: 'SET_IS_PLAYING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_ANALYSIS'; payload: AIAnalysis | null }
  | { type: 'SET_RECOMMENDATIONS'; payload: AIRecommendation[] }
  | { type: 'SET_IS_ANALYZING'; payload: boolean }
  | { type: 'SET_IS_RECOMMENDING'; payload: boolean }
  | { type: 'SET_ANALYSER_DATA'; payload: Uint8Array }
  | { type: 'SET_API_CONFIGURED'; payload: boolean }
  | { type: 'TOGGLE_ACCESSORY'; payload: PetAccessory }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile }

const initialState: AppState = {
  view: 'pet',
  petMood: 'idle',
  currentSong: null,
  playlist: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  analysis: null,
  recommendations: [],
  isAnalyzing: false,
  isRecommending: false,
  analyserData: null,
  apiConfigured: !!getApiConfig().apiKey,
  accessories: [],
  userProfile: userProfileService.getProfile(),
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload }
    case 'SET_PET_MOOD':
      return { ...state, petMood: action.payload }
    case 'SET_CURRENT_SONG':
      return { ...state, currentSong: action.payload }
    case 'SET_PLAYLIST':
      return { ...state, playlist: action.payload }
    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.payload }
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload }
    case 'SET_DURATION':
      return { ...state, duration: action.payload }
    case 'SET_VOLUME':
      return { ...state, volume: action.payload }
    case 'SET_ANALYSIS':
      return { ...state, analysis: action.payload }
    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload }
    case 'SET_IS_ANALYZING':
      return { ...state, isAnalyzing: action.payload }
    case 'SET_IS_RECOMMENDING':
      return { ...state, isRecommending: action.payload }
    case 'SET_ANALYSER_DATA':
      return { ...state, analyserData: action.payload }
    case 'SET_API_CONFIGURED':
      return { ...state, apiConfigured: action.payload }
    case 'TOGGLE_ACCESSORY': {
      const exists = state.accessories.includes(action.payload)
      return {
        ...state,
        accessories: exists
          ? state.accessories.filter((a) => a !== action.payload)
          : [...state.accessories, action.payload],
      }
    }
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAppState must be used within AppProvider')
  return context
}

export const useApp = useAppState
