import type { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email public_repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
      }
      
      // Store GitHub username (login) from various possible sources
      if (profile) {
        // First priority: profile from OAuth provider
        token.githubUsername = profile.login
        console.log(`JWT callback: Setting GitHub username from profile: ${profile.login}`)
      } else if (user && (user as any).login) {
        // Second priority: user object (might have login property on certain providers)
        token.githubUsername = (user as any).login
        console.log(`JWT callback: Setting GitHub username from user.login: ${(user as any).login}`)
      } else if (token.name) {
        // Last resort fallback: try to use sanitized name
        // This is less reliable but better than nothing
        const sanitizedName = token.name.toString().toLowerCase().replace(/[^a-z0-9-]/g, '')
        token.githubUsername = sanitizedName
        console.log(`JWT callback: Setting GitHub username from sanitized name: ${sanitizedName}`)
      }
      
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider
      session.accessToken = token.accessToken
      
      // Add GitHub username (login) to the session
      if (token.githubUsername && session.user) {
        session.user.githubUsername = token.githubUsername as string
        console.log(`Session callback: Added GitHub username to session: ${session.user.githubUsername}`)
      } else {
        console.warn(`Session callback: GitHub username missing from token`)
      }
      
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  debug: process.env.NODE_ENV === "development",
}
