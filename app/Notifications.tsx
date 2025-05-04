//@ts-nocheck
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import {
  format,
  parseISO,
  isToday,
  isWithinInterval,
  subDays,
  subWeeks,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { fakeNotifications } from '../api/fakeNotifications'
import { useIsFocused } from '@react-navigation/native'
// import useSocket from './contexts/SocketContext'
import { socket } from '@/lib/socket'

// Định nghĩa kiểu cho Notification
interface Notification {
  id: number
  title: string
  description: string
  is_read: boolean
  timestamp: string // ISO format
}

// Hàm nhóm thông báo theo khoảng thời gian
const groupNotifications = (notifications: Notification[]) => {
  const groups: { [key: string]: Notification[] } = {}
  const now = new Date()

  notifications.forEach((notif) => {
    const date = parseISO(notif.timestamp)
    let groupKey = ''

    // Hôm nay (< 24h)
    if (isToday(date)) {
      groupKey = 'Hôm nay'
    }
    // Dưới 7 ngày
    else if (isWithinInterval(date, { start: subDays(now, 7), end: now })) {
      groupKey = 'Vài ngày trước'
    }
    // Dưới 4 tuần (Vài tuần trước)
    else if (isWithinInterval(date, { start: subWeeks(now, 4), end: now })) {
      groupKey = 'Vài tuần trước'
    }
    // Vài tháng trước (theo tháng cụ thể)
    else {
      const month = format(date, 'MMMM yyyy', { locale: vi })
      groupKey = `Trong ${month}`
    }

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notif)
  })

  return groups
}

// Hàm định dạng thời gian
const formatTimeDisplay = (timestamp: string) => {
  const date = parseISO(timestamp)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // Dưới 24h
  if (isToday(date)) {
    if (diffInSeconds < 60) {
      return `${diffInSeconds} giây trước`
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} phút trước`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} giờ trước`
    }
  }
  // Dưới 7 ngày
  else if (isWithinInterval(date, { start: subDays(now, 7), end: now })) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} ngày trước`
  }
  // Các trường hợp còn lại hiển thị ngày cụ thể
  return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
}

export default function Notifications() {
  const [loading, setLoading] = useState(true)
  const [allNotifs, setAllNotifs] = useState<Notification[]>([])
  const [viewMode, setViewMode] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const isFocused = useIsFocused()

  // const socket = useSocket()

  // config websocket

  useEffect(() => {
        // const handleNotification = ({id, user_id, type, header, status, description, created_at, updated_at}) => {
        const handleNotification = (notif: any) => {
        // TODO: push notification and re-fetch notifications
        console.log('A noti is sent from the server')
        console.log(notif)
        }
    
        if (socket) {
            socket.on('notification', handleNotification)
        }

        // // code if need to send message to server
        // const interval = setInterval(() => {
        //     console.log('Fetching notifications...')
        //     socket.emit('get-noti', {noti: "This is a noti from fe"})
        // }, 5 * 1000) // 5 sec
    
        return () => {
            if (socket) {
                socket.off('notification', handleNotification)
            }
        }
    }, [])

  useEffect(() => {
    if (isFocused) {
      fetchNotifications()
    }
  }, [isFocused])

  const fetchNotifications = () => {
    setLoading(true)
    setTimeout(() => {
      const sorted = [...fakeNotifications].sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })
      setAllNotifs(sorted)
      setLoading(false)
    }, 800)
  }

  // Lọc thông báo theo viewMode
  const filteredNotifs = allNotifs.filter((n) =>
    viewMode === 'unread' ? !n.is_read : true
  )

  // Nhóm thông báo
  const groupedNotifs = groupNotifications(filteredNotifs)

  // Tạo danh sách hiển thị với tiêu đề nhóm
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

  // Phân trang
  const paginatedData = displayData.slice(0, page * pageSize)

  const handleLoadMore = () => {
    if (page * pageSize < displayData.length) {
      setPage(page + 1)
    }
  }

  const renderItem = ({
    item,
  }: {
    item: { type: 'header' | 'item'; data: any }
  }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.groupHeader}>
          <Text style={styles.groupHeaderText}>{item.data}</Text>
        </View>
      )
    } else {
      const notif = item.data as Notification
      const timeText = formatTimeDisplay(notif.timestamp)
      const isBold = !notif.is_read

      return (
        <View
          style={[
            styles.itemContainer,
            { backgroundColor: isBold ? 'rgba(33,150,243,0.1)' : 'white' },
          ]}
        >
          <Text style={[styles.itemTitle, isBold && { fontWeight: 'bold' }]}>
            {notif.title}
          </Text>
          <Text
            style={[
              styles.itemDesc,
              isBold && { fontWeight: '600', color: '#000' },
            ]}
          >
            {notif.description}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {timeText}
          </Text>
        </View>
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

      {/* Danh sách */}
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

      {/* Nút Xem Thêm */}
      {page * pageSize < displayData.length && (
        <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Xem thêm</Text>
        </TouchableOpacity>
      )}
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
    padding: 10,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 5,
  },
  itemTitle: {
    fontSize: 16,
    color: '#333',
  },
  itemDesc: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  loadMoreBtn: {
    backgroundColor: '#2196F3',
    padding: 12,
    margin: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
})