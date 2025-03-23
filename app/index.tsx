import { View, StatusBar } from 'react-native'
import VoiceChat from '../components/VoiceChat'
import RootStack from './layouts/RootStack'

const Index = () => {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="default" backgroundColor="#2196F3" />
      <RootStack />
      <VoiceChat />
    </View>
  )
}
export default Index
