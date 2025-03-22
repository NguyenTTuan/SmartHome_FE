import { ScrollView } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import Index from './app/index'

export default function App() {
  return (
    <ScrollView>
      <NavigationContainer>
        <Index />
      </NavigationContainer>
    </ScrollView>
  )
}
