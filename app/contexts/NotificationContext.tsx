import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiClient } from './AuthContext'
import { getSocket } from '@/utils/socket'

interface NotificationContextType {
  hasUnreadNotifications: boolean
  setHasUnreadNotifications: (hasUnread: boolean) => void
  checkUnreadNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

export const useNotificationContext = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    )
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)

  const checkUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) return

      const API_HOST = process.env.EXPO_PUBLIC_API_HOST
      const response = await apiClient.get(`${API_HOST}/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const notifications = response.data.data
      console.log(notifications)
      const hasUnread = notifications.some(
        (notification: any) => notification.status === 'unread'
      )
      setHasUnreadNotifications(hasUnread)
    } catch (error) {
      console.log('Error checking unread notifications:', error)
    }
  }

  useEffect(() => {
    // Check for unread notifications on mount
    checkUnreadNotifications()

    // Listen for socket events to update notification status
    const socket = getSocket()

    const handleNewNotification = () => {
      setHasUnreadNotifications(true)
    }

    const handleNotificationRead = () => {
      // Recheck notifications when one is read
      checkUnreadNotifications()
    }

    socket.on('notification', handleNewNotification)
    socket.on('newNotification', handleNewNotification)
    socket.on('notificationRead', handleNotificationRead)

    return () => {
      socket.off('notification', handleNewNotification)
      socket.off('newNotification', handleNewNotification)
      socket.off('notificationRead', handleNotificationRead)
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        hasUnreadNotifications,
        setHasUnreadNotifications,
        checkUnreadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
