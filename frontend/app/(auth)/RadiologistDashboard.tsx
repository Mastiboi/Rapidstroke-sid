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
        sentToRadiologist?: string;
        sentBackToClinician?: string;
    };
}

const RadiologistDashboard: React.FC = () => {
    const router = useRouter();
    const [alerts, setAlerts] = useState<MedicalAlert[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<MedicalAlert | null>(null);
    const [showDetailView, setShowDetailView] = useState(false);
    const [radiologistNotes, setRadiologistNotes] = useState('');

    // Notification states
    const [showNotificationTester, setShowNotificationTester] = useState(false);
    const [showNotificationLogs, setShowNotificationLogs] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationStats, setNotificationStats] = useState<any>(null);

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

    const sendBackToClinician = async (alertId: string, notes: string) => {
        if (!notes.trim()) {
            Alert.alert('Error', 'Please enter radiologist notes before sending back');
            return;
        }

        try {
            const token = await getAuthToken();
            if (!token) {
                Alert.alert('Error', 'Authentication required');
                return;
            }
            const response = await axios.post(`${API_BASE_URL}/alerts/send-back-to-clinician`, {
                alertId,
                radiologistNotes: notes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                Alert.alert('Success', 'Alert sent back to clinician with your findings');
                setShowDetailView(false);
                setRadiologistNotes('');
                fetchAlerts();
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to send alert back');
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
            'sent_to_radiologist': 'New Review',
            'radiologist_reviewing': 'Under Review',
            'sent_back_to_clinician': 'Completed',
            'completed': 'Case Closed'
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

    if (showDetailView && selectedAlert) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setShowDetailView(false)}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Radiology Review</Text>
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

                            {selectedAlert.clinicianInitialNotes && (
                                <>
                                    <Text style={styles.sectionTitle}>Clinician Initial Assessment:</Text>
                                    <Text style={styles.notesText}>{selectedAlert.clinicianInitialNotes}</Text>
                                </>
                            )}

                            {selectedAlert.radiologistNotes && (
                                <>
                                    <Text style={styles.sectionTitle}>My Radiology Report:</Text>
                                    <Text style={styles.notesText}>{selectedAlert.radiologistNotes}</Text>
                                </>
                            )}

                            <Text style={styles.sectionTitle}>Timeline:</Text>
                            <Text style={styles.timelineText}>Created: {new Date(selectedAlert.timestamps.emoCreated).toLocaleString()}</Text>
                            {selectedAlert.timestamps.sentToClinician && (
                                <Text style={styles.timelineText}>Sent to Clinician: {new Date(selectedAlert.timestamps.sentToClinician).toLocaleString()}</Text>
                            )}
                            {selectedAlert.timestamps.sentToRadiologist && (
                                <Text style={styles.timelineText}>Sent to Radiology: {new Date(selectedAlert.timestamps.sentToRadiologist).toLocaleString()}</Text>
                            )}
                            {selectedAlert.timestamps.sentBackToClinician && (
                                <Text style={styles.timelineText}>Returned to Clinician: {new Date(selectedAlert.timestamps.sentBackToClinician).toLocaleString()}</Text>
                            )}
                        </Card.Content>
                    </Card>

                    {/* Radiology Review Actions */}
                    {selectedAlert.stage === 'sent_to_radiologist' && (
                        <Card style={styles.actionCard}>
                            <Card.Content>
                                <Text style={styles.sectionTitle}>Radiology Report</Text>
                                <Text style={styles.instructionText}>
                                    Please review the imaging studies and provide your radiological assessment:
                                </Text>

                                <TextInput
                                    label="Radiology Findings & Report"
                                    value={radiologistNotes}
                                    onChangeText={setRadiologistNotes}
                                    mode="outlined"
                                    multiline
                                    numberOfLines={6}
                                    style={styles.notesInput}
                                    placeholder="Describe imaging findings, impressions, and recommendations..."
                                />

                                <Button
                                    mode="contained"
                                    onPress={() => sendBackToClinician(selectedAlert.alertId, radiologistNotes)}
                                    disabled={!radiologistNotes.trim()}
                                    style={styles.actionButton}
                                    icon="send"
                                >
                                    Send Report to Clinician
                                </Button>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Imaging Study Placeholder */}
                    <Card style={styles.imagingCard}>
                        <Card.Content>
                            <Text style={styles.sectionTitle}>Imaging Studies</Text>
                            <View style={styles.imagingPlaceholder}>
                                <Ionicons name="medical" size={48} color="#ccc" />
                                <Text style={styles.placeholderText}>
                                    DICOM/Imaging viewer would be integrated here
                                </Text>
                                <Text style={styles.placeholderSubtext}>
                                    CT, MRI, X-Ray studies for {selectedAlert.patientName}
                                </Text>
                            </View>
                        </Card.Content>
                    </Card>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Radiology Dashboard</Text>
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
                    <Badge visible={alerts.filter(a => a.stage === 'sent_to_radiologist').length > 0}>
                        {alerts.filter(a => a.stage === 'sent_to_radiologist').length}
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
                <Text style={styles.sectionTitle}>Radiology Queue ({alerts.length})</Text>

                {/* Pending Reviews */}
                {alerts.filter(a => a.stage === 'sent_to_radiologist').length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>⚠️ Pending Reviews</Text>
                        {alerts.filter(a => a.stage === 'sent_to_radiologist').map((alert) => (
                            <TouchableOpacity key={alert.alertId} onPress={() => openAlertDetail(alert)}>
                                <Card style={[styles.alertCard, styles.urgentCard]}>
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
                                                <Badge style={styles.urgentBadge}>NEW</Badge>
                                            </View>
                                        </View>

                                        <Text style={styles.alertDetail}>Age: {alert.patientAge}</Text>
                                        <Text style={styles.alertDetail}>Location: {alert.location}</Text>
                                        <Text style={styles.alertDetail}>Stage: {getStageDisplay(alert.stage)}</Text>
                                        <Text style={styles.alertDetail}>Received: {new Date(alert.timestamps.sentToRadiologist || alert.createdAt).toLocaleString()}</Text>
                                    </Card.Content>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {/* Completed Reviews */}
                {alerts.filter(a => a.stage !== 'sent_to_radiologist').length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>✅ Completed Reviews</Text>
                        {alerts.filter(a => a.stage !== 'sent_to_radiologist').map((alert) => (
                            <TouchableOpacity key={alert.alertId} onPress={() => openAlertDetail(alert)}>
                                <Card style={styles.alertCard}>
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
                                        <Text style={styles.alertDetail}>Stage: {getStageDisplay(alert.stage)}</Text>
                                        <Text style={styles.alertDetail}>Completed: {new Date(alert.timestamps.sentBackToClinician || alert.createdAt).toLocaleString()}</Text>
                                    </Card.Content>
                                </Card>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                {alerts.length === 0 && !loading && (
                    <Text style={styles.noAlertsText}>No radiology studies assigned</Text>
                )}
            </ScrollView>
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
    subsectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 8,
        color: '#555',
    },
    alertCard: {
        marginBottom: 12,
    },
    urgentCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
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
        backgroundColor: '#D32F2F',
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
    instructionText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        fontStyle: 'italic',
    },
    notesInput: {
        marginBottom: 16,
    },
    actionButton: {
        marginTop: 8,
    },
    imagingCard: {
        marginBottom: 16,
    },
    imagingPlaceholder: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
    },
    placeholderText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        marginTop: 12,
    },
    placeholderSubtext: {
        fontSize: 12,
        color: '#bbb',
        textAlign: 'center',
        marginTop: 4,
    },
    testButton: {
        marginRight: 16,
        padding: 4,
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

export default RadiologistDashboard;