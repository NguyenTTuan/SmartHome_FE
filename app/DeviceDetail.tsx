import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  Switch,
  Button,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Animated,
  PanResponder,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'
import { LineChart } from 'react-native-chart-kit'
import Slider from '@react-native-community/slider'
import { debounce } from 'lodash'
import { TabNavigatorParamList } from '@/types/TabNavigatorParamList'
import { useAuth } from './contexts/AuthContext'
import {
  getAllLog,
  getDeviceCommandHistory,
  getLatestCommand,
  toggleDevice,
} from '@/utils/deviceService'

// Update this type to match your navigation structure
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

// Error Boundary Component for Chart
const ChartErrorBoundary: React.FC<{
  children: React.ReactNode
  fallback?: React.ReactNode
}> = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [children])

  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {fallback || 'Không thể hiển thị biểu đồ. Vui lòng thử lại.'}
        </Text>
      </View>
    )
  }

  try {
    return <>{children}</>
  } catch (error) {
    console.error('Chart Error:', error)
    setHasError(true)
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Lỗi hiển thị biểu đồ</Text>
      </View>
    )
  }
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
  const swipeThreshold = 50

  const isSensor =
    deviceName.toLowerCase().includes('sensor') ||
    deviceName.toLowerCase().includes('thermostat')
  const isFan = deviceName.toLowerCase().includes('fan')

  const POINTS_TO_SHOW = 6

  // Fan speed state
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
      const newCommand = isOn ? '0' : '1'
      const updated = await toggleDevice(deviceId, newCommand, user.token)
      setIsOn(updated.command === '1')

      if (isSensor) {
        const recentHistory = await getAllLog(deviceId, user.token)
        setHistory(filterAndSortHistory(recentHistory))
        await fetchSensorLogs()
      } else {
        const recentHistory = await getDeviceCommandHistory(
          deviceId,
          user.token
        )
        setHistory(filterAndSortHistory(recentHistory))
      }
    } catch (err) {
      console.error('Bật/tắt thất bại:', err)
      Alert.alert('Lỗi', 'Không thể thay đổi trạng thái thiết bị')
    }
  }

  // Handle fan speed change
  const handleFanSpeedChange = async (value: number) => {
    if (!user?.token) return
    try {
      await toggleDevice(deviceId, value.toString(), user.token)
      const recentHistory = await getDeviceCommandHistory(deviceId, user.token)
      setHistory(filterAndSortHistory(recentHistory))
    } catch (err) {
      console.error('Không thể cập nhật tốc độ quạt:', err)
      Alert.alert('Lỗi', 'Không thể cập nhật tốc độ quạt')
    }
  }

  const debouncedFanSpeedChange = useRef(
    debounce((value: number) => {
      if (value === fanSpeed) return
      setFanSpeed(value)
      setTimeout(() => handleFanSpeedChange(value), 1000)
    }, 1000)
  ).current

  // Fetch sensor logs with improved error handling
  const fetchSensorLogs = async () => {
    if (!user?.token) return
    setIsLoadingChart(true)
    try {
      const logsData = await getAllLog(deviceId, user.token)
      setSensorLogs(logsData)
      if (logsData && logsData.length > 0) {
        processLogsData(logsData)
      } else {
        setProcessedLogs({ labels: [], values: [] })
        setIsLoadingChart(false)
      }
    } catch (error) {
      console.warn(`No latest log for device ${deviceId}:`, error)
      setSensorLogs([])
      setProcessedLogs({ labels: [], values: [] })
      setIsLoadingChart(false)
    }
  }

  // Process sensor logs for chart with improved validation
  const processLogsData = (logs: SensorLog[]) => {
    if (!logs.length) {
      setIsLoadingChart(false)
      return
    }

    // Filter out logs with invalid values
    const validLogs = logs.filter((log) => {
      const value = log.value?.trim()
      if (
        !value ||
        value === 'null' ||
        value === 'undefined' ||
        value === 'NaN'
      ) {
        return false
      }
      const numValue = parseFloat(value)
      return !isNaN(numValue) && isFinite(numValue)
    })

    if (validLogs.length < 2) {
      console.warn('Not enough valid data points for chart')
      setProcessedLogs({ labels: [], values: [] })
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
      const hours = timestamp.getHours().toString().padStart(2, '0')
      const minutes = timestamp.getMinutes().toString().padStart(2, '0')
      labels.push(`${hours}:${minutes}`)
      values.push(parseFloat(log.value))
    })

    // Final validation
    const finalValues = values.filter((val) => !isNaN(val) && isFinite(val))
    if (finalValues.length !== values.length) {
      console.error('Found invalid values after processing')
      setProcessedLogs({ labels: [], values: [] })
      setIsLoadingChart(false)
      return
    }

    setProcessedLogs({ labels, values })
    setMaxY(Math.max(...values))
    setMinY(Math.min(...values))

    // Set initial visible data (most recent points)
    const startIndex = Math.max(0, labels.length - POINTS_TO_SHOW)
    setCurrentViewIndex(startIndex)
    setIsLoadingChart(false)
  }

  // Create safe chart data with validation
  const safeChartData = useMemo(() => {
    if (!processedLogs.labels.length || !processedLogs.values.length) {
      return null
    }

    if (processedLogs.labels.length < 2) {
      return null
    }

    const startIndex = Math.max(
      0,
      Math.min(currentViewIndex, processedLogs.labels.length - POINTS_TO_SHOW)
    )
    const endIndex = Math.min(
      startIndex + POINTS_TO_SHOW,
      processedLogs.labels.length
    )

    const visibleLabels = processedLogs.labels.slice(startIndex, endIndex)
    const visibleValues = processedLogs.values.slice(startIndex, endIndex)

    // Ensure we have valid data
    if (visibleLabels.length < 2 || visibleValues.length < 2) {
      return null
    }

    // Check for invalid values
    const validValues = visibleValues.filter(
      (val) => !isNaN(val) && isFinite(val)
    )
    if (validValues.length !== visibleValues.length) {
      console.warn('Found invalid values in visible chart data')
      return null
    }

    return {
      labels: visibleLabels,
      datasets: [
        {
          data: visibleValues,
          strokeWidth: 2,
        },
      ],
    }
  }, [processedLogs, currentViewIndex])

  // Update visible chart data
  const updateVisibleChartData = useCallback(
    (startIndex: number) => {
      if (!processedLogs.labels.length) return

      const safeStartIndex = Math.max(
        0,
        Math.min(startIndex, processedLogs.labels.length - POINTS_TO_SHOW)
      )
      setCurrentViewIndex(safeStartIndex)
    },
    [processedLogs.labels.length]
  )

  // Create PanResponder for chart swiping
  const panResponder = useMemo(() => {
    if (!processedLogs.labels.length || isLoadingChart || !safeChartData) {
      return null
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        )
      },
      onPanResponderGrant: () => {
        panX.setValue(0)
      },
      onPanResponderMove: Animated.event([null, { dx: panX }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx < -swipeThreshold) {
          const maxIndex = processedLogs.labels.length - POINTS_TO_SHOW
          if (currentViewIndex < maxIndex) {
            const newIndex = Math.min(currentViewIndex + 3, maxIndex)
            updateVisibleChartData(newIndex)
          }
        } else if (gestureState.dx > swipeThreshold) {
          if (currentViewIndex > 0) {
            const newIndex = Math.max(0, currentViewIndex - 3)
            updateVisibleChartData(newIndex)
          }
        }

        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: false,
        }).start()
      },
      onPanResponderTerminationRequest: () => true,
    })
  }, [
    processedLogs.labels.length,
    currentViewIndex,
    updateVisibleChartData,
    isLoadingChart,
    safeChartData,
  ])

  // Render chart with error handling
  const renderChart = () => {
    if (isLoadingChart) {
      return (
        <View style={styles.chartLoadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      )
    }

    if (!safeChartData) {
      return (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            Không có đủ dữ liệu để hiển thị biểu đồ (cần ít nhất 2 điểm dữ liệu)
          </Text>
        </View>
      )
    }

    return (
      <>
        <View style={styles.swipeInstructions}>
          <Text style={styles.swipeText}>← Kéo để xem dữ liệu →</Text>
        </View>

        <Animated.View
          {...(panResponder?.panHandlers || {})}
          style={[styles.chartWrapper, { transform: [{ translateX: panX }] }]}
        >
          <ChartErrorBoundary>
            <LineChart
              key={`chart-${currentViewIndex}-${processedLogs.labels.length}`}
              data={safeChartData}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#ff9800',
                },
              }}
              bezier={true}
              fromZero={false}
              segments={4}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          </ChartErrorBoundary>
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
    )
  }

  // Fetch data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await fetchData()
        if (isSensor) {
          await fetchSensorLogs()
        }
      } catch (error) {
        console.error('Error loading device data:', error)
        Alert.alert('Lỗi', 'Không thể tải dữ liệu thiết bị')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [deviceId, user, isSensor])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Đang tải dữ liệu thiết bị...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>{deviceName}</Text>

      {isFan ? (
        <View style={styles.fanContainer}>
          <Text style={styles.fanLabel}>Tốc độ quạt: {fanSpeed}%</Text>
          <Slider
            style={styles.slider}
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
          <Text style={styles.statusText}>
            Trạng thái: {isOn ? 'Bật' : 'Tắt'}
          </Text>
          <Switch
            value={isOn}
            onValueChange={handleToggle}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isOn ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
      ) : null}

      {isSensor && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            Biểu đồ giá trị cảm biến (24 giờ)
          </Text>
          {renderChart()}
        </View>
      )}

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Lịch sử sử dụng (trong 24 giờ):</Text>

        {history.length > 0 ? (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <Text style={styles.historyText}>
                  {isFan || isSensor
                    ? `Giá trị: ${item.value || item.command}`
                    : item.command === '1'
                    ? 'Bật'
                    : 'Tắt'}{' '}
                  lúc {new Date(item.created_at).toLocaleString()}
                </Text>
              </View>
            )}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noHistoryText}>Không có lịch sử sử dụng</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  deviceId: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  fanContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fanLabel: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#2196F3',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  chartLoadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
    fontSize: 14,
  },
  swipeInstructions: {
    alignItems: 'center',
    marginBottom: 10,
  },
  swipeText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  timeNavigation: {
    alignItems: 'center',
    marginTop: 10,
  },
  navStatus: {
    fontSize: 12,
    color: '#666',
  },
  historyContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyText: {
    fontSize: 14,
    color: '#666',
  },
  noHistoryText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
})

export default DeviceDetail
