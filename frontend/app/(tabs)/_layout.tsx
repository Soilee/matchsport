import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/Colors';

/**
 * You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <Ionicons name="apps" size={24} color={color} />,
          headerTitle: 'Matchless Fitness',
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Program',
          tabBarIcon: ({ color }) => <Ionicons name="barbell" size={24} color={color} />,
          headerTitle: 'Antrenmanım',
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.qrIconContainer}>
              <Ionicons name="qr-code" size={32} color="#fff" />
            </View>
          ),
          headerTitle: 'Giriş/Çıkış Tara',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Gelişim',
          tabBarIcon: ({ color }) => <Ionicons name="trending-up" size={24} color={color} />,
          headerTitle: 'Gelişimim',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
          headerTitle: 'Hesabım',
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          href: null, // Hidden from tab bar, accessed elsewhere if needed
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          href: null, // Hidden from tab bar to simplify
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          href: null, // Hidden from tab bar as per user request
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1E1E2E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  header: {
    backgroundColor: Colors.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  qrIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 5,
    borderColor: '#1E1E2E',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
