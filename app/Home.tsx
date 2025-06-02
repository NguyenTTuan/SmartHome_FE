import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native'
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TabNavigatorParamList } from '../types/TabNavigatorParamList'
import * as Location from 'expo-location'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
// import axios from 'axios'
import { apiClient, useAuth } from './contexts/AuthContext'
import {
  getAllLog,
  getLatestCommand,
  toggleDevice,
} from '@/utils/deviceService'
import { useFocusEffect } from 'expo-router'
import { RootStackParamList } from '@/types/RootStackParamList'

const WHEATHER_API_KEY = '1ab14fde88ed778777c4a12000a8dfd9'
const API_HOST = 'https://yolosmarthomeapi.ticklab.site'

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'Main'>,
  NativeStackNavigationProp<TabNavigatorParamList, 'Home'>
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
  srcImg?: string
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

export default function Home() {
  const { user } = useAuth()
  const navigation = useNavigation<NavigationProp>()
  const [weather, setWeather] = useState<any>(null)
  const [isPowerOn, setIsPowerOn] = useState(false)
  const [wheatherLoading, sethWeatherLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [sensorDevices, setSensorDevices] = useState<Device[]>([])

  useEffect(() => {
    ;(async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.error('Permission to access location was denied')
        return
      }
      let location = await Location.getCurrentPositionAsync({})
      fetchWeather(location.coords.latitude, location.coords.longitude)
    })()
  }, [])

  const fetchWeather = async (lat: any, lon: any) => {
    try {
      const response = await apiClient.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WHEATHER_API_KEY}&units=metric`
      )
      setWeather(response.data)
    } catch (error) {
      console.error('Error fetching weather:', error)
    } finally {
      sethWeatherLoading(false)
    }
  }

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

          const sensors = devicesWithState.filter(
            (d: Device) =>
              d.name.toLowerCase().includes('sensor') ||
              d.name.toLowerCase().includes('thermostat')
          )
          const nonSensorDevices = devicesWithState.filter(
            (d: Device) => !sensors.some((s: Device) => s.id === d.id)
          )
          setRooms(groupDevicesByRoom(nonSensorDevices))
          setSensorDevices(sensors)
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

  const screenWidth = Dimensions.get('window').width

  return (
    <ScrollView style={{ flex: 1, padding: 0 }}>
      {/* Weather Section */}
      <View
        style={{
          padding: 20,
          backgroundColor: '#f0f8ff',
          borderRadius: 10,
          margin: 10,
        }}
      >
        {wheatherLoading ? (
          <View>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              Đang lấy dữ liệu thời tiết...
            </Text>
          </View>
        ) : (
          weather && (
            <View>
              {/* Location Name */}
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                {weather.name}
              </Text>

              {/* Weather Icon and Description */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 15,
                }}
              >
                <Image
                  source={{
                    uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                  }}
                  style={{
                    width: 70,
                    height: 70,
                    borderWidth: 2,
                    borderColor: '#007AFF', // dùng màu chủ đạo hoặc màu nổi bật khác
                    borderRadius: 35,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 2,
                    backgroundColor: '#fff',
                  }}
                />
                <View style={{ paddingLeft: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500' }}>
                    {weather.weather[0].main}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    {weather.weather[0].description}
                  </Text>
                </View>
              </View>

              {/* Temperature and Feels Like */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  marginBottom: 15,
                }}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>Nhiệt độ</Text>
                  <Text style={{ fontSize: 26, fontWeight: 'bold' }}>
                    {Math.round(weather.main.temp)}°C
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#666' }}>
                    Cảm giác như
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '500' }}>
                    {Math.round(weather.main.feels_like)}°C
                  </Text>
                </View>
              </View>

              {/* Humidity and Pressure */}
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-around' }}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                  <Ionicons name="water-outline" size={18} color="#0080ff" />
                  <Text style={{ marginLeft: 5 }}>
                    {weather.main.humidity}%
                  </Text>
                </View>
                <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                  <Ionicons
                    name="speedometer-outline"
                    size={18}
                    color="#ff7300"
                  />
                  <Text style={{ marginLeft: 5 }}>
                    {weather.main.pressure} hPa
                  </Text>
                </View>
              </View>
            </View>
          )
        )}
      </View>

      {/* Sensor Devices Section */}
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 10, fontWeight: 'bold' }}>
          Các cảm biến
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexDirection: 'row' }}
        >
          {sensorDevices.map((device) => (
            <View
              key={device.id}
              style={{
                padding: 15,
                backgroundColor: '#e0f7fa',
                marginRight: 10,
                borderRadius: 10,
                width: 150,
                minHeight: 200,
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                }}
                onPress={() =>
                  navigation.navigate('DevicesStack', {
                    screen: 'DeviceDetail',
                    params: {
                      deviceId: device.id.toString(),
                      deviceName: device.name,
                    },
                  })
                }
              >
                <Text
                  style={{
                    fontWeight: 'bold',
                    marginBottom: 10,
                    textAlign: 'center',
                  }}
                >
                  {device.name}
                </Text>

                {device.type?.toLocaleLowerCase().includes('thermostat') ? (
                  <Image
                    source={require('../assets/images/my-thermostat.jpeg')}
                    style={{
                      width: 80,
                      height: 80,
                      resizeMode: 'contain',
                      marginVertical: 10,
                    }}
                  />
                ) : (
                  <Image
                    source={require('../assets/images/my-sensor.jpeg')}
                    style={{
                      width: 80,
                      height: 80,
                      resizeMode: 'contain',
                      marginVertical: 10,
                    }}
                  />
                )}

                <Text
                  style={{
                    color: 'green',
                    fontWeight: 'bold',
                    marginTop: 10,
                    textAlign: 'center',
                  }}
                >
                  Giá trị: {device.latestSensorValue ?? '--'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Main Power Switch */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, paddingEnd: 10, fontWeight: 'bold' }}>
            Điện tổng
          </Text>
          <MaterialCommunityIcons
            name={`electric-switch${isPowerOn ? '-closed' : ''}`}
            size={24}
            color="black"
          />
        </View>
        {/* <Switch value={isPowerOn} onValueChange={setIsPowerOn} /> */}
      </View>

      {/* Room Devices */}
      {dataLoading ? (
        <View>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text
            style={{
              fontSize: 11,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Đang lấy dữ liệu thiết bị...
          </Text>
        </View>
      ) : (
        <View
          style={{
            padding: 20,
            backgroundColor: '#f0f8ff',
            borderRadius: 10,
            margin: 10,
          }}
        >
          {rooms.map((roomData) => (
            <View key={roomData.room} style={{ marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('DevicesStack', {
                    screen: 'RoomDetail',
                    params: {
                      roomName: roomData.room,
                    },
                  })
                }
              >
                <Text
                  style={{ fontSize: 18, marginBottom: 10, fontWeight: 'bold' }}
                >
                  {roomData.room}
                </Text>
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexDirection: 'row' }}
              >
                {roomData.devices.map((device) => {
                  const isFan =
                    device.name.toLowerCase().includes('fan') ||
                    device.type?.toLowerCase().includes('fan')
                  return (
                    <View
                      key={device.id}
                      style={{
                        padding: 15,
                        backgroundColor: 'white',
                        marginRight: 10,
                        borderRadius: 10,
                        width: 150,
                        minHeight: 200,
                        alignItems: 'center',
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          alignItems: 'center',
                          width: '100%',
                          marginBottom: 10,
                        }}
                        onPress={() =>
                          navigation.navigate('DevicesStack', {
                            screen: 'DeviceDetail',
                            params: {
                              deviceId: device.id.toString(),
                              deviceName: device.name,
                            },
                          })
                        }
                      >
                        <Text
                          style={{
                            textAlign: 'center',
                            fontWeight: '500',
                            marginBottom: 10,
                          }}
                        >
                          {device.name}
                        </Text>

                        {isFan ? (
                          <>
                            <Image
                              source={require('../assets/images/my-fan.jpeg')}
                              style={{
                                width: 80,
                                height: 80,
                                resizeMode: 'contain',
                                marginBottom: 10,
                              }}
                            />
                            <Text
                              style={{
                                color: '#007AFF',
                                fontWeight: 'bold',
                                textAlign: 'center',
                                marginTop: 10,
                              }}
                            >
                              Tốc độ: {device.speed ?? '0'}%
                            </Text>
                          </>
                        ) : (
                          <>
                            <Image
                              source={
                                device.type?.toLowerCase().includes('door')
                                  ? require('../assets/images/my-door.jpeg')
                                  : require('../assets/images/my-door.jpeg')
                              }
                              style={{
                                width: 80,
                                height: 80,
                                resizeMode: 'contain',
                                marginBottom: 10,
                              }}
                            />
                            <View style={{ marginTop: 10 }}>
                              <Switch
                                value={device.isOn}
                                onValueChange={(newValue) =>
                                  handleToggleDevice(
                                    device.id.toString(),
                                    newValue
                                  )
                                }
                              />
                            </View>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          ))}
        </View>
      )}

      {/* Devices Button */}
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 20,
        }}
      >
        <TouchableOpacity
          style={{
            padding: 10,
            backgroundColor: '#2196F3',
            borderRadius: 10,
            alignItems: 'center',
            width: '50%',
          }}
          onPress={() => navigation.navigate('Devices')}
        >
          <Text style={{ color: 'white', fontSize: 14 }}>Xem thêm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
