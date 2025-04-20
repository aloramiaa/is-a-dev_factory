# 🏭 is-a.dev Factory

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![GitHub OAuth](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A modern, elegant web application for registering and managing free `.is-a.dev` domains. Simplify the process of claiming your developer subdomain with our streamlined interface.

![is-a.dev Factory Screenshot](https://cdn.discordapp.com/attachments/1360496758760804566/1362802946701656405/image.png?ex=6803b8a6&is=68026726&hm=081b4675be7d2d877f1e4907d7057fa15f57b64d1a65b43d2a5694ef4f477479&)

## 🌐 Live Demo

<div align="center">
  <a href="https://is-a-dev-factory.onrender.com/" target="_blank">
    <img src="https://img.shields.io/badge/LIVE_DEMO-%E2%86%92-blueviolet?style=for-the-badge&logo=render&logoColor=white" alt="Live Demo" />
  </a>
</div>

<p align="center">
  Try it now: <a href="https://is-a-dev-factory.onrender.com/" target="_blank">https://is-a-dev-factory.onrender.com/</a>
</p>

> **Note:** This project is deployed on Render due to Vercel's serverless function 10-second timeout limitation. The GitHub API operations required for domain registration may exceed this limit.

## ✨ Features

- **GitHub OAuth Integration** - Secure authentication using your GitHub account
- **Real-time Domain Availability** - Instantly check if your desired subdomain is available
- **Flexible DNS Configuration** - Set up various record types:
  - A records (IPv4 addresses)
  - AAAA records (IPv6 addresses)
  - CNAME records (canonical names)
  - MX records (mail servers)
  - TXT records (text information)
- **Advanced Redirect Options** - Configure:
  - Simple redirects to any URL
  - Path-specific redirects
  - Custom redirect rules
- **Automated Pull Request Creation** - Submit your domain registration directly to the is-a.dev registry
- **Domain Management** - View and manage your existing domains
- **Mobile-Friendly Interface** - Responsive design that works on all devices
- **Cyberpunk UI/UX** - Sleek, modern design with neon glow effects and glitch animations

### Showcase Your Website Automatically

- **Automatic Screenshot Embedding** - Website screenshots are automatically included in your PR for non-email domains
- **Privacy-First Approach** - Screenshots are stored in your own GitHub repository, not in the main is-a.dev registry
- **Review-Friendly** - Makes the PR review process smoother by providing visual context
- **Email-Domain Exception** - Email-only domains (MX records only) are automatically exempted from the screenshot requirement
- **Custom Repository Storage** - Images are stored in a dedicated `domain-screenshots` repository in your GitHub account

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- GitHub account
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/aloramiaa/is-a-dev_factory.git
   cd is-a-dev_factory
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up GitHub OAuth**
   - Create a GitHub OAuth app at https://github.com/settings/developers
   - Set the Homepage URL to `http://localhost:3000`
   - Set the Authorization callback URL to `http://localhost:3000/api/auth/callback/github`
   - Copy the Client ID and Client Secret

4. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local` (or create a new `.env.local` file)
   - Fill in the required values:
   ```env
   # GitHub OAuth
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   
   # NextAuth
   NEXTAUTH_SECRET=random_secret_string
   NEXTAUTH_URL=http://localhost:3000
   
   # GitHub Repository Settings
   GITHUB_REPO_OWNER=is-a-dev
   GITHUB_REPO_NAME=register
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

6. **Open your browser**
   Navigate to http://localhost:3000

## 🌐 Production Deployment

### One-Click Deployment

<div align="center">
  <a href="https://render.com/deploy?repo=https://github.com/aloramiaa/is-a-dev_factory" target="_blank">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
  </a>
</div>

> This will automatically configure the necessary environment variables, except for GitHub OAuth credentials which you'll need to add manually.

### Environment Configuration

Configure production environment variables in your hosting platform:

```env
# GitHub OAuth
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_client_secret

# NextAuth
NEXTAUTH_SECRET=your_production_secret
NEXTAUTH_URL=https://your-production-domain.com

# GitHub Repository Settings
GITHUB_REPO_OWNER=is-a-dev
GITHUB_REPO_NAME=register

# GitHub API Token for direct access (optional, but recommended)
GITHUB_API_TOKEN=your_github_personal_access_token
```

> **Note:** Generate a GitHub Personal Access Token with `repo` scope for production API access.

### Deployment Steps

#### Option 1: Vercel (Recommended)

1. Fork the repository to your GitHub account
2. Create a new project in Vercel and link it to your forked repository
3. Configure the environment variables in the Vercel dashboard
4. Deploy the project

#### Option 2: Manual Deployment

1. **Build the application**
   ```bash
   pnpm build
   # or
   npm run build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   # or
   npm start
   ```

### Supported Deployment Platforms

The app can be deployed to:
- [Render](https://render.com) (recommended)
- [Railway](https://railway.app)
- Any platform supporting Next.js applications with sufficient serverless function timeout limits

> **Important:** Vercel and similar platforms with strict serverless function timeout limits (< 10 seconds) are not recommended as the GitHub API operations may exceed these limits.

### Render Deployment Considerations

When deploying to Render:

1. Free tier Render services become inactive after periods of inactivity
2. To prevent this, set up a Cron Job to ping your site every 10 minutes
3. You can use services like [Cron-Job.org](https://cron-job.org/), [UptimeRobot](https://uptimerobot.com/), or [GitHub Actions](https://github.com/features/actions)

Example GitHub Actions workflow to ping your site (create `.github/workflows/ping.yml`):
```yaml
name: Ping Website

on:
  schedule:
    - cron: '*/10 * * * *'  # Run every 10 minutes

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping website to prevent inactivity
        run: curl -s https://your-render-app-url.onrender.com > /dev/null
```

### Deployment Files

This repository includes files to facilitate deployment:

- **render.yaml** - Configuration for Render deployment with environment variables
- **app/api/health/route.ts** - Health check endpoint for Render's service monitoring

## 🧰 Technology Stack

- **Frontend**
  - [Next.js 15+](https://nextjs.org/) - React framework with App Router
  - [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
  - [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
  - [shadcn/ui](https://ui.shadcn.com/) - Re-usable UI components
  - [Framer Motion](https://www.framer.com/motion/) - Animation library

- **Authentication**
  - [NextAuth.js](https://next-auth.js.org/) - Authentication for Next.js
  - [GitHub OAuth](https://docs.github.com/en/developers/apps/building-oauth-apps) - OAuth provider

- **API Integration**
  - [Octokit](https://github.com/octokit/rest.js) - GitHub API client
  - [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) - Next.js server actions for API calls

- **UI/UX Components**
  - [Radix UI](https://www.radix-ui.com/) - Headless UI primitives
  - [Lucide React](https://lucide.dev/) - Icon library
  - [react-hook-form](https://react-hook-form.com/) - Form validation
  - [Zod](https://zod.dev/) - Schema validation

## 📂 Project Structure

```
is-a-dev_factory/
├── app/                  # Next.js App Router
│   ├── actions/          # Server actions for GitHub operations
│   ├── api/              # API routes
│   ├── components/       # App-specific UI components
│   ├── dashboard/        # Dashboard page for managing domains
│   ├── login/            # Login page
│   ├── docs/             # Documentation pages
│   ├── domains/          # Domain management pages
│   ├── page.tsx          # Home page
│   └── layout.tsx        # Root layout
├── components/           # Shared UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── public/               # Static assets
├── styles/               # Global styles
├── types/                # TypeScript type definitions
├── utils/                # Helper functions
└── middleware.ts         # NextAuth middleware
```

## 🔧 Configuration Files

- **next.config.mjs** - Next.js configuration
- **tailwind.config.ts** - Tailwind CSS configuration
- **components.json** - shadcn/ui configuration
- **tsconfig.json** - TypeScript configuration
- **.env.local** - Local environment variables
- **.env.production** - Production environment variables

## 📝 Domain Registration Process

1. **Authentication** - Sign in with your GitHub account
2. **Subdomain Selection** - Choose your desired `yourname.is-a.dev` subdomain
3. **Record Configuration** - Set up DNS records or redirect options
4. **Website Screenshot** - Automatically captures a screenshot of your website (for non-email domains)
5. **Pull Request Creation** - Submits a PR to the official is-a.dev registry
6. **Review Process** - Wait for the maintainers to review and merge your PR
7. **Domain Activation** - Once merged, your domain will be active within 24 hours

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Related Resources

- [is-a.dev Registry](https://github.com/is-a-dev/register) - The official registry repository
- [is-a.dev Documentation](https://is-a.dev/docs) - Official documentation for the is-a.dev service

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the developer community
</p> 