import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Bell, X } from 'lucide-react-native';

interface NotificationBannerProps {
  title: string;
  message: string;
  visible: boolean;
  onDismiss: () => void;
  type?: 'info' | 'warning' | 'success';
}

export function NotificationBanner({
  title,
  message,
  visible,
  onDismiss,
  type = 'info'
}: NotificationBannerProps) {
  const [slideAnim] = useState(new Animated.Value(-150));

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const bgColor = type === 'warning' ? '#FEF3C7' : type === 'success' ? '#D1FAE5' : '#DBEAFE';
  const borderColor = type === 'warning' ? '#F59E0B' : type === 'success' ? '#10B981' : '#3B82F6';
  const iconColor = type === 'warning' ? '#D97706' : type === 'success' ? '#059669' : '#2563EB';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <Bell size={24} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <X size={20} color="#6B7280" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
});
