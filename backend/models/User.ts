import bcrypt from 'bcryptjs';
import mongoose, { Schema } from 'mongoose';
import * as types from '../types.ts';

type IUser = types.IUser;

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  role: {
    type: String,
    enum: ['emo', 'clinician', 'radiologist'],
    default: 'emo',
    required: true
  },
  emoId: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  clinicianId: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  radiologistId: {
    type: String,
    sparse: true,
    unique: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    trim: true,
    sparse: true // Allows multiple null values but unique non-null values
  },
  department: {
    type: String,
    trim: true
  },
  hospitalId: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[\d\s\-\(\)]+$/, 'Please provide a valid phone number']
  },
  specialization: {
    type: String,
    trim: true
  },
  expoPushTokens: {
    type: [String],
    default: []
  },
  notificationPreferences: {
    push: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    email: {
      type: Boolean,
      default: true
    },
    urgentOnly: {
      type: Boolean,
      default: false
    }
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentShift: {
    startTime: Date,
    endTime: Date
  }
}, {
  timestamps: true
});

// Generate role-specific ID before saving
userSchema.pre('save', async function () {
  // Generate role-specific ID if it's a new user or role changed
  if (this.isNew || this.isModified('role')) {
    await generateRoleSpecificId(this);
  }

  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error: any) {
      throw error;
    }
  }
});

// Helper function to generate role-specific IDs
async function generateRoleSpecificId(user: any) {
  const User = mongoose.model('User');

  let prefix: string;
  let fieldName: string;

  switch (user.role) {
    case 'emo':
      prefix = 'EMO';
      fieldName = 'emoId';
      break;
    case 'clinician':
      prefix = 'CLIN';
      fieldName = 'clinicianId';
      break;
    case 'radiologist':
      prefix = 'RAD';
      fieldName = 'radiologistId';
      break;
    default:
      throw new Error(`Invalid role: ${user.role}`);
  }

  // Clear other role IDs
  if (user.role !== 'emo') user.emoId = undefined;
  if (user.role !== 'clinician') user.clinicianId = undefined;
  if (user.role !== 'radiologist') user.radiologistId = undefined;

  // Generate unique ID
  let isUnique = false;
  let counter = 1;
  let generatedId: string;

  while (!isUnique) {
    generatedId = `${prefix}-${String(counter).padStart(3, '0')}`;

    const query: any = {};
    query[fieldName] = generatedId;

    const existingUser = await User.findOne(query);
    if (!existingUser) {
      isUnique = true;
      (user as any)[fieldName] = generatedId;
    } else {
      counter++;
    }
  }
}

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model<IUser>('User', userSchema);