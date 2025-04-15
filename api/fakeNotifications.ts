// Giả lập dữ liệu thông báo
// timestamp = string iso format hoặc number (milliseconds)
export const fakeNotifications = [
    {
      id: 1,
      title: 'Bật đèn phòng khách',
      description: 'Hệ thống đã tự động bật đèn phòng khách',
      is_read: false,
      timestamp: new Date(Date.now() - 30 * 1000).toISOString(), // 30 giây trước
    },
    {
      id: 2,
      title: 'Bật điều hòa',
      description: 'Phòng ngủ đã bật điều hòa lúc 9:00 AM',
      is_read: true,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 phút trước
    },
    {
      id: 3,
      title: 'Tắt quạt',
      description: 'Quạt phòng khách đã tắt lúc 10:00 AM',
      is_read: false,
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 giờ trước
    },
    {
      id: 4,
      title: 'Cập nhật hệ thống',
      description: 'Bản cập nhật firmware mới đã sẵn sàng',
      is_read: true,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 ngày trước
    },
    {
      id: 5,
      title: 'Cảm biến khói',
      description: 'Có khói nhẹ trong bếp vào lúc 7:00 AM',
      is_read: false,
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 ngày trước
    },
    {
      id: 6,
      title: 'Cảm biến cửa',
      description: 'Cửa chính mở lúc 8:00 AM',
      is_read: false,
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 ngày trước
    },
    {
      id: 7,
      title: 'Camera sân sau',
      description: 'Camera sân sau phát hiện chuyển động',
      is_read: true,
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 ngày trước
    },
    {
      id: 8,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 9,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 10,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 11,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 12,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 13,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 14,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 15,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 70 * 24 * 60 * 34 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 16,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 17,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
    {
      id: 18,
      title: 'Cảnh báo pin',
      description: 'Chuông cửa sắp hết pin',
      is_read: true,
      timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 40 ngày
    },
  ]
  