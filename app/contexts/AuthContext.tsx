import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { View, ActivityIndicator, Alert } from 'react-native'
import { useNavigation } from 'expo-router'
import { RootStackParamList } from '@/types/RootStackParamList'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

const API_HOST = 'https://yolosmarthomeapi.ticklab.site'

type User = {
  username?: string
  token: string
}

type AuthContextType = {
  user: User | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<string>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type Props = {
  children: ReactNode
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

// Create an Axios instance
const apiClient = axios.create({
  baseURL: API_HOST,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const AuthProvider = ({ children }: Props) => {
  const navigation = useNavigation<NavigationProp>()
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
    console.log('accessToken', accessToken)
    console.log('refreshToken', refreshToken)
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
    const accessToken = res.data.data
    await AsyncStorage.setItem('accessToken', accessToken)
    setUser((prev) => (prev ? { ...prev, token: accessToken } : null))
    return accessToken
  }

  useEffect(() => {
    const setupInterceptor = () => {
      // Gắn token vào mỗi request
      apiClient.interceptors.request.use(
        async (config) => {
          const token = await AsyncStorage.getItem('accessToken')
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
          return config
        },
        (error) => Promise.reject(error)
      )
      // Xử lý khi token hết hạn
      apiClient.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config
          if (
            (error.response?.status === 401 && !originalRequest._retry) ||
            error.response?.status === 403
          ) {
            originalRequest._retry = true
            try {
              const newAccessToken = await refreshAccessToken()
              originalRequest.headers[
                'Authorization'
              ] = `Bearer ${newAccessToken}`
              return apiClient(originalRequest)
            } catch (refreshError) {
              Alert.alert(
                'Hết phiên đăng nhập',
                'Bạn đã hoạt động quá lâu. Vui lòng đăng nhập lại'
              )
              await logout()
            }
          }
          return Promise.reject(error)
        }
      )
    }

    setupInterceptor()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  return (
    <AuthContext.Provider
      value={{ user, login, logout, refreshAccessToken, loading }}
    >
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

export { apiClient }
