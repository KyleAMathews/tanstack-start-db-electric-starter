# TanStack Start + DB + Electric Starter

## Build/Test Commands

- `pnpm run dev` - Start development server with Docker services
- `pnpm run build` - Build for production
- `pnpm run test` - Run all Vitest tests
- `vitest run <test-file>` - Run single test file
- `pnpm run start` - Start production server

## Architecture

- **Frontend**: TanStack Start (React SSR framework) with file-based routing in `src/routes/`
- **Database**: PostgreSQL with Drizzle ORM, schema in `src/db/schema.ts`
- **Electric**: Real-time sync service on port 3000
- **Services**: Docker Compose setup (Postgres on 54321, Electric on 3000)
- **Styling**: Tailwind CSS v4

## Code Style

- **TypeScript**: Strict mode, ES2022 target, bundler module resolution
- **Imports**: Use `@/*` path aliases for `src/` directory imports
- **Components**: React 19 with JSX transform, functional components preferred
- **DB**: Drizzle ORM with PostgreSQL dialect, schema-first approach
- **Routing**: File-based with TanStack Router, use `Link` component for navigation
- **Testing**: Vitest with @testing-library/react for component tests
