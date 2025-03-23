import { StatusBar } from 'react-native'
import RootStack from './layouts/RootStack'

const Index = () => {
  return (
    <>
      <StatusBar barStyle="default" backgroundColor="#2196F3" />
      <RootStack />
    </>
  )
}
export default Index
