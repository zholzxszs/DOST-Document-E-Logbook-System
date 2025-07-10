# E-Logbook: Incoming & Outgoing Tracker

A comprehensive document tracking and management system for the Department of Science and Technology (DOST) 1 under Budget and Finance Unit. This system manages incoming and outgoing documents, tracks processing times, and provides detailed analytics for budget and administrative operations.

## System Overview

### Features
- **Document Management**: Track incoming and outgoing documents with detailed metadata
- **Role-Based Access Control**: Different interfaces for incoming and outgoing document administrators
- **Excel Export**: Export filtered data to Excel with formatted styling
- **Archive Management**: Archive documents with audit trails
- **Real-time Dashboard**: Visual analytics and statistics for document processing
- **Average Processing Days Calculation**: Automated calculation of business days excluding weekends

### Technology Stack
- **Frontend**: React.js with Vite
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Charts**: ApexCharts with Axios
- **Excel Export**: ExcelJS
- **Notifications**: SweetAlert2
- **Real-time Document Updates**: Web-Sockets (socket.io)

### System Architecture
```
DOST-Outgoing-Budget-System/
├── frontend/                 # React.js frontend application
│   ├── src/                 # Source code (Navigation, Layout, OverlayModal, etc.)
│   ├── public/              # Static assets
│   ├── Dockerfile           # Frontend Dockerfile
│   ├── index.html           # Main HTML file
│   ├── package.json         # Frontend dependencies and scripts
│   └── ...                  # Other config files
├── backend/                  # Node.js backend application
│   ├── index.js             # Main server file
│   ├── prisma/              # Database schema and migrations
│   ├── routes/              # API route handlers
│   ├── db/                  # Database connection utilities
│   ├── utils/               # Utility functions
│   ├── Dockerfile           # Backend Dockerfile
│   ├── package.json         # Backend dependencies and scripts
│   └── ...                  # Other config files
├── initdb/                  # Database initialization scripts
├── compose.yaml             # Docker Compose configuration
├── .dockerignore            # Docker ignore file
└── README.md                # Main documentation
```

## License
This project is developed for the Department of Science and Technology (DOST) 1 and is intended for internal use. All rights reserved by DMMMSU - SLUC Interns assigned in Finance and Administrative Services under Budget and Finance Unit 2025.

## Contributors
- Judiel Legaspina
- Reymar Herlan Molina
- Mark Lawrence Japson

## Docker Setup

You can run the entire system using Docker and Docker Compose. This provides a consistent environment for development and deployment, with all dependencies and services managed automatically.

### Requirements
- **Docker** (latest version recommended)
- **Docker Compose** (v2 or higher)

### Service Overview
- **Backend** (`backend`): Node.js 22.13.1, runs on port **3000**
- **Frontend** (`frontend`): Node.js 22.13.1, serves static files on port **4173**
- **Database** (`postgresdocument`): PostgreSQL (latest), runs on port **15432** (exposed from container's 5432)

### Environment Variables

#### Backend
- The backend requires a PostgreSQL connection string via the `DATABASE_URL` environment variable. You can set this in a `.env` file in the `backend/` directory or directly in the `docker-compose.yml` file. Example:
  ```env
  DATABASE_URL=postgres://dostone:dostonepass@postgresdocument:5432/dbDocumentLogbook
  ```
- The default database credentials are set in the compose file:
  - `POSTGRES_USER=dostone`
  - `POSTGRES_PASSWORD=dostonepass`
  - `POSTGRES_DB=dbDocumentLogbook`

#### Frontend
- The frontend uses a `.env` file to configure the API endpoint. Create a file named `.env` inside the `frontend/` directory with the following content:
  ```env
  VITE_API_URL=http://<YOUR_BACKEND_IP>:3000
  ```
  - Replace `<YOUR_BACKEND_IP>` with your backend server's IP address.
  - Example for local development:
    ```env
    VITE_API_URL=http://localhost:3000
    ```
  - Example for LAN access (find your IP using `ipconfig`):
    ```env
    VITE_API_URL=http://192.168.1.129:3000
    ```

### Build and Run Instructions

1. **Clone the repository and navigate to the project root.**

2. **Ensure the Dockerfiles are present as `backend/Dockerfile` and `frontend/Dockerfile` in their respective directories, or update the `docker-compose.yml` paths if needed.**

3. **Create `.env` files in `backend/` and `frontend/` as described above to override environment variables if needed.**

4. **Start all services:**
   ```bash
   docker compose up --build
   ```
   This will build and start the backend, frontend, and PostgreSQL database containers.

5. **Access the services:**
   - **Frontend:** http://localhost:4173
   - **Backend API:** http://localhost:3000
   - **PostgreSQL:** localhost:15432 (for development, if you need direct DB access)

### Connecting to PostgreSQL with pgAdmin

To connect to the database using pgAdmin, use the following credentials (as set in `compose.yaml`):

- **Host:** localhost (or the Docker host IP if accessing remotely)
- **Port:** 15432
- **Database:** dbDocumentLogbook
- **Username:** dostone
- **Password:** dostonepass

Steps:
1. Open pgAdmin and create a new server.
2. Under "Connection", enter:
   - Host: `localhost`
   - Port: `15432`
   - Username: `dostone`
   - Password: `dostonepass`
3. Save and connect. You should see the `dbDocumentLogbook` database.
