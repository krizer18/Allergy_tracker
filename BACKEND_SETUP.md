# Backend Setup for Allergy Tracker

This document explains how to set up the backend server for the Allergy Tracker Chrome Extension to securely handle Firebase authentication and operations.

## Why a Backend?

When publishing a Chrome extension to the Chrome Web Store, it's important to keep API keys and other sensitive credentials secure. By moving Firebase operations to a backend server, we can:

1. Keep Firebase API keys and credentials secure
2. Implement proper CORS policies to restrict access to our extension
3. Add additional security layers like rate limiting and request validation

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Firebase service account:
   - Go to your Firebase project settings
   - Navigate to "Service accounts" tab
   - Click "Generate new private key"
   - Save the JSON file as `service-account-key.json` in the backend directory

4. Update the `.env` file in the backend directory with your Firebase service account details:
   ```
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="your-private-key"
   ```

5. Update the `ALLOWED_ORIGINS` in the backend `.env` file with your Chrome extension ID:
   ```
   ALLOWED_ORIGINS=chrome-extension://your-extension-id
   ```

6. Start the backend server:
   ```bash
   npm start
   ```

### 2. Frontend Setup

1. Update the API base URL in `src/services/api.ts` with your deployed backend URL (if using a production server).

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Finding Your Extension ID

To find your Chrome extension ID:
1. Load your extension in developer mode
2. The ID will be displayed under the extension name in the extensions page
3. It looks like: `abcdefghijklmnopqrstuvwxyzabcdef`

## Deploying the Backend

For production use, deploy the backend to a secure hosting service like:
- AWS Elastic Beanstalk
- Google Cloud Run
- Heroku
- Render
- Railway

Make sure to set up proper environment variables on your hosting platform.

## Security Considerations

1. Always use HTTPS for your backend server
2. Restrict CORS to only allow requests from your Chrome extension
3. Implement rate limiting to prevent abuse
4. Consider adding additional authentication for API endpoints
5. Regularly rotate your Firebase service account keys