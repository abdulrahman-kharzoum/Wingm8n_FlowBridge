# Wingm8n_FlowBridge - Project TODO

## Phase 1: Foundation & Authentication
- [x] Project initialization with web-db-user scaffold
- [x] Design tokens and brand identity setup
- [x] GitHub OAuth integration with secure session management
- [x] Stunning login screen with glassmorphism design
- [x] Session persistence and logout functionality
- [x] Protected routes and authentication guards

## Phase 2: GitHub Integration
- [ ] GitHub API integration service
- [ ] Repository fetching and branch detection
- [ ] Staging and main branch comparison
- [ ] Real-time branch sync capabilities
- [ ] Webhook support for branch updates (optional)

## Phase 3: N8N Workflow Analysis
- [ ] Workflow JSON parser service
- [ ] Credential extraction and deduplication
- [ ] Credential comparison between branches
- [ ] Unique credential highlighting (staging-only)
- [ ] Credential filtering and search

## Phase 4: Domain & URL Detection
- [ ] URL extraction service from workflow nodes
- [ ] HTTP/HTTPS endpoint detection
- [ ] Webhook URL detection
- [ ] Domain comparison and diff viewer
- [ ] Side-by-side URL comparison UI
- [ ] Batch URL selection for merge

## Phase 5: Workflow Call Chain Analysis
- [ ] Workflow call chain parser
- [ ] "Execute Workflow" node detection
- [ ] Call chain visualization (graph/flow diagram)
- [ ] Staging vs main call structure comparison
- [ ] Circular dependency detection
- [ ] Workflow naming convention handling (staging- prefix)

## Phase 6: Dashboard & Core UI
- [x] Dashboard layout with sidebar navigation
- [x] Branch selector component
- [x] Sync status indicator
- [x] Credentials panel (placeholder)
- [x] Domains panel (placeholder)
- [x] Workflow call chain panel (placeholder)
- [x] Responsive design for mobile/tablet

## Phase 7: Merge & Conflict Resolution
- [ ] Interactive diff viewer
- [ ] Granular merge value selection
- [ ] Conflict resolver component
- [ ] Merge preview panel
- [ ] Merge branch creation workflow
- [ ] Pull request generation

## Phase 8: Advanced Features
- [ ] Batch operations for multiple workflows
- [ ] Merge history and audit trail
- [ ] Undo/rollback capabilities
- [ ] Export merge decisions as JSON
- [ ] Notification system for merge status
- [ ] Performance optimization for large workflows

## Phase 9: Testing & Documentation
- [ ] Unit tests for core services
- [ ] Integration tests for GitHub API
- [ ] E2E tests for merge workflow
- [ ] API documentation
- [ ] User guide and setup instructions
- [ ] Deployment documentation

## Design & UX
- [x] Brand identity defined (colors, typography, spacing)
- [ ] Component library setup (shadcn/ui)
- [ ] Dark mode theme implementation
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Micro-interactions and animations
- [ ] Loading states and skeleton screens
- [ ] Error handling and user feedback

## Infrastructure
- [ ] GitHub secrets configuration
- [ ] Environment variables setup
- [ ] Database schema for storing merge history
- [ ] S3 storage for workflow backups (optional)
- [ ] CI/CD pipeline setup
- [ ] Production deployment configuration

## Phase 2.5: GitHub Repository Selection
- [x] GitHub API service for fetching user repositories
- [x] Repository selection page with filtering and search
- [x] Support for public and private repositories
- [x] Repository context and state management
- [ ] Branch detection (staging/main)
- [ ] Workflow file discovery in branches
- [ ] Repository persistence in session/database
