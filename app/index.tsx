import React from 'react'
import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'
import { Platform, Alert, Button } from 'react-native'
import { StatusBar } from 'react-native'
import RootStack from './layouts/RootStack'
import { AuthProvider, apiClient } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { getSocket } from '@/utils/socket'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Notification } from './Notifications'
import * as Sentry from '@sentry/react-native'

const API_HOST = process.env.EXPO_PUBLIC_API_HOST
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,
})

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const App = () => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [isSocketConnected, setIsSocketConnected] = useState(false)

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => setExpoPushToken(token))

    // Listen for notifications received while app is in foreground
    const notificationReceivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Push notification received in foreground:', notification)
        const { title, body } = notification.request.content
        if (title && body) {
          Alert.alert(title, body)
        }
      })

    // Listen for user interactions with notifications
    const notificationResponseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('User interacted with notification:', response)
      })

    // Socket setup and notification handling
    const socket = getSocket()

    const handleSocketNotification = (data: any) => {
      console.log('🔔 Socket notification received:', data)
      if (data.header && data.description) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: data.header,
            body: data.description,
            data: { notificationId: data.id },
          },
          trigger: null, // Show immediately
        })
      }
    }

    const handleSocketConnect = () => {
      console.log('🔗 Socket connected - stopping polling')
      setIsSocketConnected(true)
    }

    const handleSocketDisconnect = () => {
      console.log('❌ Socket disconnected - starting polling')
      setIsSocketConnected(false)
    }

    // Socket event listeners
    socket.on('connect', handleSocketConnect)
    socket.on('disconnect', handleSocketDisconnect)
    socket.on('notification', handleSocketNotification)
    socket.on('newNotification', handleSocketNotification)

    // Set initial connection status
    setIsSocketConnected(socket.connected)

    // Polling function - only runs when socket is disconnected
    const pollForNotifications = async () => {
      if (isSocketConnected) {
        console.log('⏭️ Skipping poll - socket is connected')
        return
      }

      try {
        const token = await AsyncStorage.getItem('accessToken')
        if (!token) throw new Error('No access token found')

        console.log('📡 Polling for notifications (socket disconnected)')
        const response = await apiClient.get(
          `${API_HOST}/api/v1/notifications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const notifications = response.data.data
        notifications.sort(
          (a: Notification, b: Notification) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        if (notifications && notifications.length > 0) {
          const latest = notifications[0]
          const lastNotificationId = await AsyncStorage.getItem(
            'lastNotificationId'
          )

          if (latest.id !== lastNotificationId && latest.status === 'unread') {
            await AsyncStorage.setItem('lastNotificationId', latest.id)

            await Notifications.scheduleNotificationAsync({
              content: {
                title: latest.header,
                body: latest.description,
                data: { notificationId: latest.id },
              },
              trigger: null,
            })
            console.log('📲 Local push sent from poll:', latest)
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Poll every 30 seconds (but only when socket is disconnected)
    const pollInterval = setInterval(pollForNotifications, 30000)

    return () => {
      clearInterval(pollInterval)
      notificationReceivedSubscription.remove()
      notificationResponseSubscription.remove()
      socket.off('connect', handleSocketConnect)
      socket.off('disconnect', handleSocketDisconnect)
      socket.off('notification', handleSocketNotification)
      socket.off('newNotification', handleSocketNotification)
    }
  }, [isSocketConnected]) // Re-run effect when socket connection status changes

  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar barStyle="default" backgroundColor="#2196F3" />

        <RootStack />
      </NotificationProvider>
    </AuthProvider>
  )
}

// Function to register for push notifications and get token
async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    Alert.alert(
      'Cần cấp quyền',
      'Không nhận được mã thông báo đẩy cho thông báo đẩy!'
    )
    return null
  }
  token = (await Notifications.getExpoPushTokenAsync()).data
  console.log('Expo Push Token:', token)

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  return token
}

export default Sentry.wrap(App)
