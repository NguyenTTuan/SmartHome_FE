import React, { useState } from 'react'
import {
  Text,
  View,
  Button,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Linking,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types/RootStackParamList'
import { Ionicons } from '@expo/vector-icons'

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'AboutUs'>

export default function AboutUs() {
  const navigation = useNavigation<NavigationProp>()

  const developmentTeam = [
    {
      name: 'Đặng Ngọc Bảo Trâm',
      email: 'tram.dang2213568cs@hcmut.edu.vn',
      role: 'Project Lead, Backend Developer',
    },
    {
      name: 'Tăng Phồn Thịnh',
      email: 'thinh.tangbaobao@hcmut.edu.vn',
      role: 'IoT Specialist',
    },
    {
      name: 'Nguyễn Truyền Tuấn',
      email: 'tuan.nguyenkhmtk22@hcmut.edu.vn',
      role: 'Mobile Developer',
    },
    {
      name: 'Lê Nhân Trung',
      email: 'trung.lewlew@hcmut.edu.vn',
      role: 'AI Engineering',
    },
    {
      name: 'Lê Ngọc Vinh',
      email: 'vinh.lengoc@hcmut.edu.vn',
      role: 'UI/UX Designer, AI Engineering',
    },
  ]

  const emailLeader = developmentTeam[0].email

  const handleEmailPress = (email: string): void => {
    Linking.openURL(`mailto:${email}`)
  }

  const [emailSubject, setEmailSubject] = useState<string>('')
  const [emailBody, setEmailBody] = useState<string>('')
  const handleEmailWithContent = (
    email: string,
    subject: string,
    body: string
  ): void => {
    Linking.openURL(
      `mailto:${email}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SmartHome Yolo Project</Text>
        <Text style={styles.versionText}>Version 1.0.0</Text>

        <Text style={styles.paragraph}>
          SmartHome Yolo is a comprehensive smart home management solution
          designed to revolutionize how you interact with your living space. Our
          app seamlessly connects to various IoT devices throughout your home,
          providing a centralized control and monitoring system.
        </Text>

        <Text style={styles.paragraph}>
          Using cutting-edge technology, SmartHome Yolo offers real-time status
          updates, powerful automation capabilities, and energy consumption
          analytics to help you create a more efficient and comfortable living
          environment.
        </Text>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Features</Text>

        <View style={styles.featureItem}>
          <Ionicons
            name="bulb-outline"
            size={24}
            color="#FFD700"
            style={styles.featureIcon}
          />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Smart Lighting Control</Text>
            <Text style={styles.featureDescription}>
              Manage all connected lights, set schedules, and create custom
              lighting scenes
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons
            name="thermometer-outline"
            size={24}
            color="#FF6347"
            style={styles.featureIcon}
          />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Climate Management</Text>
            <Text style={styles.featureDescription}>
              Monitor and control temperature, humidity, and air quality
              throughout your home
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons
            name="shield-checkmark-outline"
            size={24}
            color="#4682B4"
            style={styles.featureIcon}
          />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Security System</Text>
            <Text style={styles.featureDescription}>
              Connect with cameras, motion sensors, and door/window sensors for
              home monitoring
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons
            name="flash-outline"
            size={24}
            color="#32CD32"
            style={styles.featureIcon}
          />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Energy Management</Text>
            <Text style={styles.featureDescription}>
              Track energy usage and get insights to reduce consumption and
              costs
            </Text>
          </View>
        </View>
      </View>

      {/* Our Vision */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Vision</Text>
        <Text style={styles.paragraph}>
          At SmartHome Yolo, we believe that smart home technology should be
          accessible, intuitive, and genuinely useful for everyone. Our vision
          is to create living spaces that anticipate your needs, enhance your
          comfort, and optimize resource utilization while respecting your
          privacy and security.
        </Text>
      </View>

      {/* Team Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Development Team</Text>
        <Text style={styles.paragraph}>
          Our talented team from Ho Chi Minh University of Technology (HCMUT)
          brings diverse expertise to create an exceptional smart home
          experience.
        </Text>

        {developmentTeam.map((member, index) => (
          <View key={index} style={styles.teamMember}>
            <View style={styles.memberIconContainer}>
              <Text style={styles.memberInitials}>
                {(member.name.split(' ').pop() || '').charAt(0)}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              <TouchableOpacity onPress={() => handleEmailPress(member.email)}>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <Text style={styles.paragraph}>
          We value your feedback and are here to assist with any questions or
          issues.
        </Text>

        <View style={styles.emailForm}>
          <Text style={styles.inputLabel}>Subject:</Text>
          <TextInput
            style={styles.subjectInput}
            value={emailSubject}
            onChangeText={setEmailSubject}
            placeholder="Enter email subject"
          />

          <Text style={styles.inputLabel}>Message:</Text>
          <TextInput
            style={styles.bodyInput}
            value={emailBody}
            onChangeText={setEmailBody}
            placeholder="Type your message here"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() =>
              handleEmailWithContent(emailLeader, emailSubject, emailBody)
            }
          >
            <Text style={styles.contactButtonText}>Send Email</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GoBack */}
      <View style={{ alignSelf: 'center' }}>
        <Button
          title="Quay lại"
          onPress={() => {
            navigation.goBack()
          }}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 SmartHome Yolo Project</Text>
        <Text style={styles.footerText}>
          TN01-05 HCMUT | All Rights Reserved
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    padding: 8,
  },
  logo: {
    width: 150,
    height: 40,
    resizeMode: 'contain',
    marginLeft: 20,
  },
  section: {
    padding: 20,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  versionText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666666',
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  memberIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  memberInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 12,
    color: '#007AFF',
  },
  contactButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  emailForm: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  subjectInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    height: 120,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 4,
  },
})
