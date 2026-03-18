import * as express from 'express';
import { Document as MongoDocument } from 'mongoose';

type Request = express.Request;

// Extended Request interface with user property
export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: 'emo' | 'clinician' | 'radiologist';
    emoId?: string;
    clinicianId?: string;
    radiologistId?: string;
  };
}

export interface IUser extends MongoDocument {
  name: string;
  email: string;
  password: string;
  dob: Date;
  role: 'emo' | 'clinician' | 'radiologist'; // Removed 'patient', added 'emo'

  // Role-specific unique identifiers
  emoId?: string;       // e.g., 'EMO-001', 'EMO-002'
  clinicianId?: string; // e.g., 'CLIN-123', 'CLIN-124'
  radiologistId?: string; // e.g., 'RAD-456', 'RAD-457'

  // Additional fields for medical professionals
  licenseNumber?: string;
  department?: string;
  hospitalId?: string;
  phone?: string;
  specialization?: string; // For clinicians and radiologists

  // Expo push tokens for notifications
  expoPushTokens?: string[];

  // Notification preferences
  notificationPreferences: {
    push: boolean;
    sms: boolean;
    email: boolean;
    urgentOnly: boolean;
  };

  // Availability status
  isAvailable: boolean;
  currentShift?: {
    startTime: Date;
    endTime: Date;
  };

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IPatient extends MongoDocument {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  symptoms: string[];
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  userId?: string; // Optional reference to user who created this patient
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  dob: string;
  role: 'emo' | 'clinician' | 'radiologist';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}