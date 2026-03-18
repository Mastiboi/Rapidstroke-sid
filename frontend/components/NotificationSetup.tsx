import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import React, { useEffect } from 'react';

interface NotificationSetupProps {
    children: React.ReactNode;
}

const NotificationSetup: React.FC<NotificationSetupProps> = ({ children }) => {
    useEffect(() => {
        // Check if running in Expo Go
        const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

        if (isExpoGo) {
            console.log('Running in Expo Go - push notifications disabled');
            return;
        }

        const initializeNotifications = async () => {
            try {
                const { registerForPushNotificationsAsync, setupNotificationListeners } = await import('../services/notificationService');

                // Always set up notification listeners so foreground / background
                // notifications are handled even before the user logs in.
                const removeListeners = setupNotificationListeners();

                // Only attempt push-token registration on a WARM start (i.e. the user
                // was already logged in when the app launched). On a COLD start (fresh
                // install / logged-out state) there is no userToken yet, so we skip
                // registration here. LoginScreen.tsx handles registration right after
                // a successful login with the fresh JWT token.
                const existingUserToken = await AsyncStorage.getItem('userToken');
                if (existingUserToken) {
                    console.log('Warm start: re-registering push token for already-logged-in user');
                    await registerForPushNotificationsAsync();
                } else {
                    console.log('NotificationSetup: no user token found, skipping token registration (will register on login)');
                }

                return () => {
                    if (removeListeners) {
                        removeListeners();
                    }
                };
            } catch (error) {
                console.error('Failed to initialize notifications:', error);
            }
        };

        const cleanup = initializeNotifications();

        return () => {
            if (cleanup instanceof Promise) {
                cleanup.then(cleanupFn => cleanupFn?.());
            }
        };
    }, []);

    return <>{children}</>;
};

export default NotificationSetup;