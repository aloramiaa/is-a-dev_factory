# 🏭 is-a.dev Factory

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![GitHub OAuth](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A modern, elegant web application for registering and managing free `.is-a.dev` domains. Simplify the process of claiming your developer subdomain with our streamlined interface.

![is-a.dev Factory Screenshot](https://via.placeholder.com/800x400?text=is-a.dev+Factory+Screenshot)

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

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- GitHub account
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/al/is-a-dev_factory.git
   cd is-a-dev_factory
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
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
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to http://localhost:3000

## 🌐 Production Deployment

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

1. **Build the application**
   ```bash
   npm run build
   # or
   yarn build
   ```

2. **Start the production server**
   ```bash
   npm start
   # or
   yarn start
   ```

### Deployment Platforms

The app can be easily deployed to:
- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [Railway](https://railway.app)
- Any platform supporting Next.js applications

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

- **Developer Experience**
  - [ESLint](https://eslint.org/) - Code linting
  - [Prettier](https://prettier.io/) - Code formatting

## 📂 Project Structure

```
is-a-dev_factory/
├── app/                 # Next.js App Router
│   ├── actions/         # Server actions
│   ├── api/             # API routes
│   ├── components/      # UI components
│   ├── page.tsx         # Home page
│   └── ...
├── public/              # Static assets
├── types/               # TypeScript type definitions
├── styles/              # Global styles
├── next.config.js       # Next.js configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Project dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Related Resources

- [is-a.dev Registry](https://github.com/is-a-dev/register) - The official registry repository
- [is-a.dev Documentation](https://is-a.dev/docs) - Official documentation for the is-a.dev service

---

<p align="center">
  Made with ❤️ for the developer community
</p> 