import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'
import { TabNavigatorParamList } from '@/types/TabNavigatorParamList'
import { apiClient, useAuth } from './contexts/AuthContext'

import {
  getAllLog,
  getLatestCommand,
  toggleDevice,
} from '../utils/deviceService'
import { useFocusEffect } from 'expo-router'

const API_HOST = process.env.EXPO_PUBLIC_API_HOST

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<TabNavigatorParamList, 'Devices'>,
  NativeStackNavigationProp<RootStackParamList>
>

// Định nghĩa kiểu cho Device
interface Device {
  id: number
  name: string
  type?: string
  room: string
  isOn: boolean
  speed?: number // cho quạt
  latestSensorValue?: string // cho sensor
  created_at: string
  updated_at: string
}

type DeviceCommand = {
  id: string
  device_id: string
  command?: string
  value?: string
  created_at: string
  updated_at: string
}

// Định nghĩa kiểu cho Room
interface Room {
  room: string
  devices: Device[]
}

// Định nghĩa kiểu cho Filters
interface Filters {
  rooms: string[]
  types: string[]
  status: '' | 'on' | 'off'
  sort: '' | 'A-Z' | 'Z-A' | 'activeCount'
}

// Hàm nhóm thiết bị theo phòng
const groupDevicesByRoom = (devices: Device[]): Room[] => {
  const groups: { [key: string]: Device[] } = {}
  devices.forEach((device) => {
    if (groups[device.room]) {
      groups[device.room].push(device)
    } else {
      groups[device.room] = [device]
    }
  })
  // Chuyển đổi đối tượng thành mảng
  return Object.entries(groups).map(([room, devices]) => ({ room, devices }))
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

export default function Devices() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuth()

  // Lưu danh sách thiết bị fetch từ API
  const [dataLoading, setDataLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [top5Rooms, setTop5Rooms] = useState<string[]>([])

  // Bộ lọc tìm kiếm
  const [searchText, setSearchText] = useState<string>('')
  const [filters, setFilters] = useState<Filters>({
    rooms: [],
    types: [],
    status: '',
    sort: '',
  })

  // Lazy loading: số phòng hiển thị
  const [visibleRooms, setVisibleRooms] = useState<number>(5)

  // Fetch device data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchDevices = async () => {
        if (!user?.token) return
        setDataLoading(true) // Show loading indicator
        try {
          const res = await apiClient.get(`${API_HOST}/api/v1/devices`, {
            headers: { Authorization: `Bearer ${user.token}` },
          })
          const devicesFromApi = res.data.data

          const latestCommandsPromises = devicesFromApi.map(
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

          const devicesWithState = devicesFromApi.map(
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

          const grouped = groupDevicesByRoom(devicesWithState)
          setRooms(grouped)

          // Sau khi setRooms(grouped)
          const roomDeviceCount = grouped.reduce((acc, room) => {
            acc[room.room] = room.devices.length
            return acc
          }, {} as Record<string, number>)

          const topRooms = Object.entries(roomDeviceCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([room]) => room)

          setTop5Rooms(topRooms)
        } catch (error) {
          console.error('Error fetching devices:', error)
        } finally {
          setDataLoading(false)
        }
      }
      fetchDevices()
    }, [user])
  )

  // Hàm xử lý bật/tắt thiết bị
  const handleToggleDevice = async (deviceId: string, newState: boolean) => {
    if (!user?.token) return
    try {
      const newCommand = newState ? '1' : '0'
      const updatedCommand = await toggleDevice(
        deviceId,
        newCommand,
        user.token
      )

      // Cập nhật trạng thái rooms
      setRooms((prevRooms) =>
        prevRooms.map((room) => ({
          ...room,
          devices: room.devices.map((device) =>
            device.id.toString() === deviceId
              ? { ...device, isOn: updatedCommand.command === '1' }
              : device
          ),
        }))
      )
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  // Áp dụng bộ lọc lên danh sách rooms đã nhóm
  const filteredRooms: Room[] = rooms
    .map((roomData) => {
      // Nếu có filter theo phòng, chỉ giữ lại phòng trùng với filter
      if (filters.rooms.length && !filters.rooms.includes(roomData.room)) {
        return { room: roomData.room, devices: [] }
      }
      // Lọc thiết bị theo search, loại và trạng thái
      const filteredDevices = roomData.devices.filter((device) => {
        const matchName =
          device.name.toLowerCase().includes(searchText.toLowerCase()) ||
          roomData.room.toLowerCase().includes(searchText.toLowerCase())
        const matchType =
          filters.types.length === 0 ||
          filters.types.some((type) =>
            device.name.toLowerCase().includes(type.toLowerCase())
          )
        const matchStatus =
          filters.status === ''
            ? true
            : filters.status === 'on'
            ? device.isOn
            : !device.isOn
        return matchName && matchType && matchStatus
      })
      return { room: roomData.room, devices: filteredDevices }
    })
    .filter((room) => room.devices.length > 0)
    .sort((a, b) => {
      if (filters.sort === 'A-Z') return a.room.localeCompare(b.room)
      if (filters.sort === 'Z-A') return b.room.localeCompare(a.room)
      if (filters.sort === 'activeCount') {
        const aActive = a.devices.filter((d) => d.isOn).length
        const bActive = b.devices.filter((d) => d.isOn).length
        return bActive - aActive
      }
      return 0
    })
    .slice(0, visibleRooms)

  // Hàm load thêm khi cuộn đến cuối danh sách
  const handleLoadMore = () => {
    if (visibleRooms < rooms.length) {
      setVisibleRooms((prev) => prev + 5)
    }
  }

  const toggleFilter = (label: string) => {
    // Cập nhật filter status, rooms và types tùy thuộc vào label
    if (label === 'Đang bật' || label === 'Đang tắt') {
      setFilters((prev) => ({
        ...prev,
        status:
          prev.status === (label === 'Đang bật' ? 'on' : 'off')
            ? ''
            : label === 'Đang bật'
            ? 'on'
            : 'off',
      }))
    } else if (top5Rooms.includes(label)) {
      setFilters((prev) => ({
        ...prev,
        rooms: prev.rooms.includes(label)
          ? prev.rooms.filter((r) => r !== label)
          : [...prev.rooms, label],
      }))
    } else {
      setFilters((prev) => ({
        ...prev,
        types: prev.types.includes(label)
          ? prev.types.filter((t) => t !== label)
          : [...prev.types, label],
      }))
    }
  }

  // Cập nhật phần renderRoomItem
  const renderRoomItem = ({ item }: { item: Room }) => (
    <View style={styles.roomContainer}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('RoomDetail', {
            roomName: item.room,
          })
        }
      >
        <Text style={styles.roomTitle}>{item.room}</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {item.devices.map((device: Device) => {
          const isFan = device.name.toLowerCase().includes('fan')
          const isSensor = device.name.toLowerCase().includes('sensor')
          const isThermostat = device.name.toLowerCase().includes('thermostat')
          const isDoor =
            device.name.toLowerCase().includes('door') ||
            (device.type && device.type.toLowerCase().includes('door'))

          // Xác định loại thiết bị để hiển thị hình ảnh phù hợp
          let deviceImage
          if (isFan) {
            deviceImage = require('../assets/images/my-fan.jpeg')
          } else if (isThermostat) {
            deviceImage = require('../assets/images/my-thermostat.jpeg')
          } else if (isSensor) {
            deviceImage = require('../assets/images/my-sensor.jpeg')
          } else if (isDoor) {
            deviceImage = require('../assets/images/my-door.jpeg')
          } else {
            deviceImage = require('../assets/images/my-device.jpeg') // Default image
          }

          return (
            <View key={device.id} style={styles.deviceCard}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  alignItems: 'center',
                }}
                onPress={() => {
                  try {
                    navigation.navigate('DeviceDetail', {
                      deviceId: device.id.toString(),
                      deviceName: device.name.toString(),
                    })
                  } catch (err) {
                    console.error('Navigation to DeviceDetail failed:', err)
                  }
                }}
              >
                <Text style={styles.deviceName}>{device.name}</Text>

                {/* Hiển thị hình ảnh thiết bị */}
                <Image source={deviceImage} style={styles.deviceImage} />

                {/* Hiển thị thông tin tương ứng với loại thiết bị */}
                {isFan ? (
                  <Text style={styles.fanValue}>
                    Tốc độ: {device.speed ?? 0}%
                  </Text>
                ) : isSensor || isThermostat ? (
                  <Text style={styles.sensorValue}>
                    Giá trị: {device.latestSensorValue ?? '--'}
                  </Text>
                ) : (
                  <View style={styles.switchContainer}>
                    <Switch
                      value={device.isOn}
                      onValueChange={(newValue) =>
                        handleToggleDevice(device.id.toString(), newValue)
                      }
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Tìm phòng hoặc thiết bị..."
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchBar}
      />

      <View style={styles.filterContainer}>
        {[...top5Rooms, 'Fan', 'Camera', 'Đang bật', 'Đang tắt'].map(
          (label) => {
            const isSelected =
              filters.rooms.includes(label) ||
              filters.types.includes(label) ||
              (filters.status === 'on' && label === 'Đang bật') ||
              (filters.status === 'off' && label === 'Đang tắt')
            return (
              <TouchableOpacity
                key={label}
                onPress={() => toggleFilter(label)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text
                  style={isSelected ? styles.chipTextSelected : styles.chipText}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          }
        )}
      </View>

      <Picker
        selectedValue={filters.sort}
        onValueChange={(value) =>
          setFilters((prev) => ({ ...prev, sort: value as Filters['sort'] }))
        }
        style={styles.picker}
      >
        <Picker.Item label="Sắp xếp..." value="" />
        <Picker.Item label="Tên phòng A - Z" value="A-Z" />
        <Picker.Item label="Tên phòng Z - A" value="Z-A" />
        <Picker.Item label="Phòng có nhiều thiết bị bật" value="activeCount" />
      </Picker>

      {dataLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang lấy dữ liệu thiết bị...</Text>
        </View>
      ) : filteredRooms.length > 0 ? (
        <FlatList
          data={filteredRooms}
          renderItem={renderRoomItem}
          keyExtractor={(item) => item.room}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            visibleRooms < rooms.length ? (
              <ActivityIndicator
                size="small"
                color="#007AFF"
                style={{ marginVertical: 10 }}
              />
            ) : null
          }
        />
      ) : (
        <View style={styles.roomContainer}>
          <Text style={{ padding: 16, color: 'red' }}>Không có thiết bị</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  searchBar: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    margin: 10,
  },
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', margin: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    margin: 4,
  },
  chipSelected: { backgroundColor: '#007AFF' },
  chipText: { color: '#000' },
  chipTextSelected: { color: '#fff' },
  picker: { marginHorizontal: 10 },
  roomContainer: { padding: 10 },
  roomTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  deviceCard: {
    padding: 15,
    backgroundColor: '#fff',
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    width: 150,
    minHeight: 150,
    shadowColor: '#fff',
    shadowOpacity: 0,
  },
  deviceName: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 10,
  },
  deviceImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginVertical: 10,
  },
  deviceValue: {
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  fanValue: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  sensorValue: {
    color: '#FF9500',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: { alignItems: 'center', marginTop: 20 },
  loadingText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  switchContainer: {
    marginTop: 10,
  },
})
