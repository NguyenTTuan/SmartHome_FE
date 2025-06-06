import { Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'
import { TabNavigatorParamList } from '@/types/TabNavigatorParamList'

type NavigationProp = NativeStackNavigationProp<
  TabNavigatorParamList,
  'Cameras'
>

export default function Cameras() {
  const navigation = useNavigation<NavigationProp>()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Camera Page</Text>
    </View>
  )
}
