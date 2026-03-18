import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://13.53.218.254/api";

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const registerForPushNotificationsAsync = async (authToken?: string) => {
    let token;

    if (Platform.OS === 'android') {
        // Set notification channel for Android
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });

        // Set urgent notification channel for critical alerts
        await Notifications.setNotificationChannelAsync('urgent-alerts', {
            name: 'Urgent Medical Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF0000',
            sound: 'default',
            enableVibrate: true,
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            alert('Permission to receive notifications was denied!');
            return null;
        }

        // Get the push token
        try {
            // Check if running in Expo Go — never attempt real push tokens there
            const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

            if (isExpoGo) {
                console.warn('Push notifications are not available in Expo Go. Please use a development build.');
                return null;
            }

            // Always re-register on every launch so that a fresh install (e.g. switching
            // from dev build → preview build on the same device) gets a new valid token
            // and immediately syncs it to the backend, replacing any stale cached token.
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'c2f29831-f572-46c2-94c8-36ab28c7b9f9',
            })).data;

            console.log('Expo push token:', token);

            // Persist token locally (for reference / offline use)
            await AsyncStorage.setItem('expoPushToken', token);

            // Always sync the (possibly new) token to the backend
            await updatePushTokenOnServer(token, authToken);

        } catch (error) {
            console.error('Error getting push token:', error);
            // Do not fall back to a mock token — return null so callers know registration failed
            return null;
        }
    } else {
        alert('Must use physical device for Push Notifications');
    }

    return token;
};

export const updatePushTokenOnServer = async (token: string, authToken?: string) => {
    try {
        // Use the explicitly provided authToken first (e.g. right after login before
        // AsyncStorage is populated), then fall back to what's persisted on disk.
        const userToken = authToken ?? await AsyncStorage.getItem('userToken');
        if (!userToken) {
            console.warn('updatePushTokenOnServer: no auth token available, skipping');
            return;
        }

        await axios.post(`${API_BASE_URL}/auth/update-push-token`, {
            expoPushToken: token
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });

        console.log('Push token updated on server');
    } catch (error) {
        console.error('Failed to update push token on server:', error);
    }
};

export const setupNotificationListeners = () => {
    // Listen for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);

        // Handle the notification data
        const { alertId, type, priority } = notification.request.content.data || {};

        if (type === 'alert_assigned' || type === 'alert_returned') {
            // Show in-app alert for critical notifications
            if (priority === 'urgent') {
                // You can show a custom alert modal here
                console.log('URGENT NOTIFICATION:', notification.request.content.title);
            }
        }
    });

    // Listen for notification interactions (user tapped notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response:', response);

        const { alertId, type } = response.notification.request.content.data || {};

        if (alertId) {
            // Navigate to alert details
            // You can use your navigation system here
            console.log('Navigate to alert:', alertId);
        }
    });

    return () => {
        notificationListener?.remove();
        responseListener?.remove();
    };
};

// Schedule a local notification (for testing or offline scenarios)
export const scheduleLocalNotification = async (
    title: string,
    message: string,
    data?: any,
    seconds: number = 1
) => {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body: message,
            data,
            sound: 'default',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds
        },
    });
};

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

// Get notification permissions
export const getNotificationPermissions = async () => {
    return await Notifications.getPermissionsAsync();
};

// Handle notification when app is in background/killed state
export const getLastNotificationResponse = async () => {
    return await Notifications.getLastNotificationResponseAsync();
};

// Test function to simulate backend notifications locally
export const simulateBackendNotification = async (
    alertId: string,
    type: 'alert_assigned' | 'alert_returned' | 'alert_completed',
    patientName: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) => {
    const notifications = {
        alert_assigned: {
            title: '🚨 New Alert Assigned',
            body: `Critical patient alert - ${patientName}`,
        },
        alert_returned: {
            title: '📋 Alert Returned',
            body: `Radiology complete - Review findings for ${patientName}`,
        },
        alert_completed: {
            title: '✅ Alert Completed',
            body: `Case closed for ${patientName}`,
        },
    };

    const notification = notifications[type];

    await scheduleLocalNotification(
        notification.title,
        notification.body,
        {
            alertId,
            patientName,
            severity,
            type,
            actionRequired: type === 'alert_assigned' ? 'Review patient symptoms' : 'Check updates'
        },
        2 // 2 seconds delay
    );
};