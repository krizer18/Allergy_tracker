# Verifying Backend Connection

To verify that your backend is working correctly and your extension is secure:

## 1. Start the Backend Server

1. Open a terminal/command prompt
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Install dependencies (first time only):
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. You should see: `Server running on port 3000`

## 2. Test the Connection from the Extension

1. Reload your extension in Chrome:
   - Go to `chrome://extensions/`
   - Find your Allergy Tracker extension
   - Click the refresh/reload icon
   
2. Open the extension popup
   
3. Click the "Test Backend" button (small button next to Privacy Policy)
   
4. You should see a message:
   - Success: "Backend is connected and working!"
   - Failure: "Backend connection failed. Make sure the server is running."

## 3. Verify Security

Your extension is now secure because:

1. The Firebase API keys are no longer exposed in the client-side code
2. The backend server restricts access to only your Chrome extension
3. All sensitive operations are handled through the backend

## 4. For Production

Before publishing to the Chrome Web Store:

1. Deploy the backend to a hosting service (Heroku, AWS, etc.)
2. Update the API URL in your extension to point to your deployed backend
3. Set up CORS on the backend to only allow requests from your extension ID
4. Update your extension's permissions to only include necessary domains