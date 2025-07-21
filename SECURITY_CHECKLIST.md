# Security Checklist for Chrome Web Store Publishing

Use this checklist to verify that your extension is secure before publishing to the Chrome Web Store.

## Backend Security

- [ ] Backend server is running and accessible
- [ ] Firebase service account key is properly secured
- [ ] CORS is configured to only allow requests from your extension
- [ ] All API endpoints validate Firebase ID tokens
- [ ] Environment variables are properly set
- [ ] Server uses HTTPS in production

## Frontend Security

- [ ] No Firebase API keys in the frontend code
- [ ] Extension connects to the backend API successfully
- [ ] Authentication works properly
- [ ] User data is properly saved and retrieved
- [ ] Error handling is in place for API failures

## Chrome Web Store Requirements

- [ ] Extension ID is added to the backend's ALLOWED_ORIGINS
- [ ] Privacy policy is included
- [ ] Permissions are minimized to only what's needed
- [ ] Extension is tested in incognito mode
- [ ] Extension works when Chrome is restarted

## Testing Procedure

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. In another terminal, test the backend connection:
   ```bash
   cd backend
   npm test
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome and test:
   - Click the "Test Backend" button to verify connection
   - Sign up or log in
   - Add some allergies
   - Scan an Amazon Fresh cart
   - Verify that data is saved and retrieved correctly

5. Check the Network tab in Chrome DevTools:
   - Verify that requests go to your backend API
   - Confirm that no direct Firebase API calls are made
   - Check that authentication tokens are properly sent

## Final Verification

Before publishing, make one final check:

1. Update the backend URL in `.env` to your production server
2. Build the extension again
3. Test with the production backend
4. Package the extension for the Chrome Web Store