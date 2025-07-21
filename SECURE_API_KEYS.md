# Securing Firebase API Keys for Chrome Web Store

When publishing your Chrome extension to the Chrome Web Store, it's important to secure your Firebase API keys. Here are some simple approaches:

## Option 1: Restrict API Key Usage

The simplest approach is to restrict your Firebase API key to only work from your Chrome extension:

1. Go to the Google Cloud Console: https://console.cloud.google.com/
2. Select your project
3. Go to "APIs & Services" > "Credentials"
4. Find your API key and click "Edit"
5. Under "Application restrictions", select "HTTP referrers (websites)"
6. Add your Chrome extension ID as a referrer with this format:
   ```
   chrome-extension://YOUR_EXTENSION_ID/*
   ```
7. Save the changes

This way, even if someone extracts your API key, they can't use it from other domains or applications.

## Option 2: Use a Backend Server

For more security, you can create a backend server that handles Firebase operations:

1. Create a simple server (Node.js/Express)
2. Move Firebase admin operations to the server
3. Secure the server with proper authentication
4. Have your extension communicate with your server instead of Firebase directly

## Option 3: Use Firebase Security Rules

Implement strict Firebase Security Rules to control what data can be accessed:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures that even if someone gets your API key, they can only access data they're authorized to see.

## Finding Your Chrome Extension ID

To find your extension ID:
1. Load your unpacked extension in Chrome
2. Go to chrome://extensions
3. Enable Developer Mode
4. Your extension ID will be displayed under the extension name

## Additional Security Tips

1. Never include sensitive API keys in your code comments
2. Consider using environment variables during development
3. Regularly audit your Firebase usage for suspicious activity
4. Rotate your API keys periodically
5. Use Firebase Authentication to secure user data