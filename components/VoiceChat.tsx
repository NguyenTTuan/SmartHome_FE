import { useState, useEffect } from 'react'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const VoiceChat = ({ onTranscriptReceived = (text: string) => {} }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [permissionResponse, requestPermission] = Audio.usePermissions()
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showTranscription, setShowTranscription] = useState(false)
  const scaleAnim = new Animated.Value(0.7)

  useEffect(() => {
    if (modalVisible && recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.7,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      scaleAnim.setValue(1)
    }
  }, [modalVisible, recording])

  async function startRecording() {
    try {
      setShowTranscription(false)
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..')
        await requestPermission()
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      console.log('Starting recording..')
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      setRecording(recording)
      setModalVisible(true)
      setTranscript('')
      console.log('Recording started')
    } catch (err) {
      console.error('Failed to start recording', err)
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..')
    if (recording) {
      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      const uri = recording.getURI()
      console.log('Recording stopped and stored at', uri)

      if (uri) {
        setIsTranscribing(true)
        try {
          await transcribeAudio(uri)
          setShowTranscription(true)
        } catch (error) {
          console.error('Transcription error:', error)
          setTranscript('Failed to transcribe audio. Please try again.')
          setShowTranscription(true)
        } finally {
          setIsTranscribing(false)
        }
      }
    }
    setRecording(null)
  }

  function closeModal() {
    setModalVisible(false)
    setShowTranscription(false)
  }

  async function transcribeAudio(audioUri: string) {
    // try {
    //   // Check if the file exists and get its info
    //   const fileInfo = await FileSystem.getInfoAsync(audioUri)
    //   if (!fileInfo.exists) {
    //     throw new Error('Audio file does not exist')
    //   }

    //   // Create a FormData object to send the audio file
    //   const formData = new FormData()
    //   formData.append('audio', {
    //     uri: audioUri,
    //     type: 'audio/m4a', // or the appropriate MIME type for your audio
    //     name: 'speech.m4a',
    //   } as any)

    //   // Send the audio file to a speech-to-text API
    //   // Replace with your preferred STT API endpoint
    //   const response = await fetch(
    //     'https://your-speech-to-text-api.com/transcribe',
    //     {
    //       method: 'POST',
    //       body: formData,
    //       headers: {
    //         'Content-Type': 'multipart/form-data',
    //         // Add any API keys or authentication headers here
    //         // 'Authorization': 'Bearer YOUR_API_KEY',
    //       },
    //     }
    //   )

    //   if (!response.ok) {
    //     throw new Error(`Error ${response.status}: ${response.statusText}`)
    //   }

    //   const result = await response.json()

    //   // Assuming the API returns a transcript field
    //   const transcribedText = result.transcript || ''

    //   setTranscript(transcribedText)
    //   onTranscriptReceived(transcribedText)

    //   return transcribedText
    // } catch (error) {
    //   console.error('Transcription error:', error)
    //   throw error
    // }

    try {
      // Simulate a 5-second delay
      await new Promise((resolve) => setTimeout(resolve, 5000))

      // Mocked transcript
      const transcribedText = 'Mở đèn phòng khách giúp tao'

      setTranscript(transcribedText)
      onTranscriptReceived(transcribedText)

      return transcribedText
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }

  return (
    <View>
      {/* Floating Mic Button */}
      <TouchableOpacity onPress={startRecording} style={styles.floatingButton}>
        <Ionicons name="mic" size={20} color="white" />
      </TouchableOpacity>

      {/* Voice Chat Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={recording ? stopRecording : closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {isTranscribing ? (
              <>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.recordingText}>Đang xử lý...</Text>
              </>
            ) : showTranscription ? (
              <>
                <View style={styles.transcriptModalContainer}>
                  <Text style={styles.transcriptHeading}>Nhận yêu cầu:</Text>
                  <ScrollView style={styles.transcriptScroll}>
                    <Text style={styles.transcriptText}>
                      {transcript ||
                        'Không thể nhận diện giọng nói. Vui lòng thử lại !'}
                    </Text>
                  </ScrollView>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      onPress={startRecording}
                      style={[styles.actionButton, styles.retryButton]}
                    >
                      <Text style={styles.actionButtonText}>Ghi lại</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={closeModal}
                      style={[
                        styles.actionButton,
                        styles.doneButton,
                        !transcript && { backgroundColor: '#555555' },
                      ]}
                      disabled={!transcript}
                    >
                      <Text style={styles.actionButtonText}>Xong</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Pulsating Animation */}
                <Animated.View
                  style={[
                    styles.micContainer,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <Ionicons name="mic" size={24} color="white" />
                </Animated.View>

                <Text style={styles.recordingText}>Đang nghe...</Text>

                {/* Stop Recording Button */}
                <TouchableOpacity
                  onPress={stopRecording}
                  style={styles.stopButton}
                >
                  <Text style={styles.stopButtonText}>Dừng</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5, // Android shadow
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  micContainer: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  transcriptContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    maxHeight: 200,
    marginHorizontal: 20,
  },
  transcriptModalContainer: {
    width: '100%',
    alignItems: 'center',
  },
  transcriptHeading: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 18,
    alignSelf: 'flex-start',
  },
  transcriptScroll: {
    maxHeight: 150,
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: 'red',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
})

export default VoiceChat
