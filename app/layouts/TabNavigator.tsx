import * as React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Home from './../Home'
import Devices from './../Devices'
import DevicesStack from './../DevicesStack'
import Cameras from './../Cameras'
import Notifications from './../Notifications'
import Settings from './../Settings'
import CustomHeader from './CustomHeader'
import { TabNavigatorParamList } from '../../types/TabNavigatorParamList'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const Tab = createBottomTabNavigator<TabNavigatorParamList>()

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <CustomHeader name={route.name} />,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home')
            return <Ionicons name="home" size={size} color={color} />
          else if (route.name === 'Devices')
            return (
              <MaterialCommunityIcons
                name="devices"
                size={size}
                color={color}
              />
            )
          else if (route.name === 'Cameras')
            return (
              <MaterialCommunityIcons name="cctv" size={size} color={color} />
            )
          else if (route.name === 'Notifications')
            return <Ionicons name="notifications" size={size} color={color} />
          else if (route.name === 'Settings')
            return <Ionicons name="settings" size={size} color={color} />
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{ title: 'Trang chủ' }}
      />
      <Tab.Screen
        name="Devices"
        component={DevicesStack}
        options={{ title: 'Thiết bị' }}
      />
      <Tab.Screen
        name="Cameras"
        component={Cameras}
        options={{ title: 'Camera' }}
      />
      <Tab.Screen
        name="Notifications"
        component={Notifications}
        options={{ title: 'Thông báo' }}
      />
      <Tab.Screen
        name="Settings"
        component={Settings}
        options={{ title: 'Cài đặt' }}
      />
    </Tab.Navigator>
  )
}

export default TabNavigator
