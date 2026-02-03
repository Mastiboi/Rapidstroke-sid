import * as Notifications from 'expo-notifications';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Button, Card, Chip, TextInput } from 'react-native-paper';

const NotificationTester: React.FC = () => {
    const [title, setTitle] = useState('Medical Alert');
    const [message, setMessage] = useState('New patient alert requires your attention');
    const [delay, setDelay] = useState('5');

    const sendTestNotification = async (type: string) => {
        try {
            let testTitle = title;
            let testMessage = message;
            let testData = {};

            switch (type) {
                case 'alert_assigned':
                    testTitle = '🚨 New Alert Assigned';
                    testMessage = 'Critical patient alert - John Doe, Age 65, Chest pain';
                    testData = {
                        alertId: 'test-alert-123',
                        patientName: 'John Doe',
                        severity: 'critical',
                        stage: 'sent_to_clinician',
                        actionRequired: 'Review patient symptoms and vitals'
                    };
                    break;
                case 'alert_returned':
                    testTitle = '📋 Alert Returned';
                    testMessage = 'Radiology complete - Review findings for Jane Smith';
                    testData = {
                        alertId: 'test-alert-456',
                        patientName: 'Jane Smith',
                        severity: 'high',
                        stage: 'sent_back_to_clinician',
                        actionRequired: 'Review radiology report and enter final record'
                    };
                    break;
                case 'reminder':
                    testTitle = '⏰ Reminder';
                    testMessage = 'Pending alerts require attention (3 unread)';
                    testData = {
                        type: 'reminder',
                        count: 3
                    };
                    break;
                default:
                    testData = {
                        alertId: 'test-alert-custom',
                        type: 'custom_test'
                    };
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: testTitle,
                    body: testMessage,
                    data: testData,
                    sound: 'default',
                },
                trigger: {
                    seconds: parseInt(delay) || 5,
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
                },
            });

            Alert.alert('Test Scheduled', `Notification will appear in ${delay} seconds`);
            console.log(`Scheduled ${type} notification with title: ${testTitle}:${JSON.stringify(testData)}`);
        } catch (error) {
            console.error('Failed to schedule test notification:', error);
            Alert.alert('Error', 'Failed to schedule notification');
        }
    };

    const sendImmediateNotification = async () => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '⚡ Immediate Test',
                    body: 'This is an immediate test notification',
                    data: { immediate: true },
                    sound: 'default',
                },
                trigger: {
                    seconds: 1,
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL
                },
            });
            Alert.alert('Sent!', 'Immediate notification sent');
        } catch (error) {
            Alert.alert('Error', 'Failed to send immediate notification');
        }
    };

    const requestPermissions = async () => {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                Alert.alert('Success', 'Notification permissions granted!');
            } else {
                Alert.alert('Error', 'Notification permissions denied');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to request permissions');
        }
    };

    const cancelAllNotifications = async () => {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            Alert.alert('Cancelled', 'All scheduled notifications cancelled');
        } catch (error) {
            Alert.alert('Error', 'Failed to cancel notifications');
        }
    };

    return (
        <Card style={styles.container}>
            <Card.Content>
                <Text style={styles.title}>🧪 Notification Tester</Text>
                <Text style={styles.subtitle}>Test local notifications in Expo Go</Text>

                <View style={styles.inputSection}>
                    <TextInput
                        label="Notification Title"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                    />
                    <TextInput
                        label="Notification Message"
                        value={message}
                        onChangeText={setMessage}
                        mode="outlined"
                        multiline
                        style={styles.input}
                    />
                    <TextInput
                        label="Delay (seconds)"
                        value={delay}
                        onChangeText={setDelay}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.input}
                    />
                </View>

                <View style={styles.buttonSection}>
                    <Text style={styles.sectionTitle}>Medical Alert Types:</Text>

                    <Button
                        mode="contained"
                        onPress={() => sendTestNotification('alert_assigned')}
                        style={[styles.button, styles.criticalButton]}
                        labelStyle={{ color: 'white' }}
                    >
                        🚨 Critical Alert
                    </Button>

                    <Button
                        mode="contained"
                        onPress={() => sendTestNotification('alert_returned')}
                        style={[styles.button, styles.highButton]}
                        labelStyle={{ color: 'white' }}
                    >
                        📋 Radiology Complete
                    </Button>

                    <Button
                        mode="contained"
                        onPress={() => sendTestNotification('reminder')}
                        style={[styles.button, styles.reminderButton]}
                        labelStyle={{ color: 'white' }}
                    >
                        ⏰ Reminder
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={() => sendTestNotification('custom')}
                        style={styles.button}
                    >
                        Custom Test
                    </Button>
                </View>

                <View style={styles.utilitySection}>
                    <Text style={styles.sectionTitle}>Utilities:</Text>

                    <Button
                        mode="contained"
                        onPress={sendImmediateNotification}
                        style={[styles.button, styles.immediateButton]}
                    >
                        ⚡ Send Now
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={requestPermissions}
                        style={styles.button}
                    >
                        🔔 Request Permissions
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={cancelAllNotifications}
                        style={styles.button}
                    >
                        ❌ Cancel All
                    </Button>
                </View>

                <View style={styles.statusSection}>
                    <Chip icon="information" mode="outlined" style={styles.chip}>
                        Local notifications work in Expo Go
                    </Chip>
                </View>
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        margin: 16,
        elevation: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    inputSection: {
        marginBottom: 20,
    },
    input: {
        marginBottom: 12,
    },
    buttonSection: {
        marginBottom: 20,
    },
    utilitySection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    button: {
        marginBottom: 8,
    },
    criticalButton: {
        backgroundColor: '#D32F2F',
    },
    highButton: {
        backgroundColor: '#F57C00',
    },
    reminderButton: {
        backgroundColor: '#1976D2',
    },
    immediateButton: {
        backgroundColor: '#388E3C',
    },
    statusSection: {
        alignItems: 'center',
    },
    chip: {
        marginTop: 8,
    },
});

export default NotificationTester;