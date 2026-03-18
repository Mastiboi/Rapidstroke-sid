import type { ExpoPushMessage } from 'expo-server-sdk';
import { Expo } from 'expo-server-sdk';
import Notification, { type INotification } from '../models/Notification.ts';
import User from '../models/User.ts';
import type { IUser } from '../types.ts';

// Create a new Expo SDK client
const expo = new Expo();

// Constants for retry logic
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
const MAX_RETRY_DELAY_MS = 60000; // 1 minute
const BACKOFF_MULTIPLIER = 2;

interface NotificationData {
    userId: string;
    alertId: string;
    type: 'alert_assigned' | 'alert_forwarded' | 'alert_returned' | 'alert_completed' | 'reminder';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    data: {
        alertId: string;
        patientName: string;
        severity: string;
        stage: string;
        actionRequired?: string;
    };
    scheduledFor?: Date;
}

/**
 * Calculate next retry time using exponential backoff
 */
function calculateNextRetryTime(retryCount: number): Date {
    const delayMs = Math.min(
        INITIAL_RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount),
        MAX_RETRY_DELAY_MS
    );
    return new Date(Date.now() + delayMs);
}

/**
 * Main notification sending function
 */
export const sendNotification = async (notificationData: NotificationData) => {
    try {
        const user = await User.findById(notificationData.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Create notification record
        const notification = new Notification({
            userId: notificationData.userId,
            alertId: notificationData.alertId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            priority: notificationData.priority,
            data: notificationData.data,
            scheduledFor: notificationData.scheduledFor || new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire after 24 hours
            channels: {
                push: { sent: false, delivered: false, clicked: false },
                sms: { sent: false, delivered: false },
                email: { sent: false, delivered: false }
            }
        });

        await notification.save();

        // Send notifications based on user preferences
        const promises = [];

        // Push notification
        if (user.notificationPreferences.push &&
            (!user.notificationPreferences.urgentOnly || notification.priority === 'urgent')) {
            promises.push(sendPushNotification(user, notification));
        }

        // SMS notification
        if (user.notificationPreferences.sms && user.phone &&
            (!user.notificationPreferences.urgentOnly || notification.priority === 'urgent')) {
            promises.push(sendSMSNotification(user, notification));
        }

        // Email notification
        if (user.notificationPreferences.email && user.email &&
            (!user.notificationPreferences.urgentOnly || notification.priority === 'urgent')) {
            promises.push(sendEmailNotification(user, notification));
        }

        await Promise.allSettled(promises);

        console.log(`Notification sent to user ${user.name} for alert ${notificationData.alertId}`);
        return notification;

    } catch (error) {
        console.error('Send notification error:', error);
        throw error;
    }
};

/**
 * Send push notification via Expo
 */
const sendPushNotification = async (user: IUser, notification: INotification) => {
    try {
        // Check if user has valid Expo push tokens
        const tokens = user.expoPushTokens || [];
        if (tokens.length === 0) {
            console.log(`User ${user.name} does not have any Expo push tokens registered`);
            return;
        }

        // Filter valid tokens and handle mock tokens
        const validTokens = tokens.filter((token: string) => {
            if (typeof token === 'string' && token.includes('mock-expo-push-token')) {
                console.warn(`User ${user.name} has a mock Expo push token (development): ${token}`);
                return false;
            }
            if (!Expo.isExpoPushToken(token)) {
                console.warn(`User ${user.name} has an invalid Expo push token: ${token}`);
                return false;
            }
            return true;
        });

        if (validTokens.length === 0) {
            return;
        }

        // Create the messages for all valid tokens
        const messages: ExpoPushMessage[] = validTokens.map((token: string) => ({
            to: token,
            sound: 'default',
            title: notification.title,
            body: notification.message,
            data: {
                alertId: notification.data.alertId,
                type: notification.type,
                priority: notification.priority,
                patientName: notification.data.patientName,
                severity: notification.data.severity,
                stage: notification.data.stage
            },
            priority: notification.priority === 'urgent' ? 'high' : 'normal',
            channelId: notification.priority === 'urgent' ? 'urgent-alerts' : 'default'
        }));

        // Send the push notifications
        const ticketChunks = await expo.sendPushNotificationsAsync(messages);

        // Flatten tickets (as expo-server-sdk handles chunking)
        const tickets = ticketChunks;

        // Update notification record with ticket information
        notification.channels.push.sent = true;
        notification.channels.push.sentAt = new Date();

        // Store first ticket ID for compatibility or handle multiple if model supports it
        // For simplicity, we'll store the first one if it exists, or improve the model later
        if (tickets[0] && tickets[0].status === 'ok' && 'id' in tickets[0]) {
            notification.channels.push.ticketId = tickets[0].id;
        }

        // If any ticket failed, log it
        const failures = tickets.filter(t => t.status === 'error');
        if (failures.length > 0) {
            console.error(`Some push notifications failed for ${user.name}:`, failures);
            notification.channels.push.error = (failures[0] as any).message || 'One or more notifications failed';
        }

        await notification.save();
        console.log(`Expo push notifications sent to ${user.name} (${validTokens.length} devices)`);

    } catch (error) {
        console.error('Expo push notification error:', error);
        notification.channels.push.error = (error as Error).message;
        notification.retryCount += 1;
        notification.lastRetryAt = new Date();

        // Calculate next retry time
        if (notification.retryCount < notification.maxRetries) {
            notification.nextRetryAt = calculateNextRetryTime(notification.retryCount);
        }

        await notification.save();
    }
};

/**
 * Send SMS notification
 */
const sendSMSNotification = async (user: IUser, notification: INotification) => {
    try {
        // Placeholder for SMS service integration (Twilio, AWS SNS, etc.)
        // You'll need to implement actual SMS sending logic here

        console.log(`SMS would be sent to ${user.phone}: ${notification.title} - ${notification.message}`);

        notification.channels.sms.sent = true;
        notification.channels.sms.sentAt = new Date();
        notification.channels.sms.phoneNumber = user.phone || '';

        await notification.save();
    } catch (error) {
        console.error('SMS notification error:', error);
        notification.retryCount += 1;
        await notification.save();
    }
};

/**
 * Send email notification
 */
const sendEmailNotification = async (user: IUser, notification: INotification) => {
    try {
        // Placeholder for email service integration (SendGrid, AWS SES, etc.)
        // You'll need to implement actual email sending logic here

        console.log(`Email would be sent to ${user.email}: ${notification.title} - ${notification.message}`);

        notification.channels.email.sent = true;
        notification.channels.email.sentAt = new Date();
        notification.channels.email.emailAddress = user.email;

        await notification.save();
    } catch (error) {
        console.error('Email notification error:', error);
        notification.retryCount += 1;
        await notification.save();
    }
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId: string, limit: number = 50) => {
    try {
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit);

        return notifications;
    } catch (error) {
        console.error('Get user notifications error:', error);
        throw error;
    }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string, userId: string) => {
    try {
        const notification = await Notification.findOne({
            notificationId,
            userId
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        return notification;
    } catch (error) {
        console.error('Mark notification as read error:', error);
        throw error;
    }
};

/**
 * Retry failed notifications with exponential backoff
 */
export const retryFailedNotifications = async () => {
    try {
        const now = new Date();
        const failedNotifications = await Notification.find({
            retryCount: { $lt: 3 },
            nextRetryAt: { $lte: now },
            $or: [
                { 'channels.push.sent': false },
                { 'channels.sms.sent': false },
                { 'channels.email.sent': false }
            ],
            expiresAt: { $gt: now }
        });

        for (const notification of failedNotifications) {
            const user = await User.findById(notification.userId);
            if (user) {
                // Retry sending notification
                await sendNotification({
                    userId: notification.userId,
                    alertId: notification.alertId,
                    type: notification.type as any,
                    title: notification.title,
                    message: notification.message,
                    priority: notification.priority as any,
                    data: notification.data
                });
            }
        }

        console.log(`Retried ${failedNotifications.length} failed notifications`);
    } catch (error) {
        console.error('Retry failed notifications error:', error);
    }
};

/**
 * Check push notification receipts and update delivery status
 * Call this periodically (recommended: every 15 minutes) to check receipt status
 */
export const checkPushNotificationReceipts = async () => {
    try {
        // Get all notifications sent in the last 24 hours that haven't been confirmed delivered
        const notifications = await Notification.find({
            'channels.push.sent': true,
            'channels.push.delivered': { $ne: true },
            'channels.push.ticketId': { $exists: true },
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        if (notifications.length === 0) {
            console.log('No pending push receipts to check');
            return;
        }

        // Collect all ticket IDs
        const ticketIds = notifications
            .map(n => n.channels.push.ticketId)
            .filter((id): id is string => !!id);

        if (ticketIds.length === 0) {
            return;
        }

        // Check receipts in batches (Expo API limit is 1000 per request)
        const batchSize = 1000;
        for (let i = 0; i < ticketIds.length; i += batchSize) {
            const batch = ticketIds.slice(i, i + batchSize);

            try {
                const receipts = await expo.getPushNotificationReceiptsAsync(batch);

                // Update notifications based on receipts
                for (const notification of notifications) {
                    const ticketId = notification.channels.push.ticketId;
                    if (!ticketId || !receipts[ticketId]) continue;

                    const receipt = receipts[ticketId];

                    if (receipt.status === 'ok') {
                        notification.channels.push.delivered = true;
                        notification.channels.push.deliveredAt = new Date();
                        console.log(`Notification ${notification.notificationId} confirmed delivered`);
                    } else if (receipt.status === 'error') {
                        notification.channels.push.error = (receipt as any).message || 'Unknown error';

                        // Handle specific error types
                        if ((receipt as any).details?.error === 'DeviceNotRegistered') {
                            // Device is unregistered - remove this token from the user
                            const ticketId = notification.channels.push.ticketId;
                            console.warn(`Device unregistered for notification ${notification.notificationId}. Attempting cleanup...`);

                            // Since we currently only store one ticketId, we'll log it for now.
                            // To remove specific token, we'd need to store the mapping in the Notification model.
                        } else if (notification.retryCount < notification.maxRetries) {
                            // Set up retry for retriable errors
                            notification.retryCount += 1;
                            notification.lastRetryAt = new Date();
                            notification.nextRetryAt = calculateNextRetryTime(notification.retryCount);
                        }
                    }

                    await notification.save();
                }
            } catch (error) {
                console.error('Error checking batch of receipts:', error);
            }
        }

        console.log(`Checked receipts for ${notifications.length} notifications`);
    } catch (error) {
        console.error('Check push notification receipts error:', error);
    }
};

/**
 * Get push notification statistics
 */
export const getPushNotificationStats = async (userId?: string) => {
    try {
        const query: any = {};
        if (userId) {
            query.userId = userId;
        }

        const stats = await Notification.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    sent: { $sum: { $cond: ['$channels.push.sent', 1, 0] } },
                    delivered: { $sum: { $cond: ['$channels.push.delivered', 1, 0] } },
                    failed: { $sum: { $cond: ['$channels.push.error', 1, 0] } },
                    avgRetries: { $avg: '$retryCount' }
                }
            }
        ]);

        return stats[0] || {
            total: 0,
            sent: 0,
            delivered: 0,
            failed: 0,
            avgRetries: 0
        };
    } catch (error) {
        console.error('Get push notification stats error:', error);
        throw error;
    }
};

/**
 * Clean up expired notifications
 */
export const cleanupExpiredNotifications = async () => {
    try {
        const result = await Notification.deleteMany({
            expiresAt: { $lt: new Date() }
        });

        console.log(`Deleted ${result.deletedCount} expired notifications`);
    } catch (error) {
        console.error('Cleanup expired notifications error:', error);
    }
};