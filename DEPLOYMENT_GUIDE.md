# Deployment Guide for Allergy Tracker

This guide explains how to deploy the Allergy Tracker extension securely with the backend API.

## Backend Deployment

1. **Set up your server**:
   - Deploy the backend to a hosting service like Heroku, AWS, or Google Cloud
   - Ensure your server uses HTTPS for secure communication

2. **Configure environment variables**:
   - Set all required environment variables on your hosting platform:
     ```
     FIREBASE_API_KEY=your-api-key
     FIREBASE_AUTH_DOMAIN=your-auth-domain
     FIREBASE_PROJECT_ID=your-project-id
     FIREBASE_STORAGE_BUCKET=your-storage-bucket
     FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     FIREBASE_APP_ID=your-app-id
     FIREBASE_MEASUREMENT_ID=your-measurement-id
     GOOGLE_CLIENT_ID=your-google-client-id
     PORT=3000 (or as provided by your hosting service)
     ALLOWED_ORIGINS=chrome-extension://your-extension-id
     FIREBASE_CLIENT_EMAIL=your-service-account-email
     FIREBASE_PRIVATE_KEY=your-service-account-private-key
     ```

3. **Upload service account key**:
   - If your hosting platform supports file uploads, upload your `service-account-key.json`
   - Otherwise, use the environment variables for service account credentials

4. **Start the server**:
   - Follow your hosting platform's instructions to start the Node.js server

## Frontend Deployment

1. **Update API URL**:
   - Edit `.env` file to point to your deployed backend:
     ```
     VITE_API_BASE_URL=https://your-backend-url.com/api
     ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Test the extension**:
   - Load the unpacked extension from the `dist` folder
   - Verify that it connects to your backend using the "Test Backend" button

4. **Package for Chrome Web Store**:
   - Zip the contents of the `dist` folder
   - Upload to the Chrome Web Store Developer Dashboard

## Security Verification

1. **Verify API key security**:
   - Open the extension in Chrome DevTools
   - Check Network tab to ensure requests go to your backend
   - Verify that Firebase API keys are not visible in the source code

2. **Test CORS protection**:
   - Try accessing your backend API from a different origin
   - It should be rejected with a CORS error

3. **Verify authentication**:
   - Test that unauthenticated requests to protected endpoints are rejected
   - Verify that Firebase ID tokens are properly validated

## Updating Your Extension

When you need to update your extension:

1. Make your code changes
2. Update the backend if necessary
3. Build the extension: `npm run build`
4. Upload the new version to the Chrome Web Store

## Troubleshooting

- **Backend connection issues**: Check that your backend URL is correct and the server is running
- **Authentication errors**: Verify that your Firebase configuration is correct
- **CORS errors**: Make sure your extension ID is in the `ALLOWED_ORIGINS` list on the backend
- **API key issues**: Confirm that your backend has the correct Firebase credentials