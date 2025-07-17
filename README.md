# Allergy Tracker Chrome Extension

A Chrome extension that helps users identify potential allergens in their Amazon Fresh cart items.

## Features

- Scrapes Amazon Fresh cart items to extract ingredients
- Allows users to register and save their allergies
- Highlights allergens found in product ingredients
- Provides warnings for products containing user's allergens

## How It Works

1. The extension injects a content script into Amazon Fresh cart pages
2. When the user clicks "Scrape My Fresh Cart", the extension:
   - Finds all products in the cart
   - Visits each product page to extract ingredients
   - Checks ingredients against the user's saved allergies
   - Highlights any allergens found

## Setup

### Prerequisites

- Node.js and npm
- Firebase account (for authentication and storing user allergies)

### Installation

1. Clone this repository
2. Create a `.env` file with your Firebase configuration:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

3. Install dependencies:

```bash
npm install
```

4. Build the extension:

```bash
npm run build
```

5. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Usage

1. Sign up or log in to the extension
2. Add your allergies to your profile
3. Navigate to your Amazon Fresh cart
4. Click the extension icon to open the popup
5. Click "Scrape My Fresh Cart"
6. Review the results - any products containing your allergens will be highlighted

## Development

```bash
npm run dev
```

## License

MIT