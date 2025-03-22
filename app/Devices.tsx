import { Text, View, Button } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Devices'>

export default function Devices() {
  const navigation = useNavigation<NavigationProp>()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Devices Page</Text>
      <Button
        title="Go to Cameras"
        onPress={() => {
          navigation.navigate('Cameras')
        }}
      />
    </View>
  )
}
