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
import { RootStackParamList } from '../types/RootStackParamList'
import * as Location from 'expo-location'
import axios from 'axios'
import { LineChart } from 'react-native-chart-kit'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const API_KEY = '1ab14fde88ed778777c4a12000a8dfd9'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>

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

// Dữ liệu giả lập cho thiết bị trong từng phòng
const fakeDevices = [
  {
    room: 'Living Room',
    devices: [
      { id: 1, name: 'TV', isOn: false },
      { id: 2, name: 'Air Conditioner', isOn: true },
      { id: 3, name: 'Fan', isOn: false },
    ],
  },
  {
    room: 'Bedroom',
    devices: [
      { id: 4, name: 'Lamp', isOn: true },
      { id: 5, name: 'Smart Speaker', isOn: false },
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
]

export default function Home() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>()
  const [weather, setWeather] = useState<any>(null)
  const [isPowerOn, setIsPowerOn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedPoint, setSelectedPoint] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      let { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.log('Permission to access location was denied')
        return
      }
      let location = await Location.getCurrentPositionAsync({})
      fetchWeather(location.coords.latitude, location.coords.longitude)
    })()
  }, [])

  const fetchWeather = async (lat: any, lon: any) => {
    try {
      // const response = await axios.get(
      //   `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      // )

      setLoading(true)
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 5000))
      const fakeWeatherData = {
        base: 'stations',
        clouds: { all: 0 },
        cod: 200,
        coord: { lat: 10.7626, lon: 106.6602 },
        dt: 1743741753,
        id: 1566083,
        main: {
          feels_like: 39.7,
          grnd_level: 1010,
          humidity: 58,
          pressure: 1011,
          sea_level: 1011,
          temp: 33.36,
          temp_max: 33.36,
          temp_min: 32.99,
        },
        name: 'Ho Chi Minh City',
        sys: {
          country: 'VN',
          id: 2093009,
          sunrise: 1743720511,
          sunset: 1743764636,
          type: 2,
        },
        timezone: 25200,
        visibility: 10000,
        weather: [
          { description: 'clear sky', icon: '01d', id: 800, main: 'Clear' },
        ],
        wind: { deg: 70, speed: 4.63 },
      }

      // Set fake data to state
      setWeather(fakeWeatherData)

      // setWeather(response.data)
    } catch (error) {
      console.error('Error fetching weather:', error)
    } finally {
      setLoading(false)
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
        {loading ? (
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
      {loading ? (
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
          {fakeDevices.map((roomData) => (
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
                      onValueChange={(newValue) => {
                        // Implement logic to update device.isOn state
                        console.log(
                          `Device ${device.name} toggled to ${newValue}`
                        )
                        // Update your devices array here
                      }}
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
          <Text style={{ color: 'white', fontSize: 18 }}>Xem thiết bị</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
