import * as React from 'react'
import { Text, View, StatusBar } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import RootStack from './layouts/RootStack'

import { RootStackParamList } from '../types/RootStackParamList'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

const Tab = createBottomTabNavigator<RootStackParamList>()
const Stack = createNativeStackNavigator<RootStackParamList>()

const Index = () => {
  return (
    <>
      <StatusBar barStyle="default" backgroundColor="#2196F3" />
      <RootStack />
    </>
  )
}

export default Index
