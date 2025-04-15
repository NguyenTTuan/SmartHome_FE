import React, { useState } from 'react'
import {
  View,
  TextInput,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useAuth } from './contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login } = useAuth()
  const navigation = useNavigation<NavigationProp>()

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin')
      return
    } else {
      try {
        await login(username, password)
      } catch (e) {
        console.log(e)
        Alert.alert('Lỗi', 'Đăng nhập thất bại')
      }
    }
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/smarthome-logo.png')}
        style={styles.logo}
      />
      <TextInput
        placeholder="Tên đăng nhập"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Mật khẩu"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      <Button title="Đăng nhập" onPress={handleLogin} />
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.registerText}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 24,
    borderRadius: 150,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  registerText: {
    marginTop: 16,
    color: '#2196F3',
  },
})
