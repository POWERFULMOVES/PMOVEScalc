# PMOVEScalc

## Overview

This project is a comprehensive loan calculator application consisting of a Next.js frontend and a Python FastAPI backend. It allows users to calculate loan amortization schedules, providing detailed information about payments, interest, and principal balances over the life of a loan.

## Project Structure

The project is divided into two main parts:

1. Frontend (`loan-calculator-next/`)
   - Built with Next.js, a React framework
   - Handles user interface and interactions
   - Communicates with the backend API

2. Backend (`loan-calculator-backend/`)
   - Built with FastAPI, a modern Python web framework
   - Processes loan calculations
   - Provides API endpoints for the frontend

## Key Features

- Calculate loan amortization schedules
- Support for various payment frequencies
- Flexible interest calculation methods (Actual days or 30-day month)
- Option for additional principal payments
- Credit insurance inclusion
- Export amortization schedule to Excel

## Technical Details

### Frontend (Next.js)

The frontend is built using Next.js, a popular React framework. It provides a user-friendly interface for inputting loan details and displaying the calculated results.

Key components and features:

- React components for form inputs and result displays
- State management for handling user inputs and API responses
- API integration using Axios for communication with the backend
- Responsive design for various screen sizes
- Data visualization (if implemented) for displaying loan information graphically

### Backend (FastAPI)

The backend is powered by FastAPI, a high-performance Python web framework. It handles the complex calculations for loan amortization and provides API endpoints for the frontend to consume.

Key features and endpoints:

1. Main application (`app.py`):
   - Defines the FastAPI application
   - Sets up CORS middleware for cross-origin requests
   - Defines the loan calculation endpoint

2. Loan calculation logic:
   - Handles various loan parameters (loan amount, interest rate, term, etc.)
   - Supports different payment frequencies and interest calculation methods
   - Calculates amortization schedule, including principal, interest, and balance for each payment
   - Handles additional principal payments and credit insurance if applicable

3. API Endpoints:
   - POST `/calculate-loan`: Accepts loan parameters and returns the amortization schedule
   - GET `/export-excel`: Generates and returns an Excel file with the amortization schedule

4. Data Models:
   - Uses Pydantic for data validation and serialization
   - Defines `LoanRequest` model for input validation

### Key Dependencies

Frontend:
- React and Next.js for UI and routing
- Axios for API requests
- (Any additional libraries for UI components or data visualization)

Backend:
- FastAPI for API framework
- Pydantic for data validation
- XlsxWriter for Excel file generation
- python-dateutil for date calculations

## How It Works

1. User Input:
   - Users enter loan details on the frontend interface (loan amount, interest rate, term, etc.)

2. API Request:
   - Frontend sends a POST request to the backend's `/calculate-loan` endpoint with the loan parameters

3. Loan Calculation:
   - Backend processes the request, performing the following steps:
     a. Validates input data using Pydantic models
     b. Calculates the payment amount (if not provided)
     c. Generates the amortization schedule, considering:
        - Payment frequency
        - Interest calculation method (actual days or 30-day month)
        - Additional principal payments
        - Credit insurance (if applicable)

4. Response:
   - Backend sends the calculated amortization schedule back to the frontend

5. Display Results:
   - Frontend displays the amortization schedule and summary information to the user

6. Excel Export (Optional):
   - Users can request an Excel export of the amortization schedule
   - Frontend sends a request to the `/export-excel` endpoint
   - Backend generates an Excel file and sends it as a downloadable response

## Getting Started

To get a local copy up and running, follow these steps:

1. Clone the repository
   ```
   git clone https://github.com/yourusername/loan-calculator-project.git
   ```

2. Follow the installation instructions in INSTRUCTIONS.md for either local setup or Docker setup.

## Installation and Running

Refer to the INSTRUCTIONS.md file for detailed steps on how to install and run the project, both using traditional methods and Docker.

## Future Enhancements

Potential areas for future development:
- Additional loan types (e.g., adjustable-rate mortgages)
- Integration with financial data APIs for real-time interest rates
- User authentication and saved calculations
- Mobile app version

## Contributing

Guidelines for contributing to the project, if applicable.

## License

Specify the license under which this project is released.