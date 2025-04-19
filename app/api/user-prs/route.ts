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
      console.error("User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = session.accessToken;
    
    if (!accessToken) {
      console.error("GitHub access token not available");
      return NextResponse.json({ error: "GitHub token not available" }, { status: 401 });
    }

    // Get the GitHub username from the session
    const displayName = session.user.name;
    const githubUsername = session.user.githubUsername;
    
    console.log(`Display name: "${displayName}", GitHub username: "${githubUsername}"`);
    
    if (!githubUsername) {
      console.error("GitHub username not found in session");
      return NextResponse.json({ 
        error: "GitHub username not found",
        requireReauth: true,
        message: "Please sign out and sign in again to update your session with your GitHub username."
      }, { status: 400 });
    }

    // 1. Fetch all PRs from the repository using REST API
    const apiUrl = `https://api.github.com/repos/is-a-dev/register/pulls?state=all&per_page=100`;
    console.log(`Fetching all PRs from repository: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GitHub API error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch pull requests", details: errorData },
        { status: response.status }
      );
    }

    const allPrs = await response.json() as PullRequest[];
    console.log(`Fetched ${allPrs.length} total PRs from repository`);
    
    // Log first 5 PR authors to debug
    console.log("Sample of PR authors:");
    allPrs.slice(0, 5).forEach(pr => {
      console.log(`PR #${pr.number} by: ${pr.user.login}`);
    });

    // 2. Filter PRs by the current user's GitHub username
    // Note: GitHub usernames are case-insensitive
    const userPrs = allPrs.filter(pr => 
      pr.user.login.toLowerCase() === githubUsername.toLowerCase()
    );
    
    console.log(`Found ${userPrs.length} PRs created by ${githubUsername}`);
    if (userPrs.length > 0) {
      console.log("PR details:");
      userPrs.forEach(pr => {
        console.log(`#${pr.number}: ${pr.title} by ${pr.user.login} (${pr.state})`);
      });
    }
    
    return NextResponse.json(userPrs);
  } catch (error) {
    console.error("Error fetching user PRs:", error);
    return NextResponse.json(
      { error: "Failed to fetch pull requests" },
      { status: 500 }
    );
  }
} 