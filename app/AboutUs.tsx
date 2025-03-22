import { Text, View, Button, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AboutUs'>

export default function AboutUs() {
  const navigation = useNavigation<NavigationProp>()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>About SmartHome</Text>
      <Text style={{ textAlign: 'center', marginTop: 10 }}>
        SmartHome is an innovative smart home management app that helps you
        monitor and control your home devices seamlessly.
      </Text>
      <Button
        title="Quay lại"
        onPress={() => {
          navigation.goBack()
        }}
      />
    </View>
  )
}
