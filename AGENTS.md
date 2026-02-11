# Wingm8n_FlowBridge - AI Agent Documentation

## Project Overview

**Wingm8n_FlowBridge** is a specialized tool designed for teams using **n8n** for automation and **GitHub** for version control. It provides a visual, intelligent bridge for merging n8n workflows from staging branches (prefixed with `staging-`) to production (main) branches.

The application solves the "Staging to Production" headache by:
- Automating detection of differences in **credentials**, **URLs**, and **workflow call chains**
- Providing side-by-side visual comparison
- Enabling intelligent merge decisions
- Automatically creating merge branches and pull requests

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7 |
| **UI Framework** | Tailwind CSS 4, shadcn/ui (New York style), Radix UI |
| **State Management** | TanStack Query (React Query), tRPC React Query |
| **Routing** | wouter (lightweight React router) |
| **Backend** | Express.js, tRPC 11 |
| **Database** | SQLite with Drizzle ORM |
| **Authentication** | GitHub OAuth 2.0, JWT (jose library) |
| **Build Tools** | Vite (frontend), esbuild (backend) |
| **Package Manager** | pnpm 10.4.1 |

## Project Structure

```
Wingm8n_FlowBridge/
├── client/                     # Frontend React application
│   ├── src/
│   │   ├── _core/             # Core client utilities
│   │   │   └── hooks/         # Custom React hooks (useAuth, etc.)
│   │   ├── components/        # React components
│   │   │   └── ui/            # shadcn/ui components (50+ components)
│   │   ├── contexts/          # React contexts (Theme, Repository)
│   │   ├── hooks/             # Additional custom hooks
│   │   ├── lib/               # Utility libraries
│   │   │   ├── trpc.ts        # tRPC client setup
│   │   │   └── utils.ts       # Utility functions
│   │   ├── pages/             # Page components
│   │   ├── const.ts           # Client constants
│   │   ├── App.tsx            # Main app component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   └── index.html             # HTML template
├── server/                     # Backend Express application
│   ├── _core/                 # Core server modules
│   │   ├── context.ts         # tRPC context creation
│   │   ├── cookies.ts         # Cookie handling
│   │   ├── env.ts             # Environment variables
│   │   ├── index.ts           # Server entry point
│   │   ├── oauth.ts           # OAuth callback routes
│   │   ├── sdk.ts             # Authentication SDK
│   │   ├── trpc.ts            # tRPC router setup
│   │   ├── types/             # Type definitions
│   │   └── vite.ts            # Vite dev server integration
│   ├── routers/               # tRPC routers
│   │   ├── github.ts          # GitHub API endpoints
│   │   ├── merge.ts           # Merge operations
│   │   ├── n8n.ts             # N8N integration
│   │   ├── pr-comparison.ts   # PR comparison
│   │   └── workflow.ts        # Workflow operations
│   ├── services/              # Business logic services
│   │   ├── github.service.ts  # GitHub API wrapper
│   │   ├── merge.service.ts   # Merge logic
│   │   ├── n8n.service.ts     # N8N operations
│   │   ├── pr-analyzer.service.ts  # PR analysis
│   │   └── workflow-analyzer.service.ts  # Workflow analysis
│   ├── db.ts                  # Database operations
│   ├── routers.ts             # Main tRPC router
│   └── storage.ts             # File storage utilities
├── shared/                     # Shared code between client and server
│   ├── _core/
│   │   └── errors.ts          # Shared error definitions
│   ├── types/
│   │   └── workflow.types.ts  # Workflow type definitions
│   ├── utils/
│   │   └── workflow-parser.ts # Workflow parsing utilities
│   ├── const.ts               # Shared constants
│   └── types.ts               # Type exports
├── drizzle/                    # Database schema and migrations
│   ├── schema.ts              # Drizzle schema definition
│   ├── relations.ts           # Table relations
│   ├── migrations/            # Migration files
│   └── meta/                  # Migration metadata
├── workflows/                  # Sample N8N workflow files (for testing)
├── .env                        # Environment variables (not in git)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── drizzle.config.ts          # Drizzle ORM configuration
├── vitest.config.ts           # Vitest test configuration
├── components.json            # shadcn/ui configuration
└── .prettierrc                # Prettier formatting rules
```

## Key Configuration Files

### package.json
- **Type**: ES Module (`"type": "module"`)
- **Package Manager**: pnpm (specified in `packageManager`)
- **Key Scripts**:
  - `dev`: Development server with hot reload
  - `build`: Production build (Vite + esbuild)
  - `start`: Production server
  - `check`: TypeScript type checking
  - `format`: Prettier formatting
  - `test`: Vitest test runner
  - `db:push`: Generate and run database migrations

### vite.config.ts
- Frontend root: `client/`
- Public directory: `client/public`
- Build output: `dist/public`
- Plugins: React, Tailwind CSS, JSX Location, Manus Runtime
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`

### tsconfig.json
- Module: ESNext
- Strict mode enabled
- Path mapping: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
- Includes: `client/src/**/*`, `shared/**/*`, `server/**/*`

### drizzle.config.ts
- Dialect: SQLite
- Schema: `./drizzle/schema.ts`
- Database file: `sqlite.db`

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (runs on port 3000 by default)
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm start

# Type check without emitting
pnpm run check

# Format code with Prettier
pnpm run format

# Run tests
pnpm test

# Database migrations
pnpm run db:push
```

## Environment Variables

Required environment variables in `.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=file:sqlite.db

# Application
VITE_APP_ID=wingm8n-flowbridge
JWT_SECRET=your_jwt_secret_here

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
VITE_GITHUB_CLIENT_ID=your_github_client_id  # Exposed to client

# N8N Integration (Optional)
N8N_CREATE_WORKFLOW_WEBHOOK_URL=https://your-n8n-instance.com/webhook/create_workflow
```

## Code Style Guidelines

### Prettier Configuration (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": false
}
```

### TypeScript Conventions
- Use strict TypeScript mode
- Prefer explicit return types for public functions
- Use path aliases (`@/` for client, `@shared/` for shared)
- Comment exports with JSDoc for complex types

### Naming Conventions
- **Components**: PascalCase (e.g., `DashboardLayout.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Services**: camelCase (e.g., `github.service.ts`)
- **Types/Interfaces**: PascalCase with descriptive names
- **Constants**: UPPER_SNAKE_CASE for true constants

## Testing

- **Framework**: Vitest
- **Environment**: Node.js
- **Test Location**: `server/**/*.test.ts`, `server/**/*.spec.ts`, `shared/**/*.test.ts`
- **Configuration**: `vitest.config.ts`

### Existing Tests
- `server/auth.logout.test.ts` - Authentication tests
- `server/services/github.service.test.ts` - GitHub service tests
- `server/services/pr-analyzer.service.test.ts` - PR analyzer tests
- `shared/utils/workflow-parser.test.ts` - Workflow parser tests

## Authentication Flow

1. User clicks login → Redirected to GitHub OAuth
2. GitHub redirects to `/api/oauth/callback` with code
3. Server exchanges code for GitHub access token
4. Server fetches user info from GitHub API
5. User upserted in database (SQLite)
6. JWT session token created and set as cookie
7. User redirected to home page

### Protected Routes
- Routes use `ProtectedRoute` component
- tRPC procedures use `protectedProcedure` or `adminProcedure`
- Unauthorized requests redirect to login with `UNAUTHED_ERR_MSG`

## Database Schema

### users table (drizzle/schema.ts)
```typescript
{
  id: integer().primaryKey({ autoIncrement: true }),
  openId: text().notNull().unique(),  // GitHub user ID
  name: text(),
  email: text(),
  loginMethod: text(),
  githubToken: text(),  // Encrypted GitHub access token
  role: text({ enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer({ mode: 'timestamp' }),
  updatedAt: integer({ mode: 'timestamp' }),
  lastSignedIn: integer({ mode: 'timestamp' }),
}
```

## Key Features Architecture

### 1. Credential Management
- **Extraction**: `extractCredentialsWithUsage()` scans workflow nodes for credentials
- **Comparison**: `compareCredentials()` finds differences between staging and main
- **Merge**: `applyCredentialDecisions()` replaces credential IDs globally in workflows

### 2. Domain/URL Detection
- **Extraction**: `extractDomains()` scans node parameters for URL patterns
- **Patterns**: `url`, `webhookUrl`, `path`, `endpoint`, `baseUrl`, `apiUrl`
- **Webhook Special Handling**: Webhook nodes formatted as `${METHOD} ${path} (Webhook)`

### 3. Workflow Call Chain Analysis
- **Extraction**: `extractWorkflowCalls()` finds `n8n-nodes-base.executeWorkflow` nodes
- **Graph Building**: Tracks source → target workflow relationships
- **Mapping**: Supports remapping workflow IDs during merge

### 4. Merge Service
The merge process:
1. Creates new branch from main: `merge/{staging}-to-{main}/{timestamp}-{random}`
2. Fetches workflows from both branches
3. Applies user decisions (credentials, domains, workflow calls, metadata)
4. Commits merged workflows to new branch
5. Creates pull request (optional)

## tRPC Router Structure

```
appRouter
├── system          # System status and configuration
├── github          # GitHub API operations
│   ├── listRepositories
│   ├── getBranches
│   ├── findWorkflowFiles
│   ├── getFileContent
│   └── compareBranches
├── workflow        # Workflow analysis
├── merge           # Merge operations
│   ├── createMergeBranch
│   ├── createPullRequest
│   ├── getMergeBranchStatus
│   └── deleteMergeBranch
├── prComparison    # PR comparison operations
├── n8n             # N8N-specific operations
└── auth            # Authentication
    ├── me          # Get current user
    └── logout      # Logout user
```

## Security Considerations

1. **Authentication**:
   - JWT session tokens with 1-year expiry
   - HttpOnly, Secure, SameSite=strict cookies in production
   - CSRF protection via SameSite cookies

2. **GitHub Token Storage**:
   - Tokens stored encrypted in SQLite database
   - Never exposed to client-side

3. **API Security**:
   - All API routes require authentication (except OAuth callback)
   - Admin-only routes use `adminProcedure`
   - Input validation with Zod schemas

4. **Sensitive Data**:
   - Hardcoded secrets detection in workflows
   - `.env` file excluded from git
   - No logging of tokens or credentials

## Development Workflow

1. **Setup**: Clone repo, `pnpm install`, create `.env`
2. **Database**: `pnpm run db:push` to set up SQLite schema
3. **Development**: `pnpm run dev` for hot-reload dev server
4. **Testing**: `pnpm test` to run Vitest
5. **Formatting**: `pnpm run format` before committing
6. **Type Check**: `pnpm run check` to verify TypeScript

## Common Development Tasks

### Adding a New tRPC Endpoint
1. Add procedure to appropriate router in `server/routers/`
2. Use `protectedProcedure` for authenticated routes
3. Define Zod input schema
4. Implement handler function
5. Access via `trpc.{router}.{procedure}.useQuery()` or `.useMutation()` in client

### Adding a New UI Component
1. Use shadcn/ui CLI or manually create in `client/src/components/ui/`
2. Follow existing component patterns with `class-variance-authority`
3. Export from component file
4. Import with `@/components/ui/{component}` path

### Database Schema Changes
1. Modify `drizzle/schema.ts`
2. Run `pnpm run db:push` to generate and apply migration
3. Update related types in `shared/types/`

## External Integrations

### GitHub API
- Uses `@octokit/rest` for GitHub API v3
- Required scopes: `repo`, `user`, `workflow`
- Rate limits apply (5000 requests/hour for authenticated users)

### N8N Webhook (Optional)
- `N8N_CREATE_WORKFLOW_WEBHOOK_URL` for creating workflows in N8N
- POST request with workflow JSON payload
- Returns created workflow ID for mapping

## Deployment Notes

- **Production Build**: Runs `vite build` + esbuild for server
- **Static Files**: Served from `dist/public` in production
- **Database**: SQLite file (`sqlite.db`) persists data
- **Environment**: Requires all environment variables in `.env`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check `DATABASE_URL` in `.env`
   - Ensure `sqlite.db` file is writable

2. **GitHub OAuth Failures**:
   - Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
   - Ensure callback URL matches GitHub app settings

3. **Build Failures**:
   - Run `pnpm run check` for TypeScript errors
   - Clear `dist/` and `node_modules/.vite` if caching issues

4. **Missing Dependencies**:
   - Use `pnpm install` (not npm/yarn)
   - Check `packageManager` field in package.json
