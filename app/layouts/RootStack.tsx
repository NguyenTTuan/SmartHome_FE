import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../types/RootStackParamList'
import TabNavigator from './TabNavigator'
import AboutUs from '../AboutUs'
import CustomHeader from './CustomHeader'
import RoomDetail from '../RoomDetail'
import Login from '../Login'
import Register from '../Register'
import { useAuth } from '../contexts/AuthContext'
import { ActivityIndicator, View } from 'react-native'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function RootStack() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        header: () => <CustomHeader name={route.name} />,
        headerShown: false,
      })}
    >
      {user ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="AboutUs"
            component={AboutUs}
            options={{ title: 'About Us', headerShown: true }}
          />
          <Stack.Screen
            name="RoomDetail"
            component={RoomDetail}
            options={{ headerShown: true }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ title: 'Đăng nhập', headerShown: true }}
          />
          <Stack.Screen
            name="Register"
            component={Register}
            options={{ title: 'Đăng ký', headerShown: true }}
          />
          <Stack.Screen
            name="AboutUs"
            component={AboutUs}
            options={{ title: 'About Us', headerShown: true }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}
