import { View, StatusBar } from 'react-native'
import VoiceChat from '../components/VoiceChat'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootStack from './layouts/RootStack'
import { AuthProvider } from './contexts/AuthContext'

export default function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="default" backgroundColor="#2196F3" />
      <RootStack />
      {/* <VoiceChat /> */}
    </AuthProvider>
  )
}
