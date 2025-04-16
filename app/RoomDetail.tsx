import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import {
  CompositeNavigationProp,
  RouteProp,
  useRoute,
} from '@react-navigation/native'
import { TabNavigatorParamList } from '../types/TabNavigatorParamList'
import { useAuth } from './contexts/AuthContext' // Assuming you have an AuthContext for user token
import { apiClient } from './contexts/AuthContext' // Assuming this is your API client

// Utility functions (you'll need to implement these or adjust based on your setup)
import { getLatestCommand, toggleDevice } from '../utils/deviceService'
import { useNavigation } from 'expo-router'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '@/types/RootStackParamList'

const API_HOST = 'https://yolosmarthomeapi.ticklab.site'

type RoomDetailRouteProp = RouteProp<TabNavigatorParamList, 'RoomDetail'>
type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<TabNavigatorParamList, 'Devices'>,
  NativeStackNavigationProp<RootStackParamList>
>

interface Device {
  id: string
  name: string
  room: string
  isOn: boolean
}

export default function RoomDetail() {
  const { user } = useAuth() // Get user token for API authentication
  const route = useRoute<RoomDetailRouteProp>()
  const navigation = useNavigation<NavigationProp>()

  const { roomName } = route.params

  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch devices for the room and their states
  useEffect(() => {
    const fetchRoomDevices = async () => {
      if (!user?.token) return

      try {
        // Fetch all devices
        const res = await apiClient.get(`${API_HOST}/api/v1/devices`, {
          headers: { Authorization: `Bearer ${user.token}` },
        })
        const allDevices = res.data.data

        // Filter devices by room
        const roomDevices = allDevices.filter(
          (device: Device) => device.room === roomName
        )

        // Get the latest command for each device
        const latestCommandsPromises = roomDevices.map((device: Device) =>
          getLatestCommand(device.id, user.token)
        )
        const latestCommands = await Promise.all(latestCommandsPromises)

        // Update devices with their current state
        const devicesWithState = roomDevices.map(
          (device: Device, index: number) => ({
            ...device,
            isOn: latestCommands[index].command === '1', // Assuming '1' is on, '0' is off
          })
        )

        setDevices(devicesWithState)
      } catch (error) {
        console.error('Error fetching room devices:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoomDevices()
  }, [roomName, user])

  // Handle device toggle
  const handleToggleDevice = async (deviceId: string, newState: boolean) => {
    if (!user?.token) return
    try {
      const newCommand = newState ? '1' : '0'
      const updatedCommand = await toggleDevice(
        deviceId,
        newCommand,
        user.token
      )

      // Update the device state in the list
      setDevices((prevDevices) =>
        prevDevices.map((device) =>
          device.id === deviceId
            ? { ...device, isOn: updatedCommand.command === '1' }
            : device
        )
      )
    } catch (error) {
      console.error('Toggle failed:', error)
    }
  }

  // Show loading indicator while fetching data
  if (loading) {
    return <ActivityIndicator style={{ marginTop: 50 }} />
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chi tiết phòng: {roomName}</Text>
      {devices.length > 0 ? (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.deviceItem}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('DeviceDetail', {
                    deviceId: item.id,
                    deviceName: item.name,
                  })
                }
              >
                <Text>{item.name}</Text>
              </TouchableOpacity>
              <Switch
                value={item.isOn}
                onValueChange={(newValue) =>
                  handleToggleDevice(item.id, newValue)
                }
              />
            </View>
          )}
        />
      ) : (
        <Text>Không có thiết bị trong phòng này.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  deviceName: {
    fontSize: 18,
  },
})
