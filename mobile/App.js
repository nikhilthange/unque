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
} from 'react-native';
import io from 'socket.io-client';

const resolveDefaultHost = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

// Animated Card for incoming leads with smooth fade-in and highlight
function LeadCard({ item, isLatest }) {
  const fadeAnim = useRef(new Animated.Value(isLatest ? 0.3 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isLatest ? -12 : 0)).current;

  useEffect(() => {
    if (isLatest) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLatest, fadeAnim, slideAnim]);

  const formatTimestamp = (iso) => {
    if (!iso) return 'Just now';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        isLatest && styles.cardHighlighted,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.nameBlock}>
          <Text style={styles.leadName}>{item.fullName || 'Lead Submission'}</Text>
          {isLatest && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.timeLabel}>{formatTimestamp(item.received_at || item.created_time)}</Text>
      </View>

      {/* Meta Ad Source Tag */}
      <View style={styles.sourceTag}>
        <Text style={styles.sourceText}>
          {item.source || 'Meta Lead Ad'} • Form: {item.form_id || 'Instant Form'}
        </Text>
      </View>

      {/* Contact Details */}
      <View style={styles.contactSection}>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Email</Text>
          <Text style={styles.dataValue} numberOfLines={1}>
            {item.email || 'No email provided'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Phone</Text>
          <Text style={styles.dataValue}>{item.phoneNumber || 'No phone provided'}</Text>
        </View>
      </View>

      {/* Custom Questions / Form Answers */}
      {item.customFields && Object.keys(item.customFields).length > 0 && (
        <View style={styles.customGrid}>
          {Object.entries(item.customFields).map(([k, v]) => (
            <View key={k} style={styles.customChip}>
              <Text style={styles.customChipKey}>{k}: </Text>
              <Text style={styles.customChipVal}>{String(v)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Card Footer with Meta Leadgen ID */}
      <View style={styles.cardFooter}>
        <Text style={styles.idText}>ID: {item.leadgen_id}</Text>
        {item.page_id ? <Text style={styles.pageText}>Page: {item.page_id}</Text> : null}
      </View>
    </Animated.View>
  );
}

export default function App() {
  const [serverUrl, setServerUrl] = useState(resolveDefaultHost());
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [leads, setLeads] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connected | connecting | disconnected
  const [refreshing, setRefreshing] = useState(false);
  const [latestLeadId, setLatestLeadId] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);

  // Pulse animation for LIVE indicator dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Socket.IO lifecycle
  useEffect(() => {
    setConnectionStatus('connecting');

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      fetchLeads(serverUrl);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    // Zero-Touch Event: New lead received from Meta webhook broadcast
    socket.on('new_lead', (newLead) => {
      setLatestLeadId(newLead.leadgen_id);

      setLeads((prev) => {
        const exists = prev.some((l) => l.leadgen_id === newLead.leadgen_id);
        if (exists) {
          return prev.map((l) => (l.leadgen_id === newLead.leadgen_id ? newLead : l));
        }
        return [newLead, ...prev];
      });
    });

    socket.on('leads_cleared', () => {
      setLeads([]);
      setLatestLeadId(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverUrl]);

  const fetchLeads = async (url) => {
    try {
      const res = await fetch(`${url}/api/leads`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads(serverUrl);
    setRefreshing(false);
  };

  const clearAllLeads = async () => {
    try {
      await fetch(`${serverUrl}/api/leads`, { method: 'DELETE' });
      setLeads([]);
      setLatestLeadId(null);
    } catch {
      setLeads([]);
    }
  };

  const handleSaveUrl = () => {
    let clean = tempUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    setServerUrl(clean);
    setIsConfigOpen(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Main Top Navigation Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <Text style={styles.brandTitle}>LeadStream</Text>
          <Text style={styles.brandSubtitle}>Meta Lead Ads Live Sync</Text>
        </View>

        <View style={styles.navRight}>
          {/* Status Badge with Live Dot */}
          <View
            style={[
              styles.statusPill,
              connectionStatus === 'connected'
                ? styles.pillOnline
                : connectionStatus === 'connecting'
                ? styles.pillConnecting
                : styles.pillOffline,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                connectionStatus === 'connected'
                  ? styles.dotOnline
                  : connectionStatus === 'connecting'
                  ? styles.dotConnecting
                  : styles.dotOffline,
                connectionStatus === 'connected' ? { opacity: pulseAnim } : null,
              ]}
            />
            <Text style={styles.statusLabel}>
              {connectionStatus === 'connected'
                ? 'LIVE'
                : connectionStatus === 'connecting'
                ? 'CONNECTING'
                : 'OFFLINE'}
            </Text>
          </View>

          {/* Config Settings Button */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              setTempUrl(serverUrl);
              setIsConfigOpen(true);
            }}
          >
            <Text style={styles.headerBtnText}>Config</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats & Actions Subheader */}
      <View style={styles.subHeader}>
        <Text style={styles.statsCount}>
          Active Leads: <Text style={styles.statsCountHighlight}>{leads.length}</Text>
        </Text>
        <View style={styles.subHeaderActions}>
          {leads.length > 0 && (
            <TouchableOpacity onPress={clearAllLeads} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear List</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Leads Feed */}
      <FlatList
        data={leads}
        keyExtractor={(item) => String(item.leadgen_id || Math.random())}
        extraData={latestLeadId}
        contentContainerStyle={leads.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#38BDF8"
            colors={['#38BDF8']}
          />
        }
        renderItem={({ item }) => (
          <LeadCard item={item} isLatest={item.leadgen_id === latestLeadId} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <View style={styles.emptyCircle}>
              <Text style={styles.emptySignal}>●</Text>
            </View>
            <Text style={styles.emptyHeader}>Listening for Submissions</Text>
            <Text style={styles.emptySubtext}>
              Submit a lead using Meta's Lead Ads Testing Tool. Incoming leads will appear here in real
              time without touching this device.
            </Text>
            <View style={styles.urlPill}>
              <Text style={styles.urlPillText}>{serverUrl}</Text>
            </View>
          </View>
        }
      />

      {/* Server Configuration Modal */}
      <Modal visible={isConfigOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Connection</Text>
            <Text style={styles.modalDescription}>
              Set the backend IP or tunnel URL for your environment:
            </Text>

            <TextInput
              style={styles.urlInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.10:5000"
              placeholderTextColor="#64748B"
            />

            <View style={styles.presetGroup}>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => setTempUrl('http://localhost:5000')}
              >
                <Text style={styles.presetPillText}>localhost:5000</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => setTempUrl('http://10.0.2.2:5000')}
              >
                <Text style={styles.presetPillText}>10.0.2.2:5000 (Android)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setIsConfigOpen(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.connectModalBtn} onPress={handleSaveUrl}>
                <Text style={styles.connectModalText}>Save & Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2338',
    backgroundColor: '#0E1527',
  },
  navLeft: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillOnline: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  pillConnecting: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pillOffline: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotOnline: { backgroundColor: '#10B981' },
  dotConnecting: { backgroundColor: '#F59E0B' },
  dotOffline: { backgroundColor: '#EF4444' },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  headerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerBtnText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  statsCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statsCountHighlight: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  subHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardHighlighted: {
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    backgroundColor: '#131D33',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  newBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  sourceTag: {
    marginBottom: 12,
  },
  sourceText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  contactSection: {
    marginBottom: 10,
    gap: 6,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataLabel: {
    width: 52,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  dataValue: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  customGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  customChip: {
    flexDirection: 'row',
    backgroundColor: '#0B1120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  customChipKey: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  customChipVal: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pageText: {
    fontSize: 11,
    color: '#475569',
  },
  emptyView: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptySignal: {
    color: '#38BDF8',
    fontSize: 14,
  },
  emptyHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  urlPill: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  urlPillText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 17,
  },
  urlInput: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 12,
  },
  presetGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
  },
  presetPillText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelModalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelModalText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  connectModalBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  connectModalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
