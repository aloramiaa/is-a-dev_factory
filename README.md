# 🏭 is-a.dev Factory

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/GitHub_OAuth-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub OAuth" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT" />
</p>

> **The ultimate tool for managing your free `.is-a.dev` subdomain — powered by GitHub, styled with cyberpunk elegance.**

![is-a.dev Factory Screenshot](https://cdn.discordapp.com/attachments/1360496758760804566/1362802946701656405/image.png)

---

## 🌐 Live Demo

<p align="center">
  <a href="https://is-a-dev-factory.onrender.com/" target="_blank">
    <img src="https://img.shields.io/badge/LIVE_DEMO-%E2%86%92-blueviolet?style=for-the-badge&logo=render&logoColor=white" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <a href="https://is-a-dev-factory.onrender.com/" target="_blank">https://is-a-dev-factory.onrender.com/</a>
</p>

> ⚠️ **Note:** Hosted on Render due to Vercel's 10-second serverless timeout. GitHub PR generation may exceed this limit.

---

## ✨ Features

- 🔒 **GitHub OAuth Authentication**
- 🚀 **Real-time Subdomain Availability**
- ⚙️ **Flexible DNS Record Setup** — Supports A, AAAA, CNAME, MX, TXT
- ↪️ **Advanced Redirect Rules**
- 🤖 **Automated PR Creation** — Submits directly to the [is-a.dev registry](https://github.com/is-a-dev/register)
- 🖥️ **Live Screenshot Embedding** — Stored in your own GitHub repo!
- 📱 **Mobile-First Design** — Works beautifully on all devices
- 🧬 **Cyberpunk UI/UX** — Neon glow, glitch animations, and modern elegance

---

## 🧪 Tech Stack

| Layer        | Tools |
|--------------|-------|
| **Frontend** | Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| **UI**       | Radix UI, Lucide Icons, react-hook-form, Zod |
| **Auth**     | NextAuth.js, GitHub OAuth |
| **API**      | Octokit (GitHub REST), Server Actions |

---

## 🧰 Quick Start

### 🔧 Requirements

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- GitHub account

### ⚙️ Setup Instructions

```bash
git clone https://github.com/aloramiaa/is-a-dev_factory.git
cd is-a-dev_factory
pnpm install
```

1. **Create GitHub OAuth App**  
   Go to [Developer Settings](https://github.com/settings/developers) → OAuth Apps  
   - Homepage URL: `http://localhost:3000`  
   - Callback URL: `http://localhost:3000/api/auth/callback/github`

2. **Configure environment**
   ```bash
   cp .env.local.example .env.local
   ```

   Fill `.env.local`:
   ```env
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   NEXTAUTH_SECRET=your_random_secret
   NEXTAUTH_URL=http://localhost:3000

   GITHUB_REPO_OWNER=is-a-dev
   GITHUB_REPO_NAME=register
   ```

3. **Run dev server**
   ```bash
   pnpm dev
   ```

Open browser at [localhost:3000](http://localhost:3000)

---

## 🚀 Deploy to Production

### 🔘 One-Click Render Deploy

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/aloramiaa/is-a-dev_factory" target="_blank">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
  </a>
</p>

> GitHub OAuth credentials must be set manually.

### 🧾 Production `.env` Example

```env
GITHUB_CLIENT_ID=your_prod_id
GITHUB_CLIENT_SECRET=your_prod_secret
NEXTAUTH_SECRET=secure_random_string
NEXTAUTH_URL=https://your-domain.com

GITHUB_REPO_OWNER=is-a-dev
GITHUB_REPO_NAME=register
GITHUB_API_TOKEN=your_github_pat
```

> 🔑 Token should include `repo` scope.

---

## 📅 Prevent Render From Sleeping

To keep your app awake:

```yaml
# .github/workflows/ping.yml
name: Keep Alive

on:
  schedule:
    - cron: '*/10 * * * *'

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Render App
        run: curl -s https://your-app.onrender.com || true
```

---

## 📁 Project Structure

```
is-a-dev_factory/
├── app/                  # App Router structure
│   ├── actions/          # GitHub server actions
│   ├── api/              # API routes
│   ├── dashboard/        # Domain manager UI
│   ├── docs/             # Internal documentation
│   └── layout.tsx        # App layout
├── components/           # Reusable components
├── lib/                  # Utilities & Octokit
├── types/                # Type definitions
├── public/               # Static assets
├── hooks/                # Custom hooks
└── middleware.ts         # NextAuth Middleware
```

---

## 📝 Domain Registration Flow

1. Sign in via GitHub
2. Search and select your subdomain
3. Set up records (DNS or redirects)
4. Screenshot is captured (if applicable)
5. PR is created on your behalf
6. Await review & merge
7. 🎉 Your domain goes live!

---

## 🔐 Security

- OAuth login ensures verified GitHub users
- Screenshot images are stored in **your own GitHub repo**
- No third-party tracking or cookies

---

## 🤝 Contributing

Pull requests are welcome!  
Here's how to get started:

```bash
git checkout -b feature/your-feature
# make your changes
git commit -m "✨ Added your-feature"
git push origin feature/your-feature
```

Then open a PR 🚀

---

## 📚 Resources

- 🔗 [is-a.dev Registry](https://github.com/is-a-dev/register)
- 📖 [is-a.dev Documentation](https://is-a.dev/docs)

---

## ⚖️ License

This project is licensed under the [MIT License](LICENSE)

---

<p align="center">
  Made with ❤️ for developers, by developers.
</p>
