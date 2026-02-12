# Banner Production App

A modern full-stack web application for managing banner production sheets with customizable templates, user authentication, and analytics.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) with React and TypeScript
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: Supabase (PostgreSQL with built-in auth, storage, and realtime)
- **Authentication**: Supabase Auth with OAuth providers (Google, Microsoft)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Deployment**: Vercel

## Features

- User authentication with OAuth (Google, Microsoft)
- Customizable production sheet templates
- Banner catalog management with CSV import
- Dynamic form generation based on templates
- Print-optimized production sheets
- Analytics dashboard with usage metrics
- Shared templates between users

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new Supabase project at https://supabase.com
   - Run the migration file `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor
   - Configure OAuth providers (Google, Microsoft) in Supabase Dashboard > Authentication > Providers
   - Create storage buckets for images and CSV files

3. **Configure environment variables:**
   Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Database Setup

The application uses Supabase PostgreSQL. Run the migration file `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor to create all necessary tables, indexes, and Row Level Security policies.

## Deployment

### Deploy to Vercel

1. Push your code to a Git repository
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The application will automatically build and deploy.

## Project Structure

```
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (protected)/      # Protected routes
│   ├── api/             # API routes
│   └── layout.tsx       # Root layout
├── components/
│   ├── ui/              # shadcn/ui components
│   └── BannerSelector.tsx
├── lib/
│   ├── supabase/        # Supabase client utilities
│   └── utils.ts         # Utility functions
├── supabase/
│   └── migrations/      # Database migrations
└── middleware.ts        # Auth middleware
```

## License

MIT

