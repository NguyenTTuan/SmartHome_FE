import React from 'react'
import { View, Text } from 'react-native'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../types/RootStackParamList'

type RoomDetailRouteProp = RouteProp<RootStackParamList, 'RoomDetail'>

interface Props {
  route: RoomDetailRouteProp
}

export default function RoomDetail({ route }: Props) {
  const { room } = route.params // Lấy tham số 'room' từ navigation

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        Chi tiết phòng: {room}
      </Text>
      {/* Hiển thị danh sách thiết bị của phòng ở đây */}
    </View>
  )
}
