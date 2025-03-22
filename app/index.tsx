import * as React from 'react'
import { Text, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Home from './Home'
import Devices from './Devices'
import Cameras from './Cameras'
import Notifications from './Notifications'
import AboutUs from './AboutUs'
import CustomHeader from './layouts/CustomHeader'
import TabNavigator from './layouts/TabNavigator'
import RootStack from './layouts/RootStack'

import { RootStackParamList } from '../types/RootStackParamList'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const Tab = createBottomTabNavigator<RootStackParamList>()
const Stack = createNativeStackNavigator<RootStackParamList>()

const Index = () => {
  return <RootStack />
}

export default Index
