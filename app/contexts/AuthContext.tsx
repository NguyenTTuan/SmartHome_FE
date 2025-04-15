import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { View, ActivityIndicator } from 'react-native'

const API_HOST = 'https://yolosmarthomeapi.ticklab.site'

type User = {
  username?: string
  token: string
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type Props = {
  children: ReactNode
}

export const AuthProvider = ({ children }: Props) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('accessToken')
      if (token) {
        setUser({ token })
      }
      setLoading(false)
    }
    checkLogin()
  }, [])

  const login = async (username: string, password: string) => {
    const res = await axios.post(`${API_HOST}/api/v1/access/login`, {
      username,
      password,
    })
    const accessToken = res.data.data.access_token
    const refreshToken = res.data.data.refresh_token
    await AsyncStorage.setItem('accessToken', accessToken)
    await AsyncStorage.setItem('refreshToken', refreshToken)
    setUser({ username, token: accessToken })
  }

  const logout = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken')
    const accessToken = await AsyncStorage.getItem('accessToken')

    if (refreshToken && accessToken) {
      await axios.post(
        `${API_HOST}/api/v1/access/logout`,
        { refreshToken },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
    }

    await AsyncStorage.removeItem('accessToken')
    await AsyncStorage.removeItem('refreshToken')
    setUser(null)
  }

  const refreshAccessToken = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken')
    if (!refreshToken) throw new Error('No refresh token available')

    const res = await axios.post(`${API_HOST}/api/v1/access/token/refresh`, {
      refreshToken,
    })
    const { accessToken } = res.data
    await AsyncStorage.setItem('accessToken', accessToken)
    setUser((prev) => (prev ? { ...prev, token: accessToken } : null))
    return accessToken
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
