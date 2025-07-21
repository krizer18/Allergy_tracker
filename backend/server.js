import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Simple CORS configuration - allow all requests from Chrome extension
app.use(cors());

// Parse JSON request body
app.use(express.json());

// Initialize Firebase Admin
let serviceAccount;

try {
  // Try to load the service account key file
  const rawData = fs.readFileSync('./service-account-key.json');
  serviceAccount = JSON.parse(rawData);
  console.log('Service account key loaded successfully');
} catch (error) {
  console.warn('Service account key file not found, using environment variables');
  // Fallback to environment variables
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };
}

const firebaseConfig = {
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Get Firebase config (safe to expose)
app.get('/api/firebase-config', (req, res) => {
  const publicConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
    googleClientId: process.env.GOOGLE_CLIENT_ID
  };
  
  res.status(200).json(publicConfig);
});

// Verify Firebase token
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    // Verify the token with Firebase Admin
    const decodedToken = await auth.verifyIdToken(token);
    
    // Set user in request
    req.user = { uid: decodedToken.uid };
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

// Firebase Auth REST API base URL
const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// User authentication endpoints
app.post('/api/signup', async (req, res) => {
  try {
    console.log('Signup request received');
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Use Firebase Auth REST API to create user
    try {
      console.log('Calling Firebase Auth API');
      const response = await fetch(
        `${FIREBASE_AUTH_URL}/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log('Firebase Auth API error:', data.error);
        throw new Error(data.error?.message || 'Failed to create user');
      }
      
      console.log('User created:', data.localId);
      
      // Initialize user in Firestore
      const userRef = db.collection('users').doc(data.localId);
      await userRef.set({
        email: data.email,
        createdAt: new Date().toISOString(),
        allergies: []
      }, { merge: true });
      
      console.log('Signup successful for:', email);
      
      // Return token and user info
      res.status(200).json({
        idToken: data.idToken,
        email: data.email,
        uid: data.localId,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      });
    } catch (authError) {
      console.error('Firebase Auth error:', authError);
      res.status(400).json({ error: authError.message || 'Failed to create user' });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    console.log('Login request received');
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Use Firebase Auth REST API to sign in user
    try {
      console.log('Calling Firebase Auth API');
      const response = await fetch(
        `${FIREBASE_AUTH_URL}/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log('Firebase Auth API error:', data.error);
        throw new Error(data.error?.message || 'Login failed');
      }
      
      console.log('Login successful for:', email);
      
      // Return token and user info
      res.status(200).json({
        idToken: data.idToken,
        email: data.email,
        uid: data.localId,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn
      });
    } catch (authError) {
      console.error('Firebase Auth error:', authError);
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

app.post('/api/google-auth', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    console.log('Received Google access token');
    
    // Get user info from Google with the access token
    const googleUserInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    if (!googleUserInfoResponse.ok) {
      throw new Error('Failed to get user info from Google');
    }
    
    const googleUserInfo = await googleUserInfoResponse.json();
    const email = googleUserInfo.email;
    
    if (!email) {
      throw new Error('No email found in Google user info');
    }
    
    console.log('Got user info from Google:', email);
    
    // Check if user exists in Firebase
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('User exists in Firebase:', userRecord.uid);
    } catch (error) {
      // User doesn't exist, create a new one
      console.log('Creating new user in Firebase');
      userRecord = await auth.createUser({
        email,
        emailVerified: true,
        displayName: googleUserInfo.name
      });
      
      // Initialize user in Firestore
      const userRef = db.collection('users').doc(userRecord.uid);
      await userRef.set({
        email: userRecord.email,
        createdAt: new Date().toISOString(),
        allergies: []
      }, { merge: true });
    }
    
    // Create a custom token for the user
    const customToken = await auth.createCustomToken(userRecord.uid);
    
    console.log('Created custom token for user');
    
    // Return token and user info
    res.status(200).json({
      token: customToken,
      uid: userRecord.uid,
      email: email
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: error.message || 'Google authentication failed' });
  }
});

app.post('/api/token-refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    // Call Firebase Auth REST API to refresh token
    const response = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Token refresh failed');
    }
    
    // Return new tokens
    res.status(200).json({
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: error.message || 'Token refresh failed' });
  }
});

// Get user allergies
app.get('/api/allergies', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(200).json({ allergies: [] });
    }
    
    const userData = userDoc.data();
    let allergies = [];
    
    if (userData.allergies) {
      if (Array.isArray(userData.allergies)) {
        allergies = userData.allergies;
      } else if (userData.allergies.items && Array.isArray(userData.allergies.items)) {
        allergies = userData.allergies.items;
      }
    }
    
    res.status(200).json({ allergies });
  } catch (error) {
    console.error('Error getting allergies:', error);
    res.status(500).json({ error: 'Failed to retrieve allergies' });
  }
});

// Save user allergies
app.post('/api/allergies', verifyToken, async (req, res) => {
  try {
    const { allergies } = req.body;
    const userId = req.user.uid;
    
    if (!Array.isArray(allergies)) {
      return res.status(400).json({ error: 'Allergies must be an array' });
    }
    
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      allergies,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    res.status(200).json({ message: 'Allergies saved successfully', allergies });
  } catch (error) {
    console.error('Error saving allergies:', error);
    res.status(500).json({ error: 'Failed to save allergies' });
  }
});

// Save scrape results
app.post('/api/scrape-results', verifyToken, async (req, res) => {
  try {
    const { results } = req.body;
    const userId = req.user.uid;
    
    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'Results must be an array' });
    }
    
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
      latestScrape: {
        results,
        timestamp: new Date().toISOString()
      }
    }, { merge: true });
    
    res.status(200).json({ message: 'Scrape results saved successfully' });
  } catch (error) {
    console.error('Error saving scrape results:', error);
    res.status(500).json({ error: 'Failed to save scrape results' });
  }
});

// Get latest scrape results
app.get('/api/scrape-results', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data().latestScrape) {
      return res.status(200).json({ results: [] });
    }
    
    const latestScrape = userDoc.data().latestScrape;
    res.status(200).json({ 
      results: latestScrape.results,
      timestamp: latestScrape.timestamp
    });
  } catch (error) {
    console.error('Error getting scrape results:', error);
    res.status(500).json({ error: 'Failed to retrieve scrape results' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});