import { apiClient } from '@/app/contexts/AuthContext'

const API_HOST = 'https://yolosmarthomeapi.ticklab.site'
const AUTH_HEADER = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
})

export const getLatestCommand = async (deviceId: string, token: string) => {
  const res = await apiClient.get(
    `${API_HOST}/api/v1/devices/${deviceId}/commands?latest=true`,
    AUTH_HEADER(token)
  )
  return res.data.data
}

export const toggleDevice = async (
  deviceId: string,
  currentState: string,
  token: string
) => {
  const newCommand = currentState
  console.log('newCommand', newCommand)
  console.log('currentState', currentState)
  const res = await apiClient.post(
    `${API_HOST}/api/v1/devices/${deviceId}/commands`,
    { command: newCommand },
    AUTH_HEADER(token)
  )
  console.log(res.data)

  return res.data.data
}

export const getDeviceCommandHistory = async (
  deviceId: string,
  token: string
) => {
  const res = await apiClient.get(
    `${API_HOST}/api/v1/devices/${deviceId}/commands`,
    AUTH_HEADER(token)
  )
  const commands = res.data.data
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return commands.filter(
    (cmd: any) => new Date(cmd.created_at) >= thirtyDaysAgo
  )
}
