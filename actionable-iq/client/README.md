# ActionableIQ Client

The frontend application for ActionableIQ, a powerful analytics tool that allows users to query Google Analytics data and generate actionable reports.

## Features

- Google OAuth authentication
- Query Google Analytics data
- Upload Excel files for batch queries
- Generate actionable reports
- Email reports
- Visualize data with heatmaps
- AI-powered data insights

## Tech Stack

- React
- TypeScript
- Redux (Redux Toolkit)
- React Router
- Tailwind CSS
- Google OAuth

## Getting Started

### Prerequisites

- Node.js v16 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the client directory:
   ```bash
   cd actionable-iq/client
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
4. Create a `.env` file in the client directory with the following variables:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
   REACT_APP_API_URL=http://localhost:5000/api
   ```

### Development

Start the development server:

```bash
npm start
# or
yarn start
```

This will run the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Building for Production

Build the app for production:

```bash
npm run build
# or
yarn build
```

### Testing

Run the tests:

```bash
npm test
# or
yarn test
```

## Project Structure

- `src/components`: Reusable UI components
- `src/features`: Feature-specific components
- `src/hooks`: Custom React hooks
- `src/services`: API services
- `src/store`: Redux store
- `src/types`: TypeScript interfaces/types
- `src/utils`: Utility functions

## Authentication

The application uses Google OAuth for authentication. When a user signs in, their Google credentials are validated and a token is stored in local storage for subsequent API requests.

## API Integration

The application communicates with the ActionableIQ backend API to fetch data from Google Analytics and perform other operations.

## Routing

The application uses React Router for navigation. Protected routes are accessible only to authenticated users.
