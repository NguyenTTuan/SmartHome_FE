import React, { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  Button,
  Switch,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native'
import Slider from '@react-native-community/slider'
import { RouteProp, useRoute } from '@react-navigation/native'
import {
  getLatestCommand,
  toggleDevice,
  getDeviceCommandHistory,
  getAllLog,
} from '../utils/deviceService'
import { useAuth } from './contexts/AuthContext'
import { useNavigation } from 'expo-router'
import { TabNavigatorParamList } from '@/types/TabNavigatorParamList'
import { LineChart } from 'react-native-chart-kit'
import { is } from 'date-fns/locale'
import { debounce } from '@/utils/helpers'

type DeviceDetailRouteProp = RouteProp<TabNavigatorParamList, 'DeviceDetail'>

type DeviceCommand = {
  id: string
  device_id: string
  command: string
  value: string
  created_at: string
  updated_at: string
}

type SensorLog = {
  id: string
  device_id: string
  value: string
  created_at: string
  updated_at: string
}

type ChartDataType = {
  labels: string[]
  datasets: { data: number[] }[]
}

const DeviceDetail = () => {
  const route = useRoute<DeviceDetailRouteProp>()
  const navigation = useNavigation()
  const { user } = useAuth()
  const { deviceId, deviceName } = route.params

  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingChart, setIsLoadingChart] = useState(true)
  const [isOn, setIsOn] = useState(false)
  const [history, setHistory] = useState<DeviceCommand[]>([])
  const [sensorLogs, setSensorLogs] = useState<SensorLog[]>([])
  const [processedLogs, setProcessedLogs] = useState<{
    labels: string[]
    values: number[]
  }>({ labels: [], values: [] })
  const [minY, setMinY] = useState<number | null>(null)
  const [maxY, setMaxY] = useState<number | null>(null)

  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [fullChartData, setFullChartData] = useState<ChartDataType | null>(null)
  const [visibleChartData, setVisibleChartData] =
    useState<ChartDataType | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  // For swipe functionality
  const panX = useRef(new Animated.Value(0)).current
  const swipeThreshold = 50 // Minimum swipe distance to trigger navigation

  const isSensor =
    deviceName.toLowerCase().includes('sensor') ||
    deviceName.toLowerCase().includes('thermostat')
  const isFan = deviceName.toLowerCase().includes('fan')

  const POINTS_TO_SHOW = 6

  // Nếu là quạt, ta sẽ sử dụng state fanSpeed (0-100)
  const [fanSpeed, setFanSpeed] = useState<number>(isFan ? 50 : 0)

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

  // Fetch latest command and history
  const fetchData = async () => {
    if (!user?.token) return
    try {
      try {
        const latestCommand = await getLatestCommand(deviceId, user.token)
        if (isFan) {
          const speed = parseInt(latestCommand?.command || '0')
          setFanSpeed(speed)
        } else {
          setIsOn(latestCommand?.command === '1')
        }
      } catch (error) {
        console.warn(`No latest command for device ${deviceId}:`, error)
        setIsOn(false)
      }
      if (isFan || isSensor) {
        const recentHistory = await getAllLog(deviceId, user.token)
        setHistory(filterAndSortHistory(recentHistory))
      } else {
        const recentHistory = await getDeviceCommandHistory(
          deviceId,
          user.token
        )
        setHistory(filterAndSortHistory(recentHistory))
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thiết bị:', err)
    }
  }

  // Handle toggle for non-fan devices
  const handleToggle = async () => {
    if (!user?.token) return
    try {
      // Dành cho thiết bị không phải quạt
      const updated = await toggleDevice(deviceId, isOn ? '0' : '1', user.token)
      setIsOn(updated.command === '1')
      if (isSensor) {
        const recentHistory = await getAllLog(deviceId, user.token)
        setHistory(filterAndSortHistory(recentHistory))
      } else {
        const recentHistory = await getDeviceCommandHistory(
          deviceId,
          user.token
        )
        setHistory(filterAndSortHistory(recentHistory))
      }
      if (isSensor) {
        await fetchSensorLogs()
      }
    } catch (err) {
      console.error('Bật/tắt thất bại:', err)
    }
  }

  // Handle fan speed change
  const handleFanSpeedChange = async (value: number) => {
    if (!user?.token) return
    try {
      const updated = await toggleDevice(deviceId, value.toString(), user.token)
      const recentHistory = await getDeviceCommandHistory(deviceId, user.token)
      setHistory(filterAndSortHistory(recentHistory))
    } catch (err) {
      console.error('Không thể cập nhật tốc độ quạt:', err)
    }
  }

  const debouncedFanSpeedChange = useRef(
    debounce((value: number) => {
      if (value == fanSpeed) {
        return
      }
      setFanSpeed(value)
      setTimeout(handleFanSpeedChange, 5000, value)
    }, 1000)
  ).current

  // Fetch sensor logs
  const fetchSensorLogs = async () => {
    if (!user?.token) return
    setIsLoadingChart(true)
    try {
      const logsData = await getAllLog(deviceId, user.token)
      setSensorLogs(logsData)
      if (logsData && logsData.length > 0) {
        processLogsData(logsData)
      } else {
        setIsLoadingChart(false)
      }
    } catch (error) {
      console.warn(`No latest log for device ${deviceId}:`, error)
      setSensorLogs([])
      setIsLoadingChart(false)
    }
  }

  // Process sensor logs for chart - takes logs as parameter for immediate processing
  const processLogsData = (logs: SensorLog[]) => {
    if (!logs.length) {
      setIsLoadingChart(false)
      return
    }

    // Filter out logs with invalid values
    const validLogs = logs.filter((log) => {
      const value = log.value?.trim()
      return value && !isNaN(parseFloat(value)) && value !== 'NaN'
    })

    if (!validLogs.length) {
      setIsLoadingChart(false)
      return
    }

    // Sort by created_at date (oldest to newest)
    const sorted = [...validLogs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const labels: string[] = []
    const values: number[] = []

    sorted.forEach((log) => {
      const timestamp = new Date(log.created_at)
      labels.push(`${timestamp.getHours()}:${timestamp.getMinutes()}`)
      values.push(parseFloat(log.value))
    })

    setProcessedLogs({ labels, values })

    // Create the full chart data
    const fullData = {
      labels,
      datasets: [{ data: values }],
    }

    setMaxY(Math.max(...values))
    setMinY(Math.min(...values))

    setFullChartData(fullData)

    // Set initial visible data (6 most recent points)
    const startIndex = Math.max(0, labels.length - POINTS_TO_SHOW)

    // Get 6 points from the specified startIndex
    const visibleLabels = labels.slice(startIndex, startIndex + POINTS_TO_SHOW)
    const visibleValues = values.slice(startIndex, startIndex + POINTS_TO_SHOW)

    // Update visible chart data
    setVisibleChartData({
      labels: visibleLabels,
      datasets: [{ data: [...visibleValues] }],
    })

    setCurrentViewIndex(startIndex)
    setIsLoadingChart(false)
  }

  // Update visible chart data based on index
  const updateVisibleChartData = (startIndex: number) => {
    if (!processedLogs.labels.length) return

    // Ensure startIndex is within bounds
    const safeStartIndex = Math.max(
      0,
      Math.min(startIndex, processedLogs.labels.length - POINTS_TO_SHOW)
    )
    setCurrentViewIndex(safeStartIndex)

    // Get 6 points from the specified startIndex
    const visibleLabels = processedLogs.labels.slice(
      safeStartIndex,
      safeStartIndex + POINTS_TO_SHOW
    )
    const visibleValues = processedLogs.values.slice(
      safeStartIndex,
      safeStartIndex + POINTS_TO_SHOW
    )

    // Update visible chart data
    setVisibleChartData({
      labels: visibleLabels,
      datasets: [{ data: visibleValues }],
    })
  }

  // Use useMemo to recreate panResponder when processedLogs changes
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panX.setValue(0)
      },
      onPanResponderMove: Animated.event([null, { dx: panX }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        // If user swipes left (negative dx) -> show newer data
        if (gestureState.dx < -swipeThreshold) {
          const maxIndex = processedLogs.labels.length - POINTS_TO_SHOW
          if (currentViewIndex < maxIndex) {
            const newIndex = Math.min(currentViewIndex + 5, maxIndex)
            updateVisibleChartData(newIndex)
          }
        }
        // If user swipes right (positive dx) -> show older data
        else if (gestureState.dx > swipeThreshold) {
          if (currentViewIndex > 0) {
            const newIndex = Math.max(0, currentViewIndex - 5)
            updateVisibleChartData(newIndex)
          }
        }

        // Reset animation
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: false,
        }).start()
      },
    })
  }, [processedLogs, currentViewIndex, updateVisibleChartData]) // Dependencies

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchData()
      if (isSensor) {
        await fetchSensorLogs()
      }
      setIsLoading(false)
    }
    loadData()
  }, [deviceId, user, isSensor])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{deviceName}</Text>

      {isFan ? (
        <View style={styles.fanContainer}>
          <Text style={styles.fanLabel}>Tốc độ quạt: {fanSpeed}%</Text>
          <Slider
            style={{ width: Dimensions.get('window').width - 40, height: 40 }}
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={fanSpeed}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#d3d3d3"
            onValueChange={debouncedFanSpeedChange}
          />
        </View>
      ) : !isSensor ? (
        <View style={styles.statusRow}>
          <Text style={{ marginRight: 10 }}>
            Trạng thái: {isOn ? 'Bật' : 'Tắt'}
          </Text>
          <Switch value={isOn} onValueChange={handleToggle} />
        </View>
      ) : null}

      {isSensor && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            Biểu đồ giá trị cảm biến (24 giờ)
          </Text>

          {isLoadingChart ? (
            <View style={styles.chartLoadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : visibleChartData ? (
            <>
              <View style={styles.swipeInstructions}>
                <Text style={styles.swipeText}>← Kéo để xem dữ liệu →</Text>
              </View>

              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.chartWrapper,
                  { transform: [{ translateX: panX }] },
                ]}
              >
                <LineChart
                  data={visibleChartData}
                  width={Dimensions.get('window').width - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '1',
                      stroke: '#ffa726',
                    },
                  }}
                  bezier
                  fromZero
                  segments={5}
                  decorator={() => null}
                  renderDotContent={() => null}
                  style={{ marginVertical: 8, borderRadius: 16 }}
                />
              </Animated.View>

              <View style={styles.timeNavigation}>
                <Text style={styles.navStatus}>
                  {`${currentViewIndex + 1}-${Math.min(
                    currentViewIndex + POINTS_TO_SHOW,
                    processedLogs.labels.length
                  )} / ${processedLogs.labels.length}`}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>
              Không có dữ liệu cảm biến để hiển thị.
            </Text>
          )}
        </View>
      )}

      <Text style={styles.historyTitle}>Lịch sử sử dụng (trong 24 giờ):</Text>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>
            {isFan || isSensor
              ? `Giá trị: ${item.value || item.command}`
              : item.command === '1'
              ? 'Bật'
              : 'Tắt'}{' '}
            lúc {new Date(item.created_at).toLocaleString().padStart(2, '0')}
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
  chartContainer: {
    marginTop: 20,
    minHeight: 100,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  noDataText: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  timeNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  navStatus: {
    fontSize: 12,
    color: '#666',
  },
  chartLoadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  swipeInstructions: {
    alignItems: 'center',
    marginBottom: 5,
  },
  swipeText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  fanContainer: {
    marginTop: 20,
  },
  fanLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
})

export default DeviceDetail
