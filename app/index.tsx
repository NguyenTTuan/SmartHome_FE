import React from 'react'
import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'
import { Platform, Alert } from 'react-native'
import { StatusBar } from 'react-native'
import RootStack from './layouts/RootStack'
import { AuthProvider, apiClient } from './contexts/AuthContext'
import { getSocket } from '@/utils/socket'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Notification } from './Notifications'

const API_HOST = process.env.EXPO_PUBLIC_API_HOST

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)

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

    // Listen for socket notifications and trigger push notifications
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

    socket.on('notification', handleSocketNotification)
    socket.on('newNotification', handleSocketNotification)

    // Poll every 30 seconds
    const pollInterval = setInterval(async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken')

        if (!token) throw new Error('No access token found')

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
        console.log('Polling error:', error)
      }
    }, 30000)

    return () => {
      clearInterval(pollInterval)
      notificationReceivedSubscription.remove()
      notificationResponseSubscription.remove()
      socket.off('notification', handleSocketNotification)
      socket.off('newNotification', handleSocketNotification)
    }
  }, [])

  return (
    <AuthProvider>
      <StatusBar barStyle="default" backgroundColor="#2196F3" />
      <RootStack />
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
