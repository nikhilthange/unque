import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
  RefreshControl,
  Vibration,
} from 'react-native';
import io from 'socket.io-client';

// Default backend resolution based on platform
const getDefaultServerUrl = () => {
  if (Platform.OS === 'android') {
    // 10.0.2.2 is the special alias for host loopback in Android emulator
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

export default function App() {
  const [serverUrl, setServerUrl] = useState(getDefaultServerUrl());
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [showConfig, setShowConfig] = useState(false);

  const [leads, setLeads] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected' | 'connecting' | 'disconnected'
  const [refreshing, setRefreshing] = useState(false);
  const [latestLeadId, setLatestLeadId] = useState(null);

  // Pulse animation for the Live indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);

  useEffect(() => {
    // Continuous subtle pulsing animation for the LIVE indicator
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Connect to Socket.IO backend
  useEffect(() => {
    console.log(`[Socket] Initializing connection to: ${serverUrl}`);
    setConnectionStatus('connecting');

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1500,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [Socket] Connected successfully!');
      setConnectionStatus('connected');
      fetchHistoricalLeads(serverUrl);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ [Socket] Disconnected:', reason);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err) => {
      console.warn('❌ [Socket] Connection error:', err.message);
      setConnectionStatus('disconnected');
    });

    // Zero-Touch Event: New Lead Received Live!
    socket.on('new_lead', (newLead) => {
      console.log('⚡ [Socket] NEW LEAD RECEIVED LIVE:', newLead);

      try {
        Vibration.vibrate([0, 80, 50, 80]);
      } catch (e) {
        // Haptics fallback on simulator
      }

      setLatestLeadId(newLead.leadgen_id);

      setLeads((prev) => {
        // Prevent duplicate leads if re-broadcasted
        const exists = prev.some((l) => l.leadgen_id === newLead.leadgen_id);
        if (exists) {
          return prev.map((l) => (l.leadgen_id === newLead.leadgen_id ? newLead : l));
        }
        return [newLead, ...prev];
      });
    });

    socket.on('leads_cleared', () => {
      setLeads([]);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  const fetchHistoricalLeads = async (url) => {
    try {
      const response = await fetch(`${url}/api/leads`);
      const data = await response.json();
      if (data && data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.log('[API] Error fetching historical leads:', err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHistoricalLeads(serverUrl);
    setRefreshing(false);
  };

  const handleSaveConfig = () => {
    let formatted = tempUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    setServerUrl(formatted);
    setShowConfig(false);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appTitle}>LeadPulse</Text>
          <Text style={styles.appSubtitle}>Meta Lead Ads Live Stream</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Connection Status Pill */}
          <View
            style={[
              styles.statusPill,
              connectionStatus === 'connected'
                ? styles.statusConnected
                : connectionStatus === 'connecting'
                ? styles.statusConnecting
                : styles.statusDisconnected,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                connectionStatus === 'connected'
                  ? styles.dotConnected
                  : connectionStatus === 'connecting'
                  ? styles.dotConnecting
                  : styles.dotDisconnected,
                connectionStatus === 'connected' ? { opacity: pulseAnim } : null,
              ]}
            />
            <Text style={styles.statusText}>
              {connectionStatus === 'connected'
                ? 'LIVE'
                : connectionStatus === 'connecting'
                ? 'CONNECTING'
                : 'OFFLINE'}
            </Text>
          </View>

          {/* Config / Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              setTempUrl(serverUrl);
              setShowConfig(true);
            }}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Leads Counter Bar */}
      <View style={styles.counterBar}>
        <Text style={styles.counterLabel}>
          RECEIVED LEADS: <Text style={styles.counterValue}>{leads.length}</Text>
        </Text>
        <Text style={styles.counterHint}>Zero-Touch Instant Sync</Text>
      </View>

      {/* Lead Feed List */}
      <FlatList
        data={leads}
        keyExtractor={(item) => String(item.leadgen_id || Math.random())}
        contentContainerStyle={leads.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#38BDF8"
            colors={['#38BDF8']}
          />
        }
        renderItem={({ item }) => {
          const isLatest = item.leadgen_id === latestLeadId;

          return (
            <View style={[styles.card, isLatest && styles.cardLatest]}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  <Text style={styles.cardName}>{item.fullName || 'Anonymous Lead'}</Text>
                  {isLatest && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>⚡ NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTime}>{formatTimestamp(item.received_at || item.created_time)}</Text>
              </View>

              {/* Source Tag */}
              <View style={styles.sourceTag}>
                <Text style={styles.sourceIcon}>📢</Text>
                <Text style={styles.sourceText}>
                  {item.source || 'Meta Lead Ad'} • Form: {item.form_id || 'Instant Form'}
                </Text>
              </View>

              {/* Contact Information */}
              <View style={styles.contactDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>✉️</Text>
                  <Text style={styles.detailText}>{item.email || 'No email provided'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailIcon}>📞</Text>
                  <Text style={styles.detailText}>{item.phoneNumber || 'No phone provided'}</Text>
                </View>
              </View>

              {/* Custom fields if any */}
              {item.customFields && Object.keys(item.customFields).length > 0 && (
                <View style={styles.customFieldsBox}>
                  {Object.entries(item.customFields).map(([key, value]) => (
                    <View key={key} style={styles.customFieldPill}>
                      <Text style={styles.customFieldKey}>{key}: </Text>
                      <Text style={styles.customFieldValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Footer with Lead ID */}
              <View style={styles.cardFooter}>
                <Text style={styles.idLabel}>ID: {item.leadgen_id}</Text>
                {item.isSimulated && (
                  <Text style={styles.sandboxBadge}>Sandbox Verified</Text>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyTitle}>Listening for Meta Leads...</Text>
            <Text style={styles.emptySubtitle}>
              Open Meta's Lead Ads Testing Tool and click "Create Lead".
              Submissions will arrive here instantly without touching this screen!
            </Text>
            <View style={styles.serverInfoPill}>
              <Text style={styles.serverInfoText}>Target: {serverUrl}</Text>
            </View>
          </View>
        }
      />

      {/* Server Configuration Modal */}
      <Modal visible={showConfig} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Server Config</Text>
            <Text style={styles.modalSubtitle}>
              Specify the IP or tunnel URL pointing to your Node.js backend:
            </Text>

            <TextInput
              style={styles.input}
              value={tempUrl}
              onChangeText={setTempUrl}
              placeholder="e.g. http://192.168.1.5:5000"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Presets */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setTempUrl('http://localhost:5000')}
              >
                <Text style={styles.presetText}>Localhost</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => setTempUrl('http://10.0.2.2:5000')}
              >
                <Text style={styles.presetText}>Android (10.0.2.2)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfig(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveConfig}
              >
                <Text style={styles.saveButtonText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  headerLeft: {
    flex: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusConnecting: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  statusDisconnected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#10B981',
  },
  dotConnecting: {
    backgroundColor: '#F59E0B',
  },
  dotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  settingsButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  settingsIcon: {
    fontSize: 16,
  },
  counterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  counterValue: {
    color: '#38BDF8',
    fontWeight: '900',
  },
  counterHint: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardLatest: {
    borderColor: '#38BDF8',
    borderWidth: 2,
    backgroundColor: '#1E293B',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  sourceIcon: {
    fontSize: 11,
    marginRight: 5,
  },
  sourceText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  contactDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailIcon: {
    fontSize: 13,
    marginRight: 8,
    width: 18,
  },
  detailText: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  customFieldsBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  customFieldPill: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  customFieldKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  customFieldValue: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  idLabel: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sandboxBadge: {
    fontSize: 10,
    color: '#A78BFA',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  serverInfoPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  serverInfoText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F8FAFC',
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetText: {
    fontSize: 11,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
