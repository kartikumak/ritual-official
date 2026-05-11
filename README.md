# Rituals — Spaced Repetition Mastery

Rituals is a production-grade SaaS-grade learning platform inspired by modern memory research. It uses **Spaced Repetition (SM-2)** and **i+1 progression** to help users anchor complex concepts.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS 4, Framer Motion
- **Backend**: Next.js API Routes (Server-side evaluation)
- **Database**: Supabase (PostgreSQL)
- **Design**: Mobile-first, Dashboard Architecture, DM Serif Display Typography

## Features
- **Concept Recall Engine**: Uses weighted keyword matching and response depth analysis.
- **SRS - Spaced Repetition**: Intelligent intervals using the SM-2 algorithm.
- **i+1 Hierarchy**: Automatically unlocks deeper context as you master basic anchors.
- **Production Structure**: Modular architecture with clear separation of business logic and UI.

## Environment Setup
Create a `.env` file from `.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Setup
Run the SQL found in `/supabase_schema.sql` in your Supabase SQL Editor. This will set up:
- Profiles (automatic creation on auth)
- Decks (relational mapping)
- Anchors (with keyword arrays)
- Progress tracking (SRS indexing)
- Review logs (for activity analysis)

## Deployment
1. Connect to **Vercel**.
2. Connect your **Supabase** project.
3. Import the schema.
4. Set environment variables.
