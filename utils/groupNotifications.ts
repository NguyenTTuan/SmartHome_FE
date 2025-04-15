import {
    format,
    isToday,
    isThisWeek,
    isThisMonth,
    subDays,
  } from 'date-fns'
  import { vi } from 'date-fns/locale'
  
export const groupNotificationsByTime = (notifications: Notification[]) => {
  const now = new Date()

  const groups: { [key: string]: Notification[] } = {
    'Hôm nay': [],
    'X ngày trước': [],
    'Vài tuần trước': [],
    'Vài tháng trước': [],
  }

  for (const noti of notifications) {
    const date = typeof noti.timestamp === 'string' ? parseISO(noti.timestamp) : new Date(noti.timestamp)
    const diff = (now.getTime() - date.getTime()) / 1000

    if (diff < 60 * 60 * 24) {
      groups['Hôm nay'].push(noti)
    } else if (diff < 60 * 60 * 24 * 7) {
      groups['X ngày trước'].push(noti)
    } else if (diff < 60 * 60 * 24 * 30) {
      groups['Vài tuần trước'].push(noti)
    } else {
      groups['Vài tháng trước'].push(noti)
    }
  }

  return groups
}
