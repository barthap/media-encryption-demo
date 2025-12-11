import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useHostingContext } from '@/context/app-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const hosting = useHostingContext();
  const downloadAvailable = hosting.uploadState.status === 'image_uploaded';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          headerTitle: 'Encrypt & upload',
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="arrow.up.circle.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="download"
        options={{
          title: 'Download',
          headerTitle: 'Download & decrypt',
          headerShown: true,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="arrow.down.circle.fill" color={color} />
          ),
          tabBarBadge: downloadAvailable ? '✔︎' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: 'green', // '#00ff00',
            fontSize: 8,
          },
        }}
      />
    </Tabs>
  );
}
