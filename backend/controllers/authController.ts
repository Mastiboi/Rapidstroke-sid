import * as express from 'express';
import User from '../models/User.ts';
import * as types from '../types.ts';
import { generateToken } from '../utils/jwt.ts';

type RegisterRequest = types.RegisterRequest;
type LoginRequest = types.LoginRequest;
type ApiResponse = types.ApiResponse;
type AuthenticatedRequest = types.AuthenticatedRequest;

type Request = express.Request;
type Response = express.Response;

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, dob, role }: RegisterRequest = req.body;

    // Validate required fields
    if (!name || !email || !password || !dob) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, dob'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate role
    const validRoles = ['emo', 'clinician', 'radiologist'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be emo, clinician, or radiologist'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      dob: new Date(dob),
      role: role || 'patient'
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user._id.toString());

    const response: ApiResponse = {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          dob: user.dob
        },
        token
      }
    };

    res.status(201).json(response);

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. ')
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id.toString());

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          dob: user.dob
        },
        token
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // User is attached to request by auth middleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          dob: user.dob,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching profile'
    });
  }
};

export const updatePushToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({
        success: false,
        message: 'Expo push token is required'
      });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { expoPushTokens: expoPushToken }
    });

    res.status(200).json({
      success: true,
      message: 'Push token updated successfully'
    });

  } catch (error) {
    console.error('Update push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating push token'
    });
  }
};