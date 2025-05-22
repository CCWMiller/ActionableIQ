# ActionableIQ

A powerful analytics tool that allows users to query Google Analytics data and generate actionable reports.

## Project Overview

ActionableIQ is a web application that enables users to query Google Analytics data directly or through Excel file uploads. The application generates comprehensive reports that can be downloaded, emailed, visualized as heatmaps, or analyzed through an AI chatbot.

## Tech Stack

### Frontend
- React
- TypeScript
- Redux
- React Hooks
- Tailwind CSS
- React Router

### Backend
- C#
- .NET

### Infrastructure
- Authentication: Google Cloud OAuth 2.0
- Hosting: Google Cloud
- API Integration: Google Analytics

## Features

### Core Features

1. **Query Page**
   - Direct querying of Google Analytics data
   - Support for querying multiple sources simultaneously
   - Generation of formatted reports

2. **Report Actions**
   - Email reports to specified addresses
   - Download reports as CSV files

## Pages

1. **Landing Page**
   - Google OAuth sign-in
   - Branded design
   - Redirect to Query Page after authentication

2. **Query Page**
   - Navigation header with logo and logout
   - Form with PropertyIds, Source/Medium filter, date range, and result count
   - Report display area

## Development Requirements

### General
- React with TypeScript for scalability
- Responsive design for all device sizes
- Modern UI implementation
- React Router for navigation
- Form validation and error handling
- Google Cloud authentication integration
- Proper code organization and component structure
- State management using Redux
- Accessibility compliance

### Testing Requirements (Coming Soon)
- Test-driven development approach
- 90%+ unit test coverage (measured by Istanbul)
- Comprehensive test suite:
  - Component rendering tests
  - Form validation tests
  - Routing/navigation tests
  - State management tests
  - API call tests with mock services
  - Error handling tests
  - Accessibility tests

### Testing Stack (Coming Soon)
- Jest + React Testing Library for unit/integration tests
- Cypress for E2E testing
- MSW for API mocking

### CI/CD and Quality Requirements
- Test configuration in CI/CD pipeline
- Coverage reporting with thresholds
- Snapshot testing for core components
- All tests must pass before deployment
- Validation of happy paths and edge cases
- Test files alongside components
- AAA pattern (Arrange-Act-Assert)
- Accessibility checks in all component tests

## Project Structure

actionable-iq/
├── client/                 # Frontend React application
│   ├── public/             # Static assets
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── types/          # TypeScript interfaces/types
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx         # Root component
│   └── package.json
├── server/                 # Backend .NET application
│   ├── ActionableIQ.API/   # ASP.NET Core API project
│   ├── ActionableIQ.Core/  # Domain logic and services
│   ├── ActionableIQ.Tests/ # Unit and integration tests
│   └── ActionableIQ.sln    # Solution file
└── README.md

## Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- .NET 6.0+ (for backend)

### Testing

Run unit and integration tests:
```bash
npm test
```

Run E2E tests with Cypress:
```bash
npm run cypress:open
```

Check test coverage:
```bash
npm run test:coverage
```

## Deployment

The application is configured to deploy to Google Cloud. CI/CD pipelines run tests before deployment to ensure code quality.

The deployment process follows these steps:
1. A GitHub push kicks off the Cloud Run build
2. The frontend is rolled out first and must be promoted by the application owner
3. Once the frontend promotion is complete, the backend rollout begins
4. The backend must also be promoted to production
5. Each promotion requires a review process
6. Once both rollouts are promoted to production, the deployment is complete

## Authentication

The application uses Google Cloud OAuth 2.0 for authentication. Users will be redirected to Google's authentication page when signing in.

## Data Flow

Instead of using a database for persistence, the application follows a stateless approach:

1. User authenticates via Google OAuth
2. User inputs query parameters
3. Application processes input and queries Google Analytics API
4. Results are processed and displayed in the application
5. User can perform actions on the generated report (download, email)

This stateless architecture simplifies deployment and maintenance while still providing all core functionality. If persistent storage needs arise in the future (for saved queries, report templates, etc.), a database component can be added.
