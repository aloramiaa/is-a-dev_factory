import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";

// Define the interface for GitHub Pull Request
interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  html_url: string;
  [key: string]: any; // For any other properties
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      console.error("[API] user-prs: User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = session.accessToken;
    
    if (!accessToken) {
      console.error("[API] user-prs: GitHub access token not available");
      return NextResponse.json({ error: "GitHub token not available" }, { status: 401 });
    }

    // Get the GitHub username from the session
    const displayName = session.user.name || "";
    
    // Try to get username from session first, then fall back to alternatives
    let githubUsername = session.user.githubUsername;
    
    // If githubUsername is missing, attempt to fetch the user's GitHub profile
    if (!githubUsername) {
      console.log("[API] user-prs: GitHub username not found in session, attempting to fetch user profile");
      
      try {
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          githubUsername = userData.login;
          console.log(`[API] user-prs: Retrieved GitHub username from profile: ${githubUsername}`);
        } else {
          console.error(`[API] user-prs: Failed to fetch GitHub user profile - Status: ${userResponse.status}`);
        }
      } catch (profileError) {
        console.error("[API] user-prs: Error fetching GitHub profile:", profileError);
      }
    }
    
    // If we still don't have a GitHub username, try to normalize display name as fallback
    if (!githubUsername && displayName) {
      // Convert display name to lowercase and remove special characters
      githubUsername = displayName.toLowerCase().replace(/[^a-z0-9-]/g, '');
      console.log(`[API] user-prs: Using normalized display name as fallback: ${githubUsername}`);
    }
    
    console.log(`[API] user-prs: Display name: "${displayName}", GitHub username: "${githubUsername}"`);
    
    if (!githubUsername) {
      console.error("[API] user-prs: Could not determine GitHub username");
      return NextResponse.json({ 
        error: "GitHub username not found",
        requireReauth: true,
        message: "Please sign out and sign in again to update your session with your GitHub username."
      }, { status: 400 });
    }

    // Fetch all PRs from the repository using REST API
    const repoOwner = process.env.GITHUB_REPO_OWNER || "is-a-dev";
    const repoName = process.env.GITHUB_REPO_NAME || "register";
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=all&per_page=100`;
    console.log(`[API] user-prs: Fetching all PRs from repository: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[API] user-prs: GitHub API error:", errorData);
        
        // Handle rate limiting specifically
        if (response.status === 403 && errorData.message && errorData.message.includes("rate limit")) {
          return NextResponse.json(
            { error: "GitHub API rate limit exceeded. Please try again later." },
            { status: 429 }
          );
        }
        
        return NextResponse.json(
          { error: "Failed to fetch pull requests", details: errorData },
          { status: response.status }
        );
      }
  
      const allPrs = await response.json() as PullRequest[];
      console.log(`[API] user-prs: Fetched ${allPrs.length} total PRs from repository`);
      
      // Log first 5 PR authors to debug
      console.log("[API] user-prs: Sample of PR authors:");
      allPrs.slice(0, 5).forEach(pr => {
        console.log(`[API] user-prs: PR #${pr.number} by: ${pr.user.login}`);
      });
  
      // Filter PRs by the current user's GitHub username
      // Try both exact match and case-insensitive match to be safe
      const userPrs = allPrs.filter(pr => {
        const prAuthor = pr.user.login.toLowerCase();
        const currentUser = githubUsername.toLowerCase();
        return prAuthor === currentUser;
      });
      
      console.log(`[API] user-prs: Found ${userPrs.length} PRs created by ${githubUsername}`);
      if (userPrs.length > 0) {
        console.log("[API] user-prs: PR details:");
        userPrs.forEach(pr => {
          console.log(`[API] user-prs: #${pr.number}: ${pr.title} by ${pr.user.login} (${pr.state})`);
        });
      }
      
      // Sort PRs by creation date, newest first
      userPrs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return NextResponse.json(userPrs);
    } catch (fetchError) {
      console.error("[API] user-prs: Error fetching from GitHub API:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to GitHub API. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API] user-prs: Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching pull requests" },
      { status: 500 }
    );
  }
} 