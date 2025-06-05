import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native'
import * as ExpoNotifications from 'expo-notifications'
import {
  format,
  parseISO,
  isToday,
  isWithinInterval,
  subDays,
  subWeeks,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { useIsFocused } from '@react-navigation/native'
import { apiClient, useAuth } from './contexts/AuthContext'
import { getSocket, getSocketStatus } from '@/utils/socket'
import { useNotificationContext } from './contexts/NotificationContext'

const API_HOST = process.env.EXPO_PUBLIC_API_HOST

// Define Notification type
export interface Notification {
  id: string
  user_id: string
  header: string
  description: string
  type: 'info' | 'warning' | 'error' | 'success'
  status: 'read' | 'unread'
  created_at: string
  updated_at: string
}

// Group notifications by time period
const groupNotifications = (notifications: Notification[]) => {
  const groups: { [key: string]: Notification[] } = {}
  const now = new Date()

  notifications.forEach((notif) => {
    const date = parseISO(notif.created_at)
    let groupKey = ''

    if (isToday(date)) {
      groupKey = 'Hôm nay'
    } else if (isWithinInterval(date, { start: subDays(now, 7), end: now })) {
      groupKey = 'Vài ngày trước'
    } else if (isWithinInterval(date, { start: subWeeks(now, 4), end: now })) {
      groupKey = 'Vài tuần trước'
    } else {
      const month = format(date, 'MMMM yyyy', { locale: vi })
      groupKey = `Trong ${month}`
    }

    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(notif)
  })

  return groups
}

// Format time display
const formatTimeDisplay = (timestamp: string) => {
  const date = parseISO(timestamp)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (isToday(date)) {
    if (diffInSeconds < 60) return `${diffInSeconds} giây trước`
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} phút trước`
    return `${Math.floor(diffInSeconds / 3600)} giờ trước`
  } else if (isWithinInterval(date, { start: subDays(now, 7), end: now })) {
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`
  }

  return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
}

// Get color by notification type
const getTypeColor = (type: string) => {
  switch (type) {
    case 'error':
      return '#f44336'
    case 'warning':
      return '#ff9800'
    case 'success':
      return '#4caf50'
    case 'info':
    default:
      return '#2196f3'
  }
}

// Get type label in Vietnamese
const getTypeLabel = (type: string) => {
  switch (type) {
    case 'error':
      return 'Lỗi'
    case 'warning':
      return 'Cảnh báo'
    case 'success':
      return 'Thành công'
    case 'info':
    default:
      return 'Thông tin'
  }
}

export default function Notifications() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [allNotifs, setAllNotifs] = useState<Notification[]>([])
  const [viewMode, setViewMode] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
  const { checkUnreadNotifications } = useNotificationContext()

  const pageSize = 10
  const isFocused = useIsFocused()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const socketListenerAttached = useRef(false)

  useEffect(() => {
    if (isFocused) {
      fetchNotifications()
      setupNotificationListeners()
    }

    return () => {
      // Clear polling interval when component unmounts or loses focus
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isFocused])

  // Setup notification listeners and polling fallback
  const setupNotificationListeners = () => {
    const socket = getSocket()

    const handleNewNotification = (notif: Notification) => {
      console.log('handleNewNotification ----- ', notif)

      // Update notifications list
      setAllNotifs((prev) => {
        const merged = [notif, ...prev]
        merged.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        return merged
      })

      // Show in-app alert
      Alert.alert(notif.header, notif.description)

      // Trigger push notification
      ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: notif.header,
          body: notif.description,
          data: { notificationId: notif.id },
        },
        trigger: null,
      })

      // Update last fetch time since we got new data
      setLastFetchTime(new Date())
    }

    // Only attach socket listeners once
    if (socket && user?.token && !socketListenerAttached.current) {
      socket.on('newNotification', handleNewNotification)
      socket.on('notification', handleNewNotification)
      socketListenerAttached.current = true

      console.log('✅ Socket listeners attached')
    }

    // Setup polling fallback mechanism
    setupPollingFallback()

    // Cleanup function
    return () => {
      if (socket) {
        socket.off('newNotification', handleNewNotification)
        socket.off('notification', handleNewNotification)
        socketListenerAttached.current = false
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }

  // Setup polling fallback for when socket fails
  const setupPollingFallback = () => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Check socket status and setup polling if needed
    const checkAndPoll = () => {
      const { isConnected, hasInvalidNamespaceError } = getSocketStatus()

      if (!isConnected || hasInvalidNamespaceError) {
        console.log(
          '🔄 Socket not connected or has namespace error, using polling fallback'
        )

        // Only fetch if we haven't fetched recently (avoid unnecessary requests)
        const now = new Date()
        const shouldFetch =
          !lastFetchTime || now.getTime() - lastFetchTime.getTime() >= 25000 // 25 seconds buffer

        if (shouldFetch) {
          fetchNotifications(true) // Silent fetch
        }
      }
    }

    // Start polling every 30 seconds
    pollingIntervalRef.current = setInterval(checkAndPoll, 30000)

    // Also check immediately
    setTimeout(checkAndPoll, 5000) // Wait 5 seconds for socket to establish connection
  }

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      if (!user || !user.token) throw new Error('No access token found')

      const response = await apiClient.get(`${API_HOST}/api/v1/notifications`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })

      const data = response.data?.data || []

      const sorted = [...data].sort(
        (a: Notification, b: Notification) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setAllNotifs(sorted)
      setLastFetchTime(new Date())
      checkUnreadNotifications()
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      if (!silent) {
        Alert.alert('Lỗi', 'Không thể tải danh sách thông báo')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Update notification status
  const updateNotificationStatus = async (
    id: string,
    status: 'read' | 'unread'
  ) => {
    try {
      setActionLoading(true)
      if (!user || !user.token) throw new Error('No access token found')

      await apiClient.patch(
        `${API_HOST}/api/v1/notifications/${id}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      )

      // Update local state
      setAllNotifs((prev) =>
        prev.map((notif) => (notif.id === id ? { ...notif, status } : notif))
      )

      // Update selected notification if it's the current one
      if (selectedNotif && selectedNotif.id === id) {
        setSelectedNotif({ ...selectedNotif, status })
      }

      Alert.alert(
        'Thành công',
        `Đã ${status === 'read' ? 'đánh dấu đã đọc' : 'đánh dấu chưa đọc'}`
      )
      checkUnreadNotifications()
    } catch (error) {
      console.error('Failed to update notification status:', error)
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái thông báo')
    } finally {
      setActionLoading(false)
    }
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      setActionLoading(true)
      if (!user || !user.token) throw new Error('No access token found')

      await apiClient.delete(`${API_HOST}/api/v1/notifications/${id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })

      // Remove from local state
      setAllNotifs((prev) => prev.filter((notif) => notif.id !== id))

      // Close modal if viewing this notification
      if (selectedNotif && selectedNotif.id === id) {
        setModalVisible(false)
        setSelectedNotif(null)
      }

      Alert.alert('Thành công', 'Đã xóa thông báo')
      checkUnreadNotifications()
    } catch (error) {
      console.error('Failed to delete notification:', error)
      Alert.alert('Lỗi', 'Không thể xóa thông báo')
    } finally {
      setActionLoading(false)
    }
  }

  // Show notification detail modal
  const showNotificationDetail = (notif: Notification) => {
    setSelectedNotif(notif)
    setModalVisible(true)
  }

  // Confirm delete
  const confirmDelete = (id: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa thông báo này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => deleteNotification(id),
      },
    ])
  }

  // Filter notifications by viewMode
  const filteredNotifs = allNotifs.filter((n) =>
    viewMode === 'unread' ? n.status === 'unread' : true
  )

  // Group notifications
  const groupedNotifs = groupNotifications(filteredNotifs)

  // Create display data with group headers
  const displayData: {
    type: 'header' | 'item'
    data: string | Notification
  }[] = []
  Object.entries(groupedNotifs).forEach(([groupKey, notifs]) => {
    displayData.push({ type: 'header', data: groupKey })
    notifs.forEach((notif) => {
      displayData.push({ type: 'item', data: notif })
    })
  })

  // Pagination
  const paginatedData = displayData.slice(0, page * pageSize)

  const handleLoadMore = () => {
    if (page * pageSize < displayData.length) {
      setPage(page + 1)
    }
  }

  const renderItem = ({
    item,
  }: {
    item: { type: 'header' | 'item'; data: string | Notification }
  }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupHeaderText}>{item.data as string}</Text>
        </View>
      )
    } else {
      const notif = item.data as Notification
      const timeText = formatTimeDisplay(notif.created_at)
      const isBold = notif.status === 'unread'
      const typeColor = getTypeColor(notif.type)

      return (
        <TouchableOpacity
          onPress={() => showNotificationDetail(notif)}
          style={[
            styles.itemContainer,
            { backgroundColor: isBold ? 'rgba(33,150,243,0.1)' : 'white' },
          ]}
        >
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, isBold && { fontWeight: 'bold' }]}>
              {notif.header}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <Text style={styles.typeBadgeText}>
                {getTypeLabel(notif.type)}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.itemDesc,
              isBold && { fontWeight: '600', color: '#000' },
            ]}
            numberOfLines={2}
          >
            {notif.description}
          </Text>
          <Text style={styles.timeText}>{timeText}</Text>
        </TouchableOpacity>
      )
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f0f0' }}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'all' && styles.tabButtonActive,
          ]}
          onPress={() => {
            setViewMode('all')
            setPage(1)
          }}
        >
          <Text style={styles.tabText}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'unread' && styles.tabButtonActive,
          ]}
          onPress={() => {
            setViewMode('unread')
            setPage(1)
          }}
        >
          <Text style={styles.tabText}>Chưa đọc</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {paginatedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có thông báo</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={paginatedData}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.type === 'header'
                ? `header-${index}`
                : `item-${(item.data as Notification).id}`
            }
            contentContainerStyle={{ padding: 10 }}
          />
          {page * pageSize < displayData.length && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>
                Xem thêm
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Notification Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedNotif && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Chi tiết thông báo</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.notifDetailHeader}>
                    <Text style={styles.notifDetailTitle}>
                      {selectedNotif.header}
                    </Text>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: getTypeColor(selectedNotif.type) },
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>
                        {getTypeLabel(selectedNotif.type)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.notifDetailDesc}>
                    {selectedNotif.description}
                  </Text>

                  <View style={styles.notifDetailInfo}>
                    <Text style={styles.infoLabel}>Thời gian:</Text>
                    <Text style={styles.infoValue}>
                      {format(
                        parseISO(selectedNotif.created_at),
                        'HH:mm:ss - dd/MM/yyyy',
                        {
                          locale: vi,
                        }
                      )}
                    </Text>
                  </View>

                  <View style={styles.notifDetailInfo}>
                    <Text style={styles.infoLabel}>Trạng thái:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        {
                          color:
                            selectedNotif.status === 'unread'
                              ? '#ff9800'
                              : '#4caf50',
                        },
                      ]}
                    >
                      {selectedNotif.status === 'unread'
                        ? 'Chưa đọc'
                        : 'Đã đọc'}
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor:
                          selectedNotif.status === 'unread'
                            ? '#4caf50'
                            : '#ff9800',
                      },
                    ]}
                    onPress={() =>
                      updateNotificationStatus(
                        selectedNotif.id,
                        selectedNotif.status === 'unread' ? 'read' : 'unread'
                      )
                    }
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.actionButtonText}>
                        {selectedNotif.status === 'unread'
                          ? 'Đánh dấu đã đọc'
                          : 'Đánh dấu chưa đọc'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: '#f44336' },
                    ]}
                    onPress={() => confirmDelete(selectedNotif.id)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.actionButtonText}>Xóa thông báo</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  groupHeader: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
  groupHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDesc: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  loadMoreBtn: {
    backgroundColor: '#2196F3',
    padding: 12,
    margin: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 0,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  notifDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  notifDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  notifDetailDesc: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 20,
  },
  notifDetailInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  actionButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
