import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Card, Chip, FAB, TextInput } from 'react-native-paper';
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
    vitals?: {
        bloodPressure?: string;
        heartRate?: number;
        temperature?: number;
        oxygenSaturation?: number;
        respiratoryRate?: number;
    };
}

const EMODashboard: React.FC = () => {
    const router = useRouter();
    const [alerts, setAlerts] = useState<MedicalAlert[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Create new alert form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showNotificationTester, setShowNotificationTester] = useState(false);
    const [showNotificationLogs, setShowNotificationLogs] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationStats, setNotificationStats] = useState<any>(null);
    const [showClinicianPrompt, setShowClinicianPrompt] = useState(false);
    const [selectedAlertId, setSelectedAlertId] = useState<string>('');
    const [clinicianId, setClinicianId] = useState('');
    const [availableClinicians, setAvailableClinicians] = useState<any[]>([]);
    const [newAlert, setNewAlert] = useState({
        patientName: '',
        patientAge: '',
        symptoms: '',
        severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
        location: '',
        emoNotes: '',
        vitals: {
            bloodPressure: '',
            heartRate: '',
            temperature: '',
            oxygenSaturation: '',
            respiratoryRate: '',
        }
    });

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

            // Get user notifications and all notifications for verification
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

    const createAlert = async () => {
        try {
            if (!newAlert.patientName || !newAlert.patientAge || !newAlert.symptoms ||
                !newAlert.location || !newAlert.emoNotes) {
                Alert.alert('Error', 'Please fill in all required fields');
                return;
            }

            const token = await getAuthToken();
            if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
            }
            const alertData = {
                ...newAlert,
                patientAge: parseInt(newAlert.patientAge),
                symptoms: newAlert.symptoms.split(',').map(s => s.trim()),
                vitals: Object.fromEntries(
                    Object.entries(newAlert.vitals).filter(([_, v]) => v !== '')
                )
            };

            const response = await axios.post(`${API_BASE_URL}/alerts/create`, alertData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                Alert.alert('Success', 'Alert created successfully');
                setShowCreateForm(false);
                setNewAlert({
                    patientName: '',
                    patientAge: '',
                    symptoms: '',
                    severity: 'medium',
                    location: '',
                    emoNotes: '',
                    vitals: {
                        bloodPressure: '',
                        heartRate: '',
                        temperature: '',
                        oxygenSaturation: '',
                        respiratoryRate: '',
                    }
                });
                fetchAlerts(); // Refresh alerts list
            }
        } catch (error: any) {
            console.error('Create alert error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to create alert');
        }
    };

    const fetchAvailableClinicians = async () => {
        try {
            const token = await getAuthToken();
            if (!token) return;

            const response = await axios.get(`${API_BASE_URL}/alerts/users-for-assignment`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setAvailableClinicians(response.data.data.clinicians);
            }
        } catch (error) {
            console.error('Fetch clinicians error:', error);
        }
    };

    const sendToClinician = async (alertId: string) => {
        console.log('sendToClinician called with alertId:', alertId);
        setSelectedAlertId(alertId);
        setClinicianId('');
        await fetchAvailableClinicians();
        setShowClinicianPrompt(true);
    };

    const handleSendToClinician = async () => {
        console.log('handleSendToClinician called with:', { selectedAlertId, clinicianId });
        if (!clinicianId.trim()) {
            console.log('No clinician ID provided');
            Alert.alert('Error', 'Please enter a Clinician ID');
            return;
        }

        try {
            console.log('Starting API call to send-to-clinician...');
            const token = await getAuthToken();
            if (!token) {
                console.log('No auth token found');
                Alert.alert('Error', 'Authentication required');
                return;
            }
            console.log('Making API call with:', { alertId: selectedAlertId, clinicianId });
            const response = await axios.post(`${API_BASE_URL}/alerts/send-to-clinician`, {
                alertId: selectedAlertId,
                clinicianId: clinicianId.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Send to clinician response:', response.data);

            if (response.data.success) {
                Alert.alert('Success', 'Alert sent to clinician');
                setShowClinicianPrompt(false);
                setClinicianId('');
                setSelectedAlertId('');
                fetchAlerts();
            }
        } catch (error: any) {
            console.error('Send to clinician error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to send alert');
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

    const onRefresh = () => {
        setRefreshing(true);
        fetchAlerts();
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    if (showCreateForm) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setShowCreateForm(false)}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create New Alert</Text>
                </View>

                <ScrollView style={styles.formContainer}>
                    <TextInput
                        label="Patient Name *"
                        value={newAlert.patientName}
                        onChangeText={(text) => setNewAlert({ ...newAlert, patientName: text })}
                        mode="outlined"
                        style={styles.input}
                    />

                    <TextInput
                        label="Patient Age *"
                        value={newAlert.patientAge}
                        onChangeText={(text) => setNewAlert({ ...newAlert, patientAge: text })}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.input}
                    />

                    <TextInput
                        label="Symptoms (comma separated) *"
                        value={newAlert.symptoms}
                        onChangeText={(text) => setNewAlert({ ...newAlert, symptoms: text })}
                        mode="outlined"
                        multiline
                        style={styles.input}
                    />

                    <TextInput
                        label="Location *"
                        value={newAlert.location}
                        onChangeText={(text) => setNewAlert({ ...newAlert, location: text })}
                        mode="outlined"
                        style={styles.input}
                    />

                    <TextInput
                        label="EMO Notes *"
                        value={newAlert.emoNotes}
                        onChangeText={(text) => setNewAlert({ ...newAlert, emoNotes: text })}
                        mode="outlined"
                        multiline
                        numberOfLines={3}
                        style={styles.input}
                    />

                    <Text style={styles.sectionTitle}>Vitals (Optional)</Text>

                    <TextInput
                        label="Blood Pressure"
                        value={newAlert.vitals.bloodPressure}
                        onChangeText={(text) => setNewAlert({
                            ...newAlert,
                            vitals: { ...newAlert.vitals, bloodPressure: text }
                        })}
                        mode="outlined"
                        style={styles.input}
                    />

                    <TextInput
                        label="Heart Rate (bpm)"
                        value={newAlert.vitals.heartRate}
                        onChangeText={(text) => setNewAlert({
                            ...newAlert,
                            vitals: { ...newAlert.vitals, heartRate: text }
                        })}
                        keyboardType="numeric"
                        mode="outlined"
                        style={styles.input}
                    />

                    <Button
                        mode="contained"
                        onPress={createAlert}
                        style={styles.createButton}
                    >
                        Create Alert
                    </Button>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>EMO Dashboard</Text>
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
                    <TouchableOpacity onPress={() => router.replace('/')}>
                        <Ionicons name="log-out-outline" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            {showNotificationTester && <NotificationTester />}

            {showClinicianPrompt && (
                <Card style={styles.clinicianPromptCard}>
                    <Card.Content>
                        <Text style={styles.promptTitle}>Assign to Clinician</Text>

                        {availableClinicians.length > 0 && (
                            <View style={styles.cliniciansList}>
                                <Text style={styles.cliniciansListTitle}>Available Clinicians:</Text>
                                {availableClinicians.map((clinician, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.clinicianItem,
                                            clinicianId === clinician.roleId && styles.clinicianItemSelected
                                        ]}
                                        onPress={() => setClinicianId(clinician.roleId)}
                                    >
                                        <Text style={styles.clinicianName}>{clinician.name}</Text>
                                        <Text style={styles.clinicianId}>ID: {clinician.roleId}</Text>
                                        {clinician.department && (
                                            <Text style={styles.clinicianDept}>Dept: {clinician.department}</Text>
                                        )}
                                        {clinician.specialization && (
                                            <Text style={styles.clinicianSpec}>Spec: {clinician.specialization}</Text>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TextInput
                            label="Or Enter Clinician ID Manually"
                            value={clinicianId}
                            onChangeText={setClinicianId}
                            mode="outlined"
                            style={styles.promptInput}
                            placeholder="e.g., CLIN-001"
                        />
                        <View style={styles.promptButtons}>
                            <Button
                                mode="outlined"
                                onPress={() => {
                                    console.log('Cancel button pressed');
                                    setShowClinicianPrompt(false);
                                    setClinicianId('');
                                    setSelectedAlertId('');
                                }}
                                style={styles.promptButton}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSendToClinician}
                                style={styles.promptButton}
                                disabled={!clinicianId}
                            >
                                Send
                            </Button>
                        </View>
                    </Card.Content>
                </Card>
            )}

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

                        {notificationStats?.recent && (
                            <View>
                                <Text style={styles.logsSubtitle}>Recent System Notifications:</Text>
                                {notificationStats.recent.slice(0, 3).map((notif: any, index: number) => (
                                    <View key={notif._id} style={styles.systemNotificationItem}>
                                        <Text style={styles.notifTitle}>{notif.title}</Text>
                                        <Text style={styles.notifMeta}>
                                            User: {notif.userId} | Alert: {notif.alertId} |
                                            {new Date(notif.createdAt).toLocaleString()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
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
                <Text style={styles.sectionTitle}>Active Alerts ({alerts.length})</Text>

                {alerts.map((alert) => (
                    <Card key={alert.alertId} style={styles.alertCard}>
                        <Card.Content>
                            <View style={styles.alertHeader}>
                                <Text style={styles.patientName}>{alert.patientName}</Text>
                                <Chip
                                    style={[styles.severityChip, { backgroundColor: getSeverityColor(alert.severity) }]}
                                    textStyle={{ color: 'white' }}
                                >
                                    {alert.severity.toUpperCase()}
                                </Chip>
                            </View>

                            <Text style={styles.alertDetail}>Age: {alert.patientAge}</Text>
                            <Text style={styles.alertDetail}>Location: {alert.location}</Text>
                            <Text style={styles.alertDetail}>Symptoms: {alert.symptoms.join(', ')}</Text>
                            <Text style={styles.alertDetail}>Stage: {alert.stage.replace('_', ' ').toUpperCase()}</Text>
                            <Text style={styles.alertDetail}>Created: {new Date(alert.createdAt).toLocaleString()}</Text>

                            {alert.stage === 'emo_created' && (
                                <Button
                                    mode="contained"
                                    onPress={() => {
                                        console.log('Send to Clinician button pressed for alert:', alert.alertId);
                                        console.log('Alert stage:', alert.stage);
                                        sendToClinician(alert.alertId);
                                    }}
                                    style={styles.actionButton}
                                >
                                    Send to Clinician
                                </Button>
                            )}
                        </Card.Content>
                    </Card>
                ))}

                {alerts.length === 0 && !loading && (
                    <Text style={styles.noAlertsText}>No alerts found</Text>
                )}
            </ScrollView>

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => setShowCreateForm(true)}
            />
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
    testButton: {
        marginRight: 16,
        padding: 4,
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
    severityChip: {
        height: 24,
    },
    alertDetail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    actionButton: {
        marginTop: 12,
    },
    noAlertsText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 50,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    formContainer: {
        flex: 1,
        padding: 16,
    },
    input: {
        marginBottom: 16,
    },
    createButton: {
        marginTop: 20,
        marginBottom: 50,
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
    systemNotificationItem: {
        backgroundColor: '#f3e5f5',
        padding: 10,
        borderRadius: 6,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#9C27B0',
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
    clinicianPromptCard: {
        margin: 16,
        marginBottom: 8,
        backgroundColor: '#fff3cd',
        borderColor: '#ffeaa7',
        borderWidth: 1,
    },
    promptTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    promptInput: {
        marginBottom: 16,
    },
    promptButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    promptButton: {
        flex: 1,
    },
    cliniciansList: {
        marginBottom: 16,
    },
    cliniciansListTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    clinicianItem: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    clinicianItemSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#1976D2',
    },
    clinicianName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    clinicianId: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    clinicianDept: {
        fontSize: 11,
        color: '#888',
        marginTop: 1,
    },
    clinicianSpec: {
        fontSize: 11,
        color: '#888',
        marginTop: 1,
    },
});

export default EMODashboard;