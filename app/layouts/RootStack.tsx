import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../types/RootStackParamList'
import TabNavigator from './TabNavigator'
import AboutUs from '../AboutUs'
import CustomHeader from './CustomHeader'

const Stack = createNativeStackNavigator<RootStackParamList>()
export default function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        header: () => <CustomHeader name={route.name} />,
        headerShown: false,
      })}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="AboutUs"
        component={AboutUs}
        options={{ title: 'About Us', headerShown: true }}
      />
    </Stack.Navigator>
  )
}
