# Deploy Cadence on Vercel

Cadence supports PostgreSQL on Vercel and SQLite for a self-hosted install.
`DATABASE_URL` selects the provider. `prisma/schema.prisma` is the source of
truth for both; `npm run db:generate` refreshes the PostgreSQL schema and
generates the matching client. The two databases have separate migrations.

## First deployment

1. Import this repository into Vercel as a Next.js project.
2. In the project's Storage tab, connect a Neon PostgreSQL database. Choose
   a database region close to the Vercel functions.
3. Set `DATABASE_URL` to the pooled PostgreSQL URL provided by Neon. Optionally
   set `DIRECT_URL` to its direct, unpooled URL for migrations. Neon's
   `DATABASE_URL_UNPOOLED` and `POSTGRES_URL_NON_POOLING` are also recognized
   automatically. Add these in
   Vercel's environment settings; never commit database credentials.
4. Deploy. `vercel.json` runs `npm run build:vercel`, which rejects SQLite,
   generates the PostgreSQL client, applies the PostgreSQL migrations, then
   builds Next.js. No local checkout or local database is needed.
5. Open the deployment and use Sign up to create your workspace.

Give production and preview deployments separate databases or Neon branches.
Each build applies migrations to the database configured for that environment;
do not connect unreviewed preview changes to the production database.

This initializes a new database. It does not import accounts or work from an
existing SQLite installation. Keep that installation and its database backup
until a separate data transfer has been completed and checked.

## Schema changes

Edit `prisma/schema.prisma`, then run `npm run db:generate` with a PostgreSQL
`DATABASE_URL`. Create and review a migration with
`node scripts/prisma.mjs migrate dev --name <change>` against a development
PostgreSQL database. Commit the generated PostgreSQL schema and migration.
If SQLite remains supported, create its corresponding migration against a
separate SQLite database as well. `npm run db:migrate` applies the correct
history for the configured URL.

## Hosting limits

The existing login/signup rate limiter is in memory and applies per running
function instance. It is not a shared limit across Vercel instances or cold
starts. Use Vercel Firewall rate limiting or a shared limiter when an
installation needs an instance-independent limit.
