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
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TabNavigatorParamList } from '../types/TabNavigatorParamList'
import * as Location from 'expo-location'
import { LineChart } from 'react-native-chart-kit'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
// import axios from 'axios'
import { apiClient, useAuth } from './contexts/AuthContext'
import { getLatestCommand, toggleDevice } from '@/utils/deviceService'
import { useFocusEffect } from 'expo-router'

const WHEATHER_API_KEY = '1ab14fde88ed778777c4a12000a8dfd9'
const API_HOST = 'https://yolosmarthomeapi.ticklab.site'

type NavigationProp = NativeStackNavigationProp<TabNavigatorParamList, 'Home'>

const fakeSensorData = [
  { timestamp: '09:00', temperature: 25, humidity: 59 },
  { timestamp: '10:00', temperature: 25, humidity: 60 },
  { timestamp: '11:00', temperature: 26, humidity: 62 },
  { timestamp: '12:00', temperature: 27, humidity: 58 },
  { timestamp: '13:00', temperature: 28, humidity: 55 },
  { timestamp: '14:00', temperature: 30.5, humidity: 60 },
  { timestamp: '15:00', temperature: 29.2, humidity: 62.3 },
  { timestamp: '16:00', temperature: 29, humidity: 67 },
]

// Định nghĩa kiểu cho Device
interface Device {
  id: string
  name: string
  room: string
  isOn: boolean
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

export default function Home() {
  const { user } = useAuth()
  const navigation = useNavigation<NavigationProp>()
  const [weather, setWeather] = useState<any>(null)
  const [isPowerOn, setIsPowerOn] = useState(false)
  const [wheatherLoading, sethWeatherLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState<any>(null)
  const [rooms, setRooms] = useState<Room[]>([])

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

          const latestCommandsPromises = devicesFromApi.map((device: Device) =>
            getLatestCommand(device.id.toString(), user.token)
          )
          const latestCommands = await Promise.all(latestCommandsPromises)

          const devicesWithState = devicesFromApi.map(
            (device: Device, index: number) => ({
              ...device,
              isOn: latestCommands[index].command === '1',
            })
          )
          const grouped = groupDevicesByRoom(devicesWithState)
          setRooms(grouped)
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
            device.id === deviceId
              ? { ...device, isOn: updatedCommand.command === '1' }
              : device
          ),
        }))
      )
    } catch (err) {
      console.error('Toggle failed:', err)
    }
  }

  // Prepare data for react-native-chart-kit
  const chartData = {
    labels: fakeSensorData.map((item) => item.timestamp),
    datasets: [
      {
        data: fakeSensorData.map((item) => item.temperature),
        color: (opacity = 1) => `rgba(255, 115, 0, ${opacity})`,
      },
      {
        data: fakeSensorData.map((item) => item.humidity),
        color: (opacity = 1) => `rgba(56, 121, 8, ${opacity})`,
      },
    ],
    legend: ['Nhiệt độ (°C)', 'Độ ẩm (%)'],
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
                  style={{ width: 70, height: 70 }}
                />
                <View>
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

      {/* Sensor Dashboard */}
      <View style={{ padding: 20 }} onTouchStart={() => setSelectedPoint(null)}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>
          Cảm biến nhiệt độ & độ ẩm
        </Text>

        <View style={{ position: 'relative' }}>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={250}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: '5', strokeWidth: '1', stroke: '#fff' },
            }}
            bezier
            fromZero
            withShadow={false}
            onDataPointClick={({ value, index, x, y }) => {
              setSelectedPoint({
                x,
                y,
                temperature: fakeSensorData[index].temperature,
                humidity: fakeSensorData[index].humidity,
                label: fakeSensorData[index].timestamp,
              })
            }}
          />

          {/* Hiển thị tooltip khi chọn điểm */}
          {selectedPoint && (
            <View
              style={{
                position: 'absolute',
                top: selectedPoint.y - 40,
                left: selectedPoint.x - 20,
                backgroundColor: 'white',
                padding: 5,
                borderRadius: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 5,
                zIndex: 999,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
                {selectedPoint.label}
              </Text>
              <Text style={{ color: 'rgb(255, 115, 0)' }}>
                Nhiệt độ: {selectedPoint.temperature}°C
              </Text>
              <Text style={{ color: 'rgb(56, 121, 8)' }}>
                Độ ẩm: {selectedPoint.humidity}%
              </Text>
            </View>
          )}
        </View>
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
          <Text style={{ fontSize: 18, paddingEnd: 10 }}>Điện tổng</Text>
          <MaterialCommunityIcons
            name={`electric-switch${isPowerOn ? '-closed' : ''}`}
            size={24}
            color="black"
          />
        </View>
        <Switch value={isPowerOn} onValueChange={setIsPowerOn} />
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
            Đang lấy dữ liệu thiết bị... {/* Corrected loading message */}
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
              <Text style={{ fontSize: 18, marginBottom: 10 }}>
                {roomData.room}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexDirection: 'row' }}
              >
                {roomData.devices.map((device) => (
                  <View
                    key={device.id}
                    style={{
                      padding: 10,
                      backgroundColor: 'lightgray',
                      marginRight: 10,
                      borderRadius: 10,
                    }}
                  >
                    <Text>{device.name}</Text>
                    <Switch
                      value={device.isOn}
                      onValueChange={(newValue) =>
                        handleToggleDevice(device.id.toString(), newValue)
                      }
                    />
                  </View>
                ))}
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
