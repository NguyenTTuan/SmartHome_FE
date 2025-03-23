import * as React from 'react'
import { View, Text, TouchableOpacity, Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../types/RootStackParamList'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AboutUs'>

interface HeaderProps {
  name: string
}

export default function CustomHeader({ name }: HeaderProps) {
  const navigation = useNavigation<NavigationProp>()

  const renderIcon = (size: number = 20, color: string = 'white') => {
    if (name === 'Home') {
      return <Ionicons name="home" size={size} color={color} />
    } else if (name === 'Devices') {
      return <MaterialCommunityIcons name="devices" size={size} color={color} />
    } else if (name === 'Cameras') {
      return <MaterialCommunityIcons name="cctv" size={size} color={color} />
    } else if (name === 'Notifications') {
      return <Ionicons name="notifications" size={size} color={color} />
    } else if (name === 'AboutUs') {
      return <Ionicons name="information-circle" size={size} color={color} />
    } else if (name === 'Settings') {
      return <Ionicons name="settings" size={size} color={color} />
    }
    return null
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#2196F3',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Image
          source={require('../../assets/images/smarthome-logo.png')}
          style={{ width: 40, height: 40, marginRight: 10, borderRadius: 150 }}
        />
        <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }}>
          SmartHome
        </Text>
        <Text
          style={{
            fontSize: 20,
            color: 'white',
            fontWeight: 'bold',
            paddingLeft: 10,
          }}
        >
          {renderIcon()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('AboutUs')}>
        <Ionicons name="information-circle" size={30} color="white" />
      </TouchableOpacity>
    </View>
  )
}
