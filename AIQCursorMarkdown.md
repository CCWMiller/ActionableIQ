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
   - Generation of Excel-formatted reports

2. **Excel Upload Page**
   - Upload Excel files containing queryable data
   - Automatic query generation based on file content
   - New Excel file generation with original data plus Google Analytics insights

3. **Report Actions**
   - Email reports to specified addresses
   - Download reports as Excel files
   - Visualize data via US heatmap
   - Interact with AI chatbot for data insights

4. **AI Chatbot**
   - Context-aware analysis of generated reports
   - Meaningful insights based on report data
   - Dedicated chat interface

## Pages

1. **Landing Page**
   - Google OAuth sign-in
   - Branded design
   - Redirect to Query Page after authentication

2. **Query Page**
   - Navigation header with logo and logout
   - Form with PropertyIds, Source/Medium filter, date range, and result count
   - Report display area

3. **Excel Upload Page**
   - Navigation header with logo and logout
   - Excel file upload form
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

### Testing Requirements
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

### Testing Stack
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

The application is configured to deploy to Google Cloud. CI/CD pipelines will run tests before deployment to ensure code quality.

## Authentication

The application uses Google Cloud OAuth 2.0 for authentication. Users will be redirected to Google's authentication page when signing in.

## Data Flow

Instead of using a database for persistence, the application follows a stateless approach:

1. User authenticates via Google OAuth
2. User inputs query parameters or uploads Excel file
3. Application processes input and queries Google Analytics API
4. Results are processed and displayed in the application
5. User can perform actions on the generated report (download, email, visualize, analyze)

This stateless architecture simplifies deployment and maintenance while still providing all core functionality. If persistent storage needs arise in the future (for saved queries, report templates, etc.), a database component can be added.


## Development Plan

### Phase 1: Core Infrastructure (1-2 weeks)

1. **Frontend Authentication**
   - Implement Google OAuth integration
   - Create login/logout functionality
   - Set up protected routes

2. **Backend API Setup**
   - Configure Google Analytics API integration
   - Create endpoints for data retrieval
   - Set up authentication middleware
   - Implement error handling

3. **State Management**
   - Configure Redux store
   - Create reducers for authentication, queries, and reports
   - Set up API middleware for async operations

### Phase 2: Query Feature (2-3 weeks)

1. **Query Form Components**
   - Build PropertyIds selector
   - Create date range picker
   - Implement Source/Medium filter
   - Add result count input

2. **Report Display**
   - Design data table component
   - Implement sorting and filtering
   - Create report summary section

3. **API Integration**
   - Connect form to backend API
   - Implement data fetching and transformation
   - Add loading states and error handling

### Phase 3: Excel Upload Feature (2 weeks)

1. **File Upload Component**
   - Create drag-and-drop interface
   - Implement file validation
   - Add progress indicator

2. **Excel Processing**
   - Develop Excel parsing functionality
   - Create query generation from Excel data
   - Implement Excel output generation

### Phase 4: Report Actions (2-3 weeks)

1. **Download Functionality**
   - Implement Excel export
   - Create PDF export option

2. **Email Feature**
   - Build email form component
   - Implement email sending functionality
   - Add email templates

3. **Heatmap Visualization**
   - Integrate US map component
   - Implement data visualization logic
   - Add interaction and tooltips

### Phase 5: AI Chatbot (2-3 weeks)

1. **Chat Interface**
   - Design chat UI component
   - Implement message display
   - Create input form

2. **AI Integration**
   - Set up NLP service connection
   - Implement context-aware analysis
   - Create data-driven insights generation

### Phase 6: Testing & QA (Ongoing)

1. **Unit Tests**
   - Write tests for all components
   - Create service mocks
   - Implement state management tests

2. **Integration Tests**
   - Set up end-to-end testing
   - Create test scenarios for main user flows
   - Implement accessibility testing

3. **Performance Optimization**
   - Conduct load testing
   - Implement lazy loading
   - Optimize bundle size

### Phase 7: Deployment & Documentation (1 week)

1. **CI/CD Setup**
   - Configure build pipeline
   - Set up automatic testing
   - Implement deployment process

2. **Documentation**
   - Create user documentation
   - Write API documentation
   - Develop maintenance guide

#comment for deployment
