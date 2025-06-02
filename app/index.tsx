import React from 'react'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useEffect, useRef, useState } from 'react'
import { Platform, Alert } from 'react-native'
import { View, StatusBar } from 'react-native'
import RootStack from './layouts/RootStack'
import { AuthProvider } from './contexts/AuthContext'

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const notificationListener = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => setExpoPushToken(token))

    // Lắng nghe khi notification được nhận trong foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification)
      })

    // Lắng nghe khi người dùng thao tác trên notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('User interacted with notification:', response)
      })

    return () => {
      // Correct way to remove notification subscriptions
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  return (
    <AuthProvider>
      <StatusBar barStyle="default" backgroundColor="#2196F3" />
      <RootStack />
      {/* <VoiceChat /> */}
    </AuthProvider>
  )
}

// Hàm đăng ký push notification và lấy token
async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null
  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission required',
        'Failed to get push token for push notification!'
      )
      return null
    }
    token = (await Notifications.getExpoPushTokenAsync()).data
    console.log('Expo Push Token:', token)
  } else {
    return null
  }

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
