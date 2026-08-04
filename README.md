# server-oak-blogspot

Express API for the `oak-blogspot` frontend. It stores members, articles,
comments, likes, categories, and profiles in Supabase.

## Setup

1. Install dependencies with `npm install`.
2. For a new project, run `supabase/schema.sql` in the Supabase SQL Editor.
   For an existing project that still has `articles.category`, run
   `supabase/migrations/20260804000100_articles_category_fk.sql` before deploying this API.
   After every backend instance uses `category_id`, run
   `supabase/cleanup/drop_legacy_article_category.sql` to remove the compatibility column.
   Existing projects must also run
   `supabase/migrations/20260804000200_unify_user_profiles.sql` before deploying this API.
   After every backend instance uses `profiles`, run
   `supabase/cleanup/drop_legacy_profile_tables.sql`.
3. Create a private Supabase Storage bucket named `oakblog` (or set
   `SUPABASE_IMAGE_BUCKET` to another private bucket name). Uploaded objects use
   `articles/YYYY/MM`, `profiles/admins/:id`, and `profiles/members/:id` paths.
4. Copy `.env.example` to `.env` and fill in the values.
5. Start development mode with `npm run dev`, or start normally with `npm start`.
6. Optionally import the frontend seed articles into an empty database with
   `npm run import:articles`.

The server listens on `http://localhost:4000` by default.

## API

- `GET /api/health`
- `GET /api/articles`
- `GET /api/articles/:id`
- `POST /api/articles`
- `PATCH /api/articles/:id`
- `DELETE /api/articles/:id`
- `POST /api/uploads/articles` (admin; raw JPEG, PNG, or WebP; maximum 5 MB)
- `POST /api/uploads/profiles/admins` (admin; raw image; maximum 5 MB)
- `POST /api/uploads/profiles/members` (member; raw image; maximum 5 MB)
- `POST /api/articles/:id/comments`
- `DELETE /api/articles/:id/comments/:commentId`
- `POST /api/articles/:id/like`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- `POST /api/auth/password`
- `GET/POST/PATCH/DELETE /api/categories`
- `GET/PUT /api/profile`

Run `npm run smoke:release` against a configured Supabase project to verify the
complete authentication, profile, article, comment, and like flow. The command
creates temporary data and removes it before exiting.

Member routes require a Supabase access token in the `Authorization: Bearer`
header. Article write routes accept users whose `profiles.role` is `owner` or
`admin`; regular signups receive the `member` role. The
`x-admin-api-key` header remains available for trusted server-to-server jobs.
Set `OWNER_EMAIL` to the Supabase Auth account that owns the website. The older
`ADMIN_EMAIL` setting remains a compatibility fallback.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code.

Enable **Confirm email** in Supabase Auth for verified registrations. Refresh
tokens are rotated through an HttpOnly cookie; set `AUTH_COOKIE_SECURE=true` in
HTTPS deployments and configure `AUTH_COOKIE_SAME_SITE` for your frontend/API
deployment topology. Authentication endpoints have per-instance rate limits;
use a shared rate-limit store at the edge as an additional production control
when the API runs on multiple serverless instances.
Set `TRUST_PROXY=1` when Express runs directly behind one trusted reverse proxy
so authentication rate limits use the originating client IP.

## Architecture

The database relationships and role model are documented in `docs/erd.md`.

Requests flow through these layers:

1. `routes/` defines paths, methods, middleware, and controllers.
2. `middleware/` handles authentication, validation, and errors.
3. `controllers/` translates HTTP requests and responses.
4. `services/` contains business rules and does not access `req` or `res`.
5. `repositories/` is the only application layer that queries Supabase tables.
6. `mappers/` translates between database rows and API models.

Health and notification endpoints use controllers directly because they do not
need database repositories or business services.
