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

### Backend Setup

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

4. Update the `.env` file in the backend directory with your Firebase configuration

5. Start the backend server:
   ```bash
   npm start
   ```

### Frontend Setup

1. Create a `.env` file in the root directory with your API URL:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

2. Install dependencies:

```bash
npm install
```

3. Build the extension:

```bash
npm run build
```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project
   
5. Test the backend connection:
   - Open the extension popup
   - Click the "Test Backend" button next to Privacy Policy

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