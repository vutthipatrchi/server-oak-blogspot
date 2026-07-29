# server-oak-blogspot

Express API extracted from the `oak-blogspot` project. It stores articles and comments in Supabase.

## Setup

1. Install dependencies with `npm install`.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env` and fill in the values.
4. Start development mode with `npm run dev`, or start normally with `npm start`.

The server listens on `http://localhost:4000` by default.

## API

- `GET /api/health`
- `GET /api/articles`
- `GET /api/articles/:id`
- `POST /api/articles`
- `PATCH /api/articles/:id`
- `DELETE /api/articles/:id`

Write routes require both `SUPABASE_SERVICE_ROLE_KEY` and an `x-admin-api-key` header matching `ADMIN_API_KEY`.

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
