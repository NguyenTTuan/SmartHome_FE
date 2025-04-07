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
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Devices'>

// Định nghĩa kiểu cho Device
interface Device {
  id: number
  name: string
  isOn: boolean
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

const fakeDevices: Room[] = [
  {
    room: 'Living Room',
    devices: [
      { id: 1, name: 'TV', isOn: false },
      { id: 2, name: 'Air Conditioner', isOn: true },
      { id: 3, name: 'Fan', isOn: false },
      { id: 13, name: 'Camera', isOn: true },
    ],
  },
  {
    room: 'Bedroom',
    devices: [
      { id: 4, name: 'Lamp', isOn: true },
      { id: 5, name: 'Smart Speaker', isOn: false },
      { id: 14, name: 'Camera', isOn: false },
    ],
  },
  {
    room: 'Kitchen',
    devices: [
      { id: 6, name: 'Refrigerator', isOn: true },
      { id: 7, name: 'Oven', isOn: false },
      { id: 8, name: 'Coffee Maker', isOn: false },
      { id: 9, name: 'Coffee Maker', isOn: false },
      { id: 10, name: 'Coffee Maker', isOn: false },
      { id: 11, name: 'Coffee Maker', isOn: false },
      { id: 12, name: 'Coffee Maker', isOn: false },
    ],
  },
  {
    room: 'Study Room',
    devices: [
      { id: 15, name: 'Computer', isOn: true },
      { id: 16, name: 'Lamp', isOn: false },
      { id: 17, name: 'Camera', isOn: true },
    ],
  },
  {
    room: 'Garage',
    devices: [
      { id: 18, name: 'Car Charger', isOn: false },
      { id: 19, name: 'Camera', isOn: false },
    ],
  },
  {
    room: 'Bathroom 1',
    devices: [
      { id: 20, name: 'Water Heater', isOn: true },
      { id: 21, name: 'Mirror Light', isOn: true },
    ],
  },
  {
    room: 'Bathroom 2',
    devices: [
      { id: 22, name: 'Water Heater', isOn: true },
      { id: 23, name: 'Mirror Light', isOn: true },
    ],
  },
]

export default function Devices() {
  const navigation = useNavigation<NavigationProp>()
  const [searchText, setSearchText] = useState<string>('')
  const [filters, setFilters] = useState<Filters>({
    rooms: [],
    types: [],
    status: '',
    sort: '',
  })
  const [visibleRooms, setVisibleRooms] = useState<number>(5)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const filteredRooms: Room[] = fakeDevices
    .filter((roomData) => {
      if (filters.rooms.length && !filters.rooms.includes(roomData.room))
        return false
      const matchingDevices = roomData.devices.filter((device) => {
        const matchName =
          device.name.toLowerCase().includes(searchText.toLowerCase()) ||
          roomData.room.toLowerCase().includes(searchText.toLowerCase())
        const matchType =
          filters.types.length === 0 || filters.types.includes(device.name)
        const matchStatus =
          filters.status === ''
            ? true
            : filters.status === 'on'
            ? device.isOn
            : !device.isOn
        return matchName && matchType && matchStatus
      })
      roomData.devices = matchingDevices
      return matchingDevices.length > 0
    })
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

  const handleLoadMore = () => {
    if (visibleRooms < fakeDevices.length) {
      setVisibleRooms((prev) => prev + 5)
    }
  }

  const renderRoomItem = ({ item }: { item: Room }) => (
    <View style={styles.roomContainer}>
      <TouchableOpacity
        onPress={() => navigation.navigate('RoomDetail', { room: item.room })}
      >
        <Text style={styles.roomTitle}>{item.room}</Text>
      </TouchableOpacity>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {item.devices.map((device: Device) => (
          <View key={device.id} style={styles.deviceCard}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Switch
              value={device.isOn}
              onValueChange={(newValue) =>
                console.log(`Device ${device.name} toggled to ${newValue}`)
              }
            />
          </View>
        ))}
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
        {[
          'Living Room',
          'Bedroom',
          'Fan',
          'Camera',
          'Đang bật',
          'Đang tắt',
        ].map((label) => (
          <TouchableOpacity
            key={label}
            style={[
              styles.chip,
              (filters.rooms.includes(label) ||
                filters.types.includes(label) ||
                (filters.status === 'on' && label === 'Đang bật') ||
                (filters.status === 'off' && label === 'Đang tắt')) &&
                styles.chipSelected,
            ]}
            onPress={() => {
              if (label === 'Đang bật' || label === 'Đang tắt') {
                setFilters((prev: Filters) => ({
                  ...prev,
                  status: label === 'Đang bật' ? 'on' : 'off',
                }))
              } else if (['Living Room', 'Bedroom'].includes(label)) {
                setFilters((prev: Filters) => ({
                  ...prev,
                  rooms: prev.rooms.includes(label)
                    ? prev.rooms.filter((r: string) => r !== label)
                    : [...prev.rooms, label],
                }))
              } else {
                setFilters((prev: Filters) => ({
                  ...prev,
                  types: prev.types.includes(label)
                    ? prev.types.filter((t: string) => t !== label)
                    : [...prev.types, label],
                }))
              }
            }}
          >
            <Text
              style={[
                styles.chipText,
                (filters.rooms.includes(label) ||
                  filters.types.includes(label) ||
                  (filters.status === 'on' && label === 'Đang bật') ||
                  (filters.status === 'off' && label === 'Đang tắt')) &&
                  styles.chipTextSelected,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Picker
        selectedValue={filters.sort}
        onValueChange={(value) =>
          setFilters((prev: Filters) => ({ ...prev, sort: value }))
        }
        style={styles.picker}
      >
        <Picker.Item label="Sắp xếp..." value="" />
        <Picker.Item label="Tên phòng A - Z" value="A-Z" />
        <Picker.Item label="Tên phòng Z - A" value="Z-A" />
        <Picker.Item label="Phòng có nhiều thiết bị bật" value="activeCount" />
      </Picker>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Đang lấy dữ liệu thiết bị...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          renderItem={renderRoomItem}
          keyExtractor={(item) => item.room}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            visibleRooms < fakeDevices.length ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : null
          }
        />
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
  roomContainer: { marginBottom: 20 },
  roomTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  deviceCard: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  deviceName: { fontSize: 14 },
  loadingContainer: { alignItems: 'center', marginTop: 20 },
  loadingText: { fontSize: 11, fontWeight: 'bold', marginTop: 10 },
})
