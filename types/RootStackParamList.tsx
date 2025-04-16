import { NavigatorScreenParams } from '@react-navigation/native'
import { TabNavigatorParamList } from './TabNavigatorParamList'

export type RootStackParamList = {
  Login: undefined
  Register: undefined
  Main: undefined
  AboutUs: undefined
  DevicesStack: NavigatorScreenParams<TabNavigatorParamList>
}
