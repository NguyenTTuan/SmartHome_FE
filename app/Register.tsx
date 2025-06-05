import React, { useState } from 'react'
import {
  Text,
  View,
  Image,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native'
import axios, { AxiosError } from 'axios'
import { useAuth } from './contexts/AuthContext'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'
import Constants from 'expo-constants'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>

const API_HOST = process.env.EXPO_PUBLIC_API_HOST
const API = `${API_HOST}/api/v1/access`

export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [check_password, setCheckPassword] = useState('')
  const navigation = useNavigation<NavigationProp>()

  const handleRegister = async () => {
    if (!username || !password || !check_password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin')
      return
    } else {
      if (check_password != password) {
        Alert.alert('Lỗi', 'Mật khẩu không trùng khớp !')
        return
      }
      try {
        const res = await axios.post(`${API}/register`, { username, password })
        Alert.alert('Thành công', 'Đăng ký thành công, vui lòng đăng nhập lại')
        navigation.goBack()
      } catch (e) {
        if (e instanceof AxiosError) {
          const errorMessage = e.response?.data?.message || 'Đăng ký thất bại'
          Alert.alert('Lỗi', errorMessage)
        } else {
          Alert.alert('Lỗi', 'Đăng ký thất bại')
        }
      }
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}>
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
        <TextInput
          placeholder="Nhập lại mật khẩu"
          secureTextEntry
          value={check_password}
          onChangeText={setCheckPassword}
          style={styles.input}
        />
        <Button title="Đăng ký" onPress={handleRegister} />
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFC',
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
  loginText: {
    marginTop: 16,
    color: '#2196F3',
  },
})
