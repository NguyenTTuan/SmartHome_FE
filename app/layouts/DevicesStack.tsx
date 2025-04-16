import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Devices from '../Devices'
import DeviceDetail from '../DeviceDetail'
import { TabNavigatorParamList } from '@/types/TabNavigatorParamList'
import RoomDetail from '../RoomDetail'

const Stack = createNativeStackNavigator<TabNavigatorParamList>()

const DevicesStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Devices"
        component={Devices}
        options={{ title: 'Thiết bị', headerShown: false }}
      />
      <Stack.Screen
        name="DeviceDetail"
        component={DeviceDetail}
        options={{ title: 'Chi tiết thiết bị', headerShown: false }}
      />
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetail}
        options={{ title: 'Chi tiết phòng', headerShown: false }}
      />
    </Stack.Navigator>
  )
}

export default DevicesStack
