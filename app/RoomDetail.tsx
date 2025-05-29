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
import {
  getAllLog,
  getLatestCommand,
  toggleDevice,
} from '../utils/deviceService'
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
  id: number
  name: string
  type?: string
  room: string
  isOn: boolean
  speed?: number // cho quạt
  latestSensorValue?: string // cho sensor
  created_at?: string
  updated_at?: string
}

type DeviceCommand = {
  id: string
  device_id: string
  command?: string
  value?: string
  created_at: string
  updated_at: string
}

const filterAndSortHistory = (commands: DeviceCommand[]): DeviceCommand[] => {
  const now = new Date()
  const _24hoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  return commands
    .filter((item) => {
      const createdAt = new Date(item.created_at)
      const isRecent = createdAt >= _24hoursAgo
      const isNumberValue =
        item.value !== undefined && !isNaN(parseFloat(item.value))
      const isNumberCommand =
        item.command !== undefined && !isNaN(parseFloat(item.command))

      return isRecent && (isNumberValue || isNumberCommand)
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
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
        const latestCommandsPromises = roomDevices.map(
          async (device: Device) => {
            const isSensor =
              device.name.toLowerCase().includes('sensor') ||
              device.name.toLowerCase().includes('thermostat')
            try {
              if (isSensor) {
                const res = await getAllLog(device.id.toString(), user.token)
                return filterAndSortHistory(res)[0]
              }
              return await getLatestCommand(device.id.toString(), user.token)
            } catch (error) {
              return null // trả về giá trị mặc định
            }
          }
        )
        const latestCommands = await Promise.all(latestCommandsPromises)

        // Update devices with their current state
        const devicesWithState = roomDevices.map(
          (device: Device, index: number) => {
            const latest = latestCommands[index]
            const isFan = device.name.toLowerCase().includes('fan')
            const isSensor =
              device.name.toLowerCase().includes('sensor') ||
              device.name.toLowerCase().includes('thermostat')

            return {
              ...device,
              isOn: latest?.command === '1' ?? false,
              speed: isFan ? parseInt(latest?.command || '0') : undefined,
              latestSensorValue: isSensor ? latest?.value : undefined,
            }
          }
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
          device.id.toString() === deviceId
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
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const isFan = item.name.toLowerCase().includes('fan')
            const isSensor =
              item.name.toLowerCase().includes('sensor') ||
              item.name.toLowerCase().includes('thermostat')
            return (
              <View style={styles.deviceItem}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('DeviceDetail', {
                      deviceId: item.id.toString(),
                      deviceName: item.name,
                    })
                  }
                >
                  <Text>{item.name}</Text>
                </TouchableOpacity>
                {isFan && (
                  <Text style={{ color: '#007AFF', marginTop: 4 }}>
                    Tốc độ: {item.speed ?? 0}%
                  </Text>
                )}
                {isSensor && (
                  <Text style={{ color: '#FF9500', marginTop: 4 }}>
                    Giá trị: {item.latestSensorValue ?? '--'}
                  </Text>
                )}
                {!isSensor && !isFan && (
                  <Switch
                    value={item.isOn}
                    onValueChange={(newValue) =>
                      handleToggleDevice(item.id.toString(), newValue)
                    }
                  />
                )}
              </View>
            )
          }}
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
