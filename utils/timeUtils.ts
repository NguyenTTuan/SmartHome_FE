export const formatRelativeTime = (timestamp: string | number): string => {
  const now = Date.now()
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
  const diff = (now - time) / 1000 // tính ra giây

  if (diff < 60) return `${Math.floor(diff)} giây trước`
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`
  return new Date(time).toLocaleDateString('vi-VN')
}
