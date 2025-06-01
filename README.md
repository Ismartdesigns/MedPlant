# MedPlant - Plant Identification System

A modern web application for automatic plant identification using AI. This application helps users identify plants by uploading images and provides detailed information about the identified plants.

## Features

- Plant identification using AI
- Detailed plant information
- User authentication
- Plant history tracking
- Modern, responsive UI
- High-accuracy classification

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Python FastAPI
- **Database**: PostgreSQL
- **AI Model**: Pre-trained plant classification model
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js

## Project Structure

```
medplant/
├── frontend/           # Next.js frontend application
├── backend/           # Python FastAPI backend
├── ai_model/          # Plant classification model
└── docker/            # Docker configuration files
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Docker (optional)

### Installation

1. Clone the repository
2. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Set up the backend:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

4. Set up the database:
   ```bash
   # Configure PostgreSQL connection in .env file
   # Run database migrations
   ```

## Environment Variables

Create `.env` files in both frontend and backend directories with the following variables:

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/medplant
MODEL_PATH=path/to/model
```

## License

MIT 