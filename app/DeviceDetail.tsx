import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Button,
  Switch,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import {
  getLatestCommand,
  toggleDevice,
  getDeviceCommandHistory,
} from '../utils/deviceService'
import { useAuth } from './contexts/AuthContext'
import { useNavigation } from 'expo-router'
import { TabNavigatorParamList } from '@/types/TabNavigatorParamList'

type DeviceDetailRouteProp = RouteProp<TabNavigatorParamList, 'DeviceDetail'>

type DeviceCommand = {
  id: string
  device_id: string
  command: string
  created_at: string
  updated_at: string
}

const DeviceDetail = () => {
  const route = useRoute<DeviceDetailRouteProp>()
  const navigation = useNavigation()
  const { user } = useAuth()
  const { deviceId, deviceName } = route.params

  const [isLoading, setIsLoading] = useState(true)
  const [isOn, setIsOn] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  const fetchData = async () => {
    if (!user?.token) return

    try {
      const latest = await getLatestCommand(deviceId, user.token)
      setIsOn(latest.command === '1')
      const recentHistory: DeviceCommand[] = await getDeviceCommandHistory(
        deviceId,
        user?.token
      )
      // Tính mốc 30 ngày trước
      const now = new Date()
      const _24hoursAgo = new Date(now.setDate(now.getDate() - 1))
      const filteredAndSorted = recentHistory
        .filter(
          (item: DeviceCommand) => new Date(item.created_at) >= _24hoursAgo
        )
        .sort(
          (a: DeviceCommand, b: DeviceCommand) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      setHistory(filteredAndSorted)
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thiết bị:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!user?.token) return

    try {
      const updated = await toggleDevice(deviceId, isOn ? '0' : '1', user.token)
      setIsOn(updated.command === '1')
      const recentHistory = await getDeviceCommandHistory(deviceId, user.token)
      const now = new Date()
      const _24hoursAgo = new Date(now.setDate(now.getDate() - 1))
      const filteredAndSorted = recentHistory
        .filter(
          (item: DeviceCommand) => new Date(item.created_at) >= _24hoursAgo
        )
        .sort(
          (a: DeviceCommand, b: DeviceCommand) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      setHistory(filteredAndSorted)
    } catch (err) {
      console.error('Toggle thất bại:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (isLoading) {
    return <ActivityIndicator style={{ marginTop: 50 }} />
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{deviceName}</Text>
      {/* <Text>ID: {deviceId}</Text> */}

      <View style={styles.statusRow}>
        <Text style={{ marginRight: 10 }}>
          Trạng thái: {isOn ? 'Bật' : 'Tắt'}
        </Text>
        <Switch value={isOn} onValueChange={handleToggle} />
      </View>

      <Text style={styles.historyTitle}>Lịch sử sử dụng (trong 24 giờ):</Text>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>
            {item.command === '1' ? 'Bật' : 'Tắt'} lúc{' '}
            {new Date(item.created_at).toLocaleString()}
          </Text>
        )}
      />
      <Button title="Quay lại" onPress={() => navigation.goBack()} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  historyTitle: {
    marginTop: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
})

export default DeviceDetail
