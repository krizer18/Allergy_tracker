// Authentication service for secure backend communication
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebase";

// API base URL from environment variable or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// User interface
export interface User {
  uid: string;
  email: string | null;
  token?: string;
}

// Auth state
let currentUser: User | null = null;
let authToken: string | null = null;
let refreshToken: string | null = null;

// Load from localStorage on init
try {
  const storedUser = localStorage.getItem('currentUser');
  const storedToken = localStorage.getItem('authToken');
  const storedRefreshToken = localStorage.getItem('refreshToken');
  
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  }
  
  if (storedToken) {
    authToken = storedToken;
  }
  
  if (storedRefreshToken) {
    refreshToken = storedRefreshToken;
  }
} catch (error) {
  console.error('Error loading auth state from localStorage:', error);
}

// Sign up with email and password
export async function signUp(email: string, password: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Sign up failed');
    }
    
    const data = await response.json();
    
    // Save auth state
    currentUser = {
      uid: data.uid,
      email: data.email
    };
    
    authToken = data.token;
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (typeof authToken === "string") {
      localStorage.setItem('authToken', authToken);
    }
    
    return currentUser;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }
    
    const data = await response.json();
    
    // Save auth state
    currentUser = {
      uid: data.uid,
      email: data.email
    };
    
    authToken = data.token;
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (typeof authToken === "string") {
      localStorage.setItem('authToken', authToken);
    }
    
    return currentUser;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

// Sign in with Google using Chrome identity API and backend
export async function signInWithGoogle(): Promise<User> {
  try {
    // Use Chrome identity API to get Google OAuth token
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    const redirectUri = chrome.identity.getRedirectURL();
    const scope = encodeURIComponent('profile email');
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${scope}`;

    console.log('Starting Google OAuth flow');
    console.log('Redirect URI:', redirectUri);
    
    // Launch web auth flow
    const callbackUrl = await new Promise<string>((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!responseUrl) {
          reject(new Error('No response URL'));
        } else {
          resolve(responseUrl);
        }
      });
    });
    
    // Extract access token from callback URL
    const hash = new URL(callbackUrl).hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    
    if (!accessToken) {
      throw new Error('No access token returned');
    }
    
    console.log('Got access token, exchanging with backend');
    
    // Exchange access token with backend
    const response = await fetch(`${API_BASE_URL}/google-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accessToken })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Google authentication failed');
    }
    
    const data = await response.json();
    
    // Save auth state
    currentUser = {
      uid: data.uid,
      email: data.email
    };
    
    authToken = data.token;
    
    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (typeof authToken === "string") {
      localStorage.setItem('authToken', authToken);
    }
    
    return currentUser;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
}

// Sign out
export async function signOutUser(): Promise<void> {
  try {
    // Sign out from Firebase
    const auth = getAuth(app);
    await signOut(auth);
    
    // Clear auth state
    currentUser = null;
    authToken = null;
    refreshToken = null;
    
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userAllergies');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user
export function getCurrentUser(): User | null {
  return currentUser;
}

// Get auth token
export async function getAuthToken(): Promise<string> {
  if (!authToken) {
    throw new Error('User not authenticated');
  }
  
  // TODO: Check token expiration and refresh if needed
  
  return authToken;
}

// Refresh token
export async function refreshAuthToken(): Promise<null | string> {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/token-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Token refresh failed');
    }
    
    const data = await response.json();
    
    // Update tokens
    authToken = data.id_token;
    refreshToken = data.refresh_token;
    
    // Save to localStorage
    if (typeof authToken === "string") {
      localStorage.setItem('authToken', authToken);
    }
    if (typeof refreshToken === "string") {
      localStorage.setItem('refreshToken', refreshToken);
    }
    
    return authToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
}