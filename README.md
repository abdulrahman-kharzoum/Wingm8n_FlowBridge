<div align="center">

<img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bridge%20at%20Night.png" alt="Bridge at Night" width="120" height="120" />

# 🚀 Wingm8n_FlowBridge

### **Bridge your n8n workflows from Staging to Production with Intelligence & Confidence**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/UI-shadcn/ui-black.svg)](https://ui.shadcn.com/)

[Explore the Docs](#-getting-started) · [Report Bug](https://github.com/Wingm8n/FlowBridge/issues) · [Request Feature](https://github.com/Wingm8n/FlowBridge/issues)

</div>

---

## 📖 Table of Contents

- [✨ Core Idea](#-core-idea)
- [🌟 Key Features](#-key-features)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
- [💻 Usage](#-usage)
- [🗺️ Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)

---

## ✨ Core Idea

**Wingm8n_FlowBridge** is a specialized tool designed for teams using **n8n** for automation and **GitHub** for version control. It solves the "Staging to Production" headache by providing a visual, intelligent bridge for merging workflows.

In a typical dev-ops flow, you build workflows in a `staging` branch (prefixed with `staging-`) and need to move them to `main` for production. FlowBridge automates the detection of differences in **credentials**, **URLs**, and **workflow call chains**, ensuring that environment-specific details are handled correctly during the merge.

---

## 🌟 Key Features

### 🔐 1. Intelligent Credential Mapping

- **Deduplication**: Automatically detects and groups identical credentials across workflows.
- **Environment Aware**: Highlights credentials that exist only in staging (development-only).
- **Conflict Resolution**: Choose which credential ID to keep when merging.

### 🌐 2. Smart URL & Domain Detection

- **HTTP/Webhook Scanner**: Scans all nodes for URLs, webhooks, and endpoints.
- **Side-by-Side Diff**: Compare staging URLs (e.g., `api.staging.dev`) with production URLs (e.g., `api.prod.com`).
- **Batch Selection**: Quickly toggle and select correct domains for the final merge.

### ⛓️ 3. Workflow Call-Chain Analysis

- **Visualization**: Interactive graph view of how workflows trigger one another.
- **Name Normalization**: Handles the transformation from `staging-workflow-name` to `production-workflow-name`.
- **Safety Checks**: Detects circular dependencies before they break your production environment.

### 🎨 4. High-End UI/UX

- **Modern Aesthetic**: GitHub-inspired design with dark mode support.
- **Smooth Animations**: Powered by Framer Motion for a fluid, professional feel.
- **Phase-Based Navigation**: A guided 5-step process from discovery to deployment.

---

## 🛠️ Tech Stack

| Category             | Technology                                                                                                                 |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**         | [Next.js 14](https://nextjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) |
| **UI Components**    | [shadcn/ui](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)                                       |
| **State Management** | [TanStack Query](https://tanstack.com/query/latest), [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)  |
| **Backend/API**      | [tRPC](https://trpc.io/), Node.js (Express)                                                                                |
| **Database**         | [SQLite](https://www.sqlite.org/) with [Drizzle ORM](https://orm.drizzle.team/)                                            |
| **Integrations**     | [GitHub REST & GraphQL API](https://docs.github.com/en/rest)                                                               |

---

## 🚀 Getting Started

Follow these steps to set up FlowBridge on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (Recommended) or npm
- A [GitHub Personal Access Token](https://github.com/settings/tokens) (with `repo` scope)

### Environment Variables

Create a `.env` file in the root directory and add the following:

```env
# GitHub Configuration
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_ACCESS_TOKEN=your_personal_access_token

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_string

# Database Configuration
# DATABASE_URL is used for drizzle-kit. For runtime, SQLite uses 'sqlite.db' file.
DATABASE_URL=file:sqlite.db
```

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Wingm8n/FlowBridge.git
   cd FlowBridge
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run database migrations**

   ```bash
   pnpm run db:push
   ```

4. **Start the development server**
   ```bash
   pnpm run dev
   ```

The app will be running at [http://localhost:3000](http://localhost:3000).

---

## 💻 Usage

1. **Connect**: Log in with your GitHub account.
2. **Select Repo**: Choose the repository containing your n8n workflows.
3. **Configure**: Select your `staging` and `main` branches.
4. **Analyze**: Let FlowBridge scan for credentials, URLs, and call chains.
5. **Review**: Use the interactive panels to resolve differences.
6. **Merge**: Click "Create Merge Branch" to generate a Pull Request automatically.

---

## 🗺️ Roadmap

- [x] Phase 1: Authentication & Repository Selection
- [x] Phase 2: Workflow JSON Parsing & Analysis
- [ ] Phase 3: Interactive Graph Visualization for Call Chains
- [ ] Phase 4: Automated Pull Request Generation
- [ ] Phase 5: AI-Powered Merge Recommendations

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">

Built with ❤️ by the **Wingm8n** Team

</div>
