# Loan Calculator Project

This project consists of a Next.js frontend and a Python FastAPI backend for a loan calculator application.

## Project Structure

- `loan-calculator-next/`: Next.js frontend application
- `loan-calculator-backend/`: Python FastAPI backend application

## Regular Installation

### Frontend (Next.js)

1. Navigate to the frontend directory:
   ```
   cd loan-calculator-next
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`.

### Backend (Python FastAPI)

1. Navigate to the backend directory:
   ```
   cd loan-calculator-backend
   ```

2. Create a virtual environment:
   
   Using venv:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```
   
   Or using conda:
   ```
   conda create -n loan-calculator-env python=3.11
   conda activate loan-calculator-env
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the backend server:
   ```
   uvicorn main:app --reload
   ```

   The backend API will be available at `http://localhost:8000`.

## Docker Installation

To run the project using Docker:

1. Ensure you have Docker and Docker Compose installed on your system.

2. Navigate to the root directory of the project (where the `docker-compose.yml` file is located).

3. Build and start the containers:
   ```
   docker-compose up --build
   ```

   This will build the Docker images for both the frontend and backend, and start the containers.

4. Access the applications:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`

To stop the containers, press `Ctrl+C` in the terminal where docker-compose is running, or run: