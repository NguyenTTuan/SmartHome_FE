import { Text, View, Button, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { TabNavigatorParamList } from '../types/TabNavigatorParamList'
import { useAuth } from './contexts/AuthContext'

export default function Settings() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn muốn đăng xuất phải không ?', [
      {
        text: 'Hủy',
        style: 'cancel',
      },
      {
        text: 'Đồng ý',
        onPress: async () => {
          try {
            await logout()
          } catch (error) {
            Alert.alert('Lỗi', 'Đăng xuất thất bại')
          }
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Page</Text>
      <Button title="Đăng xuất" onPress={handleLogout} />
    </View>
  )
}
