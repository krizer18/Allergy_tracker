# Security Plan for Allergy Tracker

## Current Status

We've temporarily reverted to using direct Firebase initialization to fix the authentication error. This is not the final secure solution.

## Next Steps for Proper Security

1. **Backend Authentication Proxy**:
   - Create authentication endpoints on the backend that proxy to Firebase Auth
   - Implement `/api/signup`, `/api/login`, and `/api/google-auth` endpoints
   - Store Firebase Admin credentials securely on the backend

2. **Remove Client-Side Firebase Auth**:
   - Remove Firebase initialization from the frontend
   - Replace all Firebase Auth calls with API calls to the backend
   - Use session tokens or JWT for maintaining authentication state

3. **Secure Data Access**:
   - All data operations should go through the backend API
   - Backend verifies user identity before allowing data access
   - Implement proper error handling for authentication failures

## Implementation Plan

1. **Phase 1 (Current)**: 
   - Use direct Firebase initialization to get the app working
   - Ensure all data operations use the backend API

2. **Phase 2**:
   - Implement authentication proxy on the backend
   - Update frontend to use backend for authentication
   - Remove Firebase API keys from frontend

3. **Phase 3**:
   - Complete security audit
   - Implement additional security measures (rate limiting, etc.)
   - Deploy to production with secure configuration

## Security Best Practices

- Never expose Firebase API keys in production frontend code
- Use HTTPS for all API communications
- Implement proper CORS restrictions on the backend
- Use Firebase Security Rules as an additional layer of protection
- Regularly rotate credentials and audit access logs