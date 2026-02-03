import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    TextInput as RNTextInput,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Badge, Button, Card, Chip, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationTester from '../../components/NotificationTester';
import { getAuthToken } from '../../utils/auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://13.53.218.254/api";

interface MedicalAlert {
    alertId: string;
    patientName: string;
    patientAge: number;
    symptoms: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    stage: string;
    location: string;
    createdAt: string;
    emoNotes: string;
    clinicianInitialNotes?: string;
    radiologistNotes?: string;
    timestamps: {
        emoCreated: string;
        sentToClinician?: string;
        clinicianReceived?: string;
        sentToRadiologist?: string;
        sentBackToClinician?: string;
    };
}

const ClinicianDashboard: React.FC = () => {
    const router = useRouter();
    const [alerts, setAlerts] = useState<MedicalAlert[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<MedicalAlert | null>(null);
    const [showDetailView, setShowDetailView] = useState(false);
    const [clinicianNotes, setClinicianNotes] = useState('');
    const [finalRecord, setFinalRecord] = useState('');

    // Notification states
    const [showNotificationTester, setShowNotificationTester] = useState(false);
    const [showNotificationLogs, setShowNotificationLogs] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationStats, setNotificationStats] = useState<any>(null);

    // Forward to radiologist states
    const [showRadiologistPrompt, setShowRadiologistPrompt] = useState(false);
    const [selectedAlertId, setSelectedAlertId] = useState<string>('');
    const [radiologistId, setRadiologistId] = useState('');
    const [availableRadiologists, setAvailableRadiologists] = useState<any[]>([]);
    const [modalClinicianNotes, setModalClinicianNotes] = useState(''); // Separate state for modal

    const fetchAlerts = async () => {
        try {
            const token = await getAuthToken();
            if (!token) {
                console.error('No auth token found');
                return;
            }
            const response = await axios.get(`${API_BASE_URL}/alerts/my-alerts`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAlerts(response.data.data.alerts);
            }
        } catch (error) {
            console.error('Fetch alerts error:', error);
            Alert.alert('Error', 'Failed to fetch alerts');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const token = await getAuthToken();
            if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
            }

            const [myNotificationsRes, allNotificationsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/alerts/notifications/my-notifications?limit=20`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_BASE_URL}/alerts/notifications/all?limit=50`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (myNotificationsRes.data.success) {
                setNotifications(myNotificationsRes.data.data.notifications);
            }

            if (allNotificationsRes.data.success) {
                setNotificationStats({
                    total: allNotificationsRes.data.data.count,
                    stats: allNotificationsRes.data.data.stats,
                    recent: allNotificationsRes.data.data.notifications.slice(0, 10)
                });
            }
        } catch (error: any) {
            console.error('Fetch notifications error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to fetch notifications');
        }
    };

    const fetchAvailableRadiologists = async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await axios.get(`${API_BASE_URL}/alerts/users-for-assignment`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                console.log('Received users data:', response.data.data);
                console.log('Available radiologists:', response.data.data.radiologists);
                setAvailableRadiologists(response.data.data.radiologists);
            }
        } catch (error: any) {
            console.error('Fetch radiologists error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Request URL:', `${API_BASE_URL}/alerts/users-for-assignment`);
        }
    };

    const sendToRadiologist = async (alertId: string) => {
        console.log('sendToRadiologist called with alertId:', alertId);
        setSelectedAlertId(alertId);
        setRadiologistId('');
        setModalClinicianNotes('');
        await fetchAvailableRadiologists();
        setShowRadiologistPrompt(true);
    };

    const handleSendToRadiologist = async () => {
        console.log('handleSendToRadiologist called', { radiologistId, modalClinicianNotes, selectedAlertId });

        if (!radiologistId.trim() || !modalClinicianNotes.trim()) {
            Alert.alert('Error', 'Please select a radiologist and enter clinical notes');
            return;
        }

        try {
            const token = await getAuthToken();
            if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
            }

            console.log('Making request to send-to-radiologist endpoint...');
            const response = await axios.post(`${API_BASE_URL}/alerts/send-to-radiologist`, {
                alertId: selectedAlertId,
                radiologistId: radiologistId.trim(),
                clinicianInitialNotes: modalClinicianNotes.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Response received:', response.data);

            if (response.data.success) {
                Alert.alert('Success', 'Alert sent to radiologist');
                setShowRadiologistPrompt(false);
                setRadiologistId('');
                setModalClinicianNotes('');
                setSelectedAlertId('');
                fetchAlerts();
            }
        } catch (error: any) {
            console.error('Send to radiologist error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            Alert.alert('Error', error.response?.data?.message || 'Failed to send alert to radiologist');
        }
    };

    const enterFinalRecord = async (alertId: string, finalNotes: string, finalRecordText: string) => {
        try {
            const token = await getAuthToken();
            if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
            }
            const response = await axios.post(`${API_BASE_URL}/alerts/final-record`, {
                alertId,
                clinicianFinalNotes: finalNotes,
                finalRecord: finalRecordText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                Alert.alert('Success', 'Final record entered successfully');
                setShowDetailView(false);
                setFinalRecord('');
                fetchAlerts();
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to enter final record');
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#D32F2F';
            case 'high': return '#F57C00';
            case 'medium': return '#1976D2';
            case 'low': return '#388E3C';
            default: return '#757575';
        }
    };

    const getStageDisplay = (stage: string) => {
        const stageMap: { [key: string]: string } = {
            'sent_to_clinician': 'New Alert',
            'clinician_reviewing': 'Under Review',
            'sent_to_radiologist': 'With Radiologist',
            'sent_back_to_clinician': 'Radiology Complete',
            'completed': 'Completed'
        };
        return stageMap[stage] || stage.replace('_', ' ').toUpperCase();
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAlerts();
    };

    const openAlertDetail = (alert: MedicalAlert) => {
        setSelectedAlert(alert);
        setShowDetailView(true);
    };

    useEffect(() => {
        fetchAlerts();
    }, []);


    return (
        <SafeAreaView style={styles.container}>
            <Modal
                visible={showRadiologistPrompt}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRadiologistPrompt(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Radiologist</Text>

                        {availableRadiologists.length > 0 ? (
                            <ScrollView style={styles.radiologistScrollView}>
                                {availableRadiologists.map((radiologist, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.radiologistOption,
                                            radiologistId === radiologist.roleId && styles.radiologistOptionSelected
                                        ]}
                                        onPress={() => {
                                            console.log('Radiologist selected:', radiologist.name);
                                            setRadiologistId(radiologist.roleId);
                                        }}
                                    >
                                        <Text style={styles.radiologistOptionName}>{radiologist.name}</Text>
                                        <Text style={styles.radiologistOptionId}>ID: {radiologist.roleId}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.noRadiologistsText}>No radiologists available</Text>
                        )}

                        <RNTextInput
                            style={styles.notesTextInput}
                            placeholder="Enter clinical notes..."
                            value={modalClinicianNotes}
                            onChangeText={setModalClinicianNotes}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => {
                                    setShowRadiologistPrompt(false);
                                    setRadiologistId('');
                                    setModalClinicianNotes('');
                                    setSelectedAlertId('');
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.modalSendButton,
                                    (!radiologistId || !modalClinicianNotes) && styles.modalSendButtonDisabled
                                ]}
                                onPress={handleSendToRadiologist}
                                disabled={!radiologistId || !modalClinicianNotes}
                            >
                                <Text style={styles.modalSendText}>Send to Radiologist</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {showDetailView && selectedAlert ? (
                <>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setShowDetailView(false)}>
                            <Ionicons name="arrow-back" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Alert Details</Text>
                    </View>

                    <ScrollView style={styles.detailContainer}>
                        <Card style={styles.detailCard}>
                            <Card.Content>
                                <View style={styles.alertHeader}>
                                    <Text style={styles.patientName}>{selectedAlert.patientName}</Text>
                                    <Chip
                                        style={[styles.severityChip, { backgroundColor: getSeverityColor(selectedAlert.severity) }]}
                                        textStyle={{ color: 'white' }}
                                    >
                                        {selectedAlert.severity.toUpperCase()}
                                    </Chip>
                                </View>

                                <Text style={styles.detailText}><Text style={styles.label}>Age:</Text> {selectedAlert.patientAge}</Text>
                                <Text style={styles.detailText}><Text style={styles.label}>Location:</Text> {selectedAlert.location}</Text>
                                <Text style={styles.detailText}><Text style={styles.label}>Symptoms:</Text> {selectedAlert.symptoms.join(', ')}</Text>
                                <Text style={styles.detailText}><Text style={styles.label}>Stage:</Text> {getStageDisplay(selectedAlert.stage)}</Text>

                                <Text style={styles.sectionTitle}>EMO Notes:</Text>
                                <Text style={styles.notesText}>{selectedAlert.emoNotes}</Text>

                                {selectedAlert.radiologistNotes && (
                                    <>
                                        <Text style={styles.sectionTitle}>Radiologist Notes:</Text>
                                        <Text style={styles.notesText}>{selectedAlert.radiologistNotes}</Text>
                                    </>
                                )}

                                <Text style={styles.sectionTitle}>Timeline:</Text>
                                <Text style={styles.timelineText}>Created: {new Date(selectedAlert.timestamps.emoCreated).toLocaleString()}</Text>
                                {selectedAlert.timestamps.sentToClinician && (
                                    <Text style={styles.timelineText}>Sent to Clinician: {new Date(selectedAlert.timestamps.sentToClinician).toLocaleString()}</Text>
                                )}
                                {selectedAlert.timestamps.sentToRadiologist && (
                                    <Text style={styles.timelineText}>Sent to Radiologist: {new Date(selectedAlert.timestamps.sentToRadiologist).toLocaleString()}</Text>
                                )}
                                {selectedAlert.timestamps.sentBackToClinician && (
                                    <Text style={styles.timelineText}>Returned from Radiology: {new Date(selectedAlert.timestamps.sentBackToClinician).toLocaleString()}</Text>
                                )}
                            </Card.Content>
                        </Card>

                        {/* Actions based on stage */}
                        {selectedAlert.stage === 'sent_to_clinician' && (
                            <Card style={styles.actionCard}>
                                <Card.Content>
                                    <Text style={styles.sectionTitle}>Initial Assessment</Text>
                                    <TextInput
                                        label="Clinical Notes"
                                        value={clinicianNotes}
                                        onChangeText={setClinicianNotes}
                                        mode="outlined"
                                        multiline
                                        numberOfLines={4}
                                        style={styles.notesInput}
                                    />
                                    <Button
                                        mode="contained"
                                        onPress={() => sendToRadiologist(selectedAlert.alertId)}
                                        style={styles.actionButton}
                                    >
                                        Send to Radiologist
                                    </Button>
                                </Card.Content>
                            </Card>
                        )}

                        {selectedAlert.stage === 'sent_back_to_clinician' && (
                            <Card style={styles.actionCard}>
                                <Card.Content>
                                    <Text style={styles.sectionTitle}>Final Record</Text>
                                    <TextInput
                                        label="Final Clinical Notes"
                                        value={clinicianNotes}
                                        onChangeText={setClinicianNotes}
                                        mode="outlined"
                                        multiline
                                        numberOfLines={3}
                                        style={styles.notesInput}
                                    />
                                    <TextInput
                                        label="Final Record"
                                        value={finalRecord}
                                        onChangeText={setFinalRecord}
                                        mode="outlined"
                                        multiline
                                        numberOfLines={4}
                                        style={styles.notesInput}
                                    />
                                    <Button
                                        mode="contained"
                                        onPress={() => enterFinalRecord(selectedAlert.alertId, clinicianNotes, finalRecord)}
                                        disabled={!finalRecord}
                                        style={styles.actionButton}
                                    >
                                        Complete Case
                                    </Button>
                                </Card.Content>
                            </Card>
                        )}
                    </ScrollView>
                </>
            ) : (
                <>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Clinician Dashboard</Text>
                        <View style={styles.headerRight}>
                            <TouchableOpacity onPress={() => setShowNotificationTester(!showNotificationTester)} style={styles.testButton}>
                                <Ionicons name="notifications" size={20} color="#1976D2" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                setShowNotificationLogs(!showNotificationLogs);
                                if (!showNotificationLogs) fetchNotifications();
                            }} style={styles.testButton}>
                                <Ionicons name="analytics" size={20} color="#FF6B35" />
                            </TouchableOpacity>
                            <Badge visible={alerts.filter(a => a.stage === 'sent_to_clinician' || a.stage === 'sent_back_to_clinician').length > 0}>
                                {alerts.filter(a => a.stage === 'sent_to_clinician' || a.stage === 'sent_back_to_clinician').length}
                            </Badge>
                            <TouchableOpacity onPress={() => router.replace('/')} style={styles.logoutButton}>
                                <Ionicons name="log-out-outline" size={24} color="#000" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showNotificationTester && <NotificationTester />}

                    {showNotificationLogs && (
                        <Card style={styles.notificationLogsCard}>
                            <Card.Content>
                                <Text style={styles.logsTitle}>📊 Notification Database Logs</Text>

                                {notificationStats && (
                                    <View style={styles.statsContainer}>
                                        <Text style={styles.statsTitle}>Database Statistics:</Text>
                                        <Text style={styles.statsText}>Total Notifications: {notificationStats.total}</Text>
                                        {notificationStats.stats.map((stat: any, index: number) => (
                                            <Text key={index} style={styles.statsText}>
                                                {stat._id}: {stat.count} created, {stat.sent} sent, {stat.delivered} delivered
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                <Text style={styles.logsSubtitle}>Your Notifications ({notifications.length}):</Text>
                                {notifications.length > 0 ? (
                                    notifications.slice(0, 5).map((notif: any, index: number) => (
                                        <View key={notif._id} style={styles.notificationLogItem}>
                                            <Text style={styles.notifTitle}>{notif.title}</Text>
                                            <Text style={styles.notifMessage}>{notif.message}</Text>
                                            <Text style={styles.notifMeta}>
                                                Type: {notif.type} | Priority: {notif.priority} |
                                                Push Sent: {notif.channels.push.sent ? '✅' : '❌'} |
                                                Created: {new Date(notif.createdAt).toLocaleString()}
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={styles.noNotifications}>No notifications found in database</Text>
                                )}
                            </Card.Content>
                        </Card>
                    )}

                    <ScrollView
                        style={styles.alertsList}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        <Text style={styles.sectionTitle}>My Alerts ({alerts.length})</Text>

                        {alerts.map((alert) => (
                            <TouchableOpacity key={alert.alertId} onPress={() => openAlertDetail(alert)}>
                                <Card style={[
                                    styles.alertCard,
                                    (alert.stage === 'sent_to_clinician' || alert.stage === 'sent_back_to_clinician') && styles.urgentCard
                                ]}>
                                    <Card.Content>
                                        <View style={styles.alertHeader}>
                                            <Text style={styles.patientName}>{alert.patientName}</Text>
                                            <View style={styles.badgeContainer}>
                                                <Chip
                                                    style={[styles.severityChip, { backgroundColor: getSeverityColor(alert.severity) }]}
                                                    textStyle={{ color: 'white' }}
                                                >
                                                    {alert.severity.toUpperCase()}
                                                </Chip>
                                                {(alert.stage === 'sent_to_clinician' || alert.stage === 'sent_back_to_clinician') && (
                                                    <Badge style={styles.urgentBadge}>!</Badge>
                                                )}
                                            </View>
                                        </View>

                                        <Text style={styles.alertDetail}>Age: {alert.patientAge}</Text>
                                        <Text style={styles.alertDetail}>Location: {alert.location}</Text>
                                        <Text style={styles.alertDetail}>Stage: {getStageDisplay(alert.stage)}</Text>
                                        <Text style={styles.alertDetail}>Created: {new Date(alert.createdAt).toLocaleString()}</Text>
                                    </Card.Content>
                                </Card>
                            </TouchableOpacity>
                        ))}

                        {alerts.length === 0 && !loading && (
                            <Text style={styles.noAlertsText}>No alerts assigned to you</Text>
                        )}
                    </ScrollView>
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoutButton: {
        marginLeft: 16,
    },
    alertsList: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    alertCard: {
        marginBottom: 12,
    },
    urgentCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#F57C00',
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    patientName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    severityChip: {
        height: 24,
    },
    urgentBadge: {
        marginLeft: 8,
        backgroundColor: '#F57C00',
    },
    alertDetail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    noAlertsText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 50,
    },
    detailContainer: {
        flex: 1,
        padding: 16,
    },
    detailCard: {
        marginBottom: 16,
    },
    detailText: {
        fontSize: 14,
        marginBottom: 8,
    },
    label: {
        fontWeight: 'bold',
    },
    notesText: {
        fontSize: 14,
        color: '#444',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    timelineText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    actionCard: {
        marginBottom: 16,
    },
    notesInput: {
        marginBottom: 16,
    },
    actionButton: {
        marginTop: 8,
    },
    testButton: {
        marginRight: 16,
        padding: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxHeight: '80%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    radiologistScrollView: {
        maxHeight: 200,
        marginBottom: 15,
    },
    radiologistOption: {
        padding: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f9f9f9',
    },
    radiologistOptionSelected: {
        borderColor: '#1976D2',
        backgroundColor: '#e3f2fd',
    },
    radiologistOptionName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    radiologistOptionId: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    noRadiologistsText: {
        textAlign: 'center',
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 15,
    },
    notesTextInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 20,
        fontSize: 16,
        minHeight: 80,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f8f8f8',
    },
    modalCancelText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    modalSendButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#1976D2',
    },
    modalSendButtonDisabled: {
        backgroundColor: '#ccc',
    },
    modalSendText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    radiologistItem: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    radiologistItemSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#1976D2',
    },
    radiologistName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    radiologistId: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    radiologistSpec: {
        fontSize: 11,
        color: '#888',
        marginTop: 1,
    },
    notificationLogsCard: {
        margin: 16,
        marginBottom: 8,
    },
    logsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#FF6B35',
    },
    logsSubtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 8,
        color: '#333',
    },
    statsContainer: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    statsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    statsText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    notificationLogItem: {
        backgroundColor: '#e3f2fd',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#1976D2',
    },
    notifTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    notifMessage: {
        fontSize: 12,
        color: '#555',
        marginBottom: 4,
    },
    notifMeta: {
        fontSize: 10,
        color: '#888',
    },
    noNotifications: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 20,
    },
});

export default ClinicianDashboard;