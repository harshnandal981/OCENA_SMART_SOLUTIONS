# AI Course Generation Agent MVP

This repository contains a full-stack MVP for generating AI-powered courses.

## Stack

- Frontend: React + TypeScript + Vite
- UI: TailwindCSS
- Backend: FastAPI
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- AI: Google Gemini API

## Project Structure

```text
frontend/
backend/
```

## Frontend Setup

1. Open a terminal in `D:\OCENA SMART SOLUTIONS\frontend`
2. Install dependencies:

```bash
npm install
```

3. Copy the environment file and fill in Supabase/backend values:

```bash
copy .env.example .env
```

4. Start the dev server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`.

## Backend Setup

1. Open a terminal in `D:\OCENA SMART SOLUTIONS\backend`
2. Create a virtual environment:

```bash
python -m venv .venv
```

3. Activate it:

```bash
.venv\Scripts\activate
```

4. Install dependencies:

```bash
pip install -r requirements.txt
```

5. Copy the environment file and fill in Supabase/Gemini values:

```bash
copy .env.example .env
```

6. Start the API:

```bash
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000`.

## Supabase Setup

1. Create a Supabase project.
2. Enable email authentication in Supabase Auth.
3. Run the SQL in `backend/supabase_schema.sql` inside the Supabase SQL editor.
4. Add the Supabase URL, anon key, service role key, and JWT secret to the frontend/backend `.env` files.

## Gemini Setup

1. Create a Google AI Studio API key.
2. Add it to `backend/.env` as `GEMINI_API_KEY`.
3. Optionally change `GEMINI_MODEL` from the default.

## MVP Features

- Login
- Signup
- Dashboard
- Create Course page
- Course Viewer page
- Course generation API
- Lesson generation API
- Quiz generation API

## Notes

- The frontend uses Supabase Auth directly for signup/login.
- The backend verifies Supabase JWTs before course generation and persistence.
- Gemini output is normalized into a predictable JSON structure for the UI.
