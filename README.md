# server-oak-blogspot

Express API for the `oak-blogspot` frontend. It stores members, articles,
comments, likes, categories, and profiles in Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env` and fill in the values.
4. Start development mode with `npm run dev`, or start normally with `npm start`.
5. Optionally import the frontend seed articles into an empty database with
   `npm run import:articles`.

The server listens on `http://localhost:4000` by default.

## API

- `GET /api/health`
- `GET /api/articles`
- `GET /api/articles/:id`
- `POST /api/articles`
- `PATCH /api/articles/:id`
- `DELETE /api/articles/:id`
- `POST /api/articles/:id/comments`
- `DELETE /api/articles/:id/comments/:commentId`
- `POST /api/articles/:id/like`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `POST /api/auth/password`
- `GET/POST/PATCH/DELETE /api/categories`
- `GET/PUT /api/profile`

Member routes require a Supabase access token in the `Authorization: Bearer`
header. Admin write routes accept an authenticated admin user. The
`x-admin-api-key` header remains available for trusted server-to-server jobs.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

## Architecture

Requests flow through these layers:

1. `routes/` defines paths, methods, middleware, and controllers.
2. `middleware/` handles authentication, validation, and errors.
3. `controllers/` translates HTTP requests and responses.
4. `services/` contains business rules and does not access `req` or `res`.
5. `repositories/` is the only application layer that queries Supabase tables.
6. `mappers/` translates between database rows and API models.

Health and notification endpoints use controllers directly because they do not
need database repositories or business services.
