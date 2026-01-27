import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageSquare, X, Mail, MailOpen } from 'lucide-react-native';

interface Message {
  id: string;
  subject: string;
  message_body: string;
  sender_name: string;
  sender_type: string;
  read: boolean;
  received_at: string;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('myhealth_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('received_at', { ascending: false });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('myhealth_messages')
        .update({ read: true })
        .eq('id', messageId);

      setMessages(messages.map(m =>
        m.id === messageId ? { ...m, read: true } : m
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const openMessage = (message: Message) => {
    setSelectedMessage(message);
    setModalVisible(true);
    if (!message.read) {
      markAsRead(message.id);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MyHealth Messages</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <View style={styles.headerIcon}>
          <MessageSquare color="#0066cc" size={28} />
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare color="#999" size={48} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Messages from your healthcare providers will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.messagesList}>
            {messages.map((message) => (
              <TouchableOpacity
                key={message.id}
                style={[
                  styles.messageCard,
                  !message.read && styles.messageCardUnread,
                ]}
                onPress={() => openMessage(message)}
              >
                <View style={styles.messageIcon}>
                  {message.read ? (
                    <MailOpen color="#999" size={24} />
                  ) : (
                    <Mail color="#0066cc" size={24} />
                  )}
                </View>
                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.messageSender, !message.read && styles.unreadText]}>
                      {message.sender_name}
                    </Text>
                    {!message.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={[styles.messageSubject, !message.read && styles.unreadText]}>
                    {message.subject}
                  </Text>
                  <Text style={styles.messagePreview} numberOfLines={2}>
                    {message.message_body}
                  </Text>
                  <Text style={styles.messageDate}>{formatDate(message.received_at)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Message</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <X color="#1a1a1a" size={24} />
            </TouchableOpacity>
          </View>

          {selectedMessage && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalMessageHeader}>
                <Text style={styles.modalSender}>{selectedMessage.sender_name}</Text>
                <Text style={styles.modalDate}>
                  {new Date(selectedMessage.received_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <Text style={styles.modalSubject}>{selectedMessage.subject}</Text>

              <View style={styles.divider} />

              <Text style={styles.modalBody}>{selectedMessage.message_body}</Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  This is a message from your healthcare provider through MyHealth.
                  To reply, please use the MyHealth app or portal.
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e6f2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  unreadCount: {
    fontSize: 14,
    color: '#0066cc',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  messageCardUnread: {
    borderColor: '#0066cc',
    borderLeftWidth: 4,
  },
  messageIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0066cc',
    marginLeft: 8,
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  unreadText: {
    fontWeight: '700',
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  messageDate: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalMessageHeader: {
    marginBottom: 16,
  },
  modalSender: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
  },
  modalSubject: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginBottom: 24,
  },
  modalBody: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
});
