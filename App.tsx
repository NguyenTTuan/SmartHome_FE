import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Index from './app/index'

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
