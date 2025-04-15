import { Text, View, Button } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TabNavigatorParamList } from '../types/TabNavigatorParamList'
import { useAuth } from './contexts/AuthContext'

export default function Settings() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Page</Text>
      <Button title="Đăng xuất" onPress={handleLogout} />
    </View>
  )
}
