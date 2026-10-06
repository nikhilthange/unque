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

const getInitialServerUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

export default function App() {
  const [serverUrl, setServerUrl] = useState(getInitialServerUrl());
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [modalOpen, setModalOpen] = useState(false);

  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState('connecting'); // connected | connecting | disconnected
  const [refreshing, setRefreshing] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState(null);

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const socketRef = useRef(null);

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [blinkAnim]);

  useEffect(() => {
    setStatus('connecting');

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      loadLeads(serverUrl);
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setStatus('disconnected');
    });

    // Handle real-time lead arrival without any user interaction
    socket.on('new_lead', (newLead) => {
      setActiveLeadId(newLead.leadgen_id);

      setLeads((prev) => {
        const found = prev.some((l) => l.leadgen_id === newLead.leadgen_id);
        if (found) {
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

  const loadLeads = async (url) => {
    try {
      const res = await fetch(`${url}/api/leads`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.log('Error loading leads:', err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeads(serverUrl);
    setRefreshing(false);
  };

  const saveUrl = () => {
    let clean = tempUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    setServerUrl(clean);
    setModalOpen(false);
  };

  const formatTime = (iso) => {
    if (!iso) return 'Just now';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Leads Dashboard</Text>
          <Text style={styles.subtitle}>Meta Lead Ads Live Sync</Text>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.badge,
              status === 'connected'
                ? styles.badgeOnline
                : status === 'connecting'
                ? styles.badgeWarning
                : styles.badgeOffline,
            ]}
          >
            <Animated.View
              style={[
                styles.dot,
                status === 'connected'
                  ? styles.dotOnline
                  : status === 'connecting'
                  ? styles.dotWarning
                  : styles.dotOffline,
                status === 'connected' ? { opacity: blinkAnim } : null,
              ]}
            />
            <Text style={styles.badgeText}>
              {status === 'connected' ? 'LIVE' : status === 'connecting' ? 'SYNCING' : 'OFFLINE'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.configBtn}
            onPress={() => {
              setTempUrl(serverUrl);
              setModalOpen(true);
            }}
          >
            <Text style={styles.configBtnText}>Config</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subheader info */}
      <View style={styles.subBar}>
        <Text style={styles.countText}>Total: {leads.length} leads</Text>
        <Text style={styles.hintText}>Real-time push enabled</Text>
      </View>

      {/* Leads List */}
      <FlatList
        data={leads}
        keyExtractor={(item) => String(item.leadgen_id || Math.random())}
        contentContainerStyle={leads.length === 0 ? styles.emptyWrap : styles.listWrap}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
        renderItem={({ item }) => {
          const isLatest = item.leadgen_id === activeLeadId;

          return (
            <View style={[styles.card, isLatest && styles.cardActive]}>
              <View style={styles.cardTop}>
                <View style={styles.nameWrap}>
                  <Text style={styles.leadName}>{item.fullName || 'New Lead'}</Text>
                  {isLatest && (
                    <View style={styles.newTag}>
                      <Text style={styles.newTagText}>NEW</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.timeText}>{formatTime(item.received_at || item.created_time)}</Text>
              </View>

              <Text style={styles.sourceText}>Source: {item.source || 'Meta Lead Ad'}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{item.email || 'N/A'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{item.phoneNumber || 'N/A'}</Text>
              </View>

              {item.customFields && Object.keys(item.customFields).length > 0 && (
                <View style={styles.customBox}>
                  {Object.entries(item.customFields).map(([k, v]) => (
                    <Text key={k} style={styles.customItem}>
                      <Text style={styles.customKey}>{k}: </Text>
                      {String(v)}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.cardBottom}>
                <Text style={styles.leadId}>ID: {item.leadgen_id}</Text>
                {item.form_id ? <Text style={styles.formId}>Form: {item.form_id}</Text> : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Waiting for submissions</Text>
            <Text style={styles.emptyDesc}>
              Submit a test lead via Meta's Lead Ads Testing Tool.
              The entry will pop up here instantly without touching your phone.
            </Text>
            <Text style={styles.serverLabel}>Backend: {serverUrl}</Text>
          </View>
        }
      />

      {/* URL Settings Modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>Backend Server URL</Text>
            <Text style={styles.modalDesc}>Configure backend address for simulator or local device:</Text>

            <TextInput
              style={styles.modalInput}
              value={tempUrl}
              onChangeText={setTempUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.1.5:5000"
              placeholderTextColor="#64748b"
            />

            <View style={styles.presetButtons}>
              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => setTempUrl('http://localhost:5000')}
              >
                <Text style={styles.presetBtnText}>localhost:5000</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => setTempUrl('http://10.0.2.2:5000')}
              >
                <Text style={styles.presetBtnText}>10.0.2.2:5000 (Android)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveUrl}>
                <Text style={styles.saveBtnText}>Connect</Text>
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
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeOnline: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgeWarning: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeOffline: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotOnline: { backgroundColor: '#10b981' },
  dotWarning: { backgroundColor: '#f59e0b' },
  dotOffline: { backgroundColor: '#ef4444' },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f8fafc',
  },
  configBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#1e293b',
    borderRadius: 6,
  },
  configBtnText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  hintText: {
    fontSize: 12,
    color: '#38bdf8',
  },
  listWrap: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#1e293b',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  newTag: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
  },
  sourceText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    width: 48,
  },
  infoValue: {
    fontSize: 13,
    color: '#e2e8f0',
  },
  customBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  customItem: {
    fontSize: 12,
    color: '#cbd5e1',
    marginBottom: 2,
  },
  customKey: {
    color: '#64748b',
  },
  cardBottom: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leadId: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  formId: {
    fontSize: 11,
    color: '#64748b',
  },
  emptyBox: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  serverLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  modalDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  presetBtnText: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
