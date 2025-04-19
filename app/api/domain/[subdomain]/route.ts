import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";

// Raw JSON URL containing all registered domains
const RAW_DOMAINS_URL = "https://raw.is-a.dev/";

// Clean up username for comparison
function normalizeUsername(username: string): string {
  if (!username) return '';
  // Remove URL encoding, spaces, and make lowercase for comparison
  return decodeURIComponent(username)
    .replace(/\s+/g, '')
    .toLowerCase();
}

// Extract GitHub username from various formats
function extractGitHubUsername(username: string): string {
  // GitHub usernames only allow alphanumeric characters and hyphens
  // They cannot have consecutive hyphens, and cannot begin/end with a hyphen
  if (!username) return '';
  
  // If username is a URL, extract the last part
  if (username.includes('github.com/')) {
    const parts = username.split('github.com/');
    username = parts[parts.length - 1];
  }
  
  // Remove any trailing slashes
  username = username.replace(/\/+$/, '');
  
  // If username has spaces, it's probably a display name, not a GitHub username
  if (username.includes(' ')) {
    // Try to extract just the username part without spaces
    return username.replace(/\s+/g, '');
  }
  
  return username;
}

export async function GET(
  request: Request,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;
    
    if (!subdomain) {
      return NextResponse.json(
        { error: "Subdomain parameter is required" },
        { status: 400 }
      );
    }
    
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get and normalize the username
    const rawUsername = session.user.name;
    const username = normalizeUsername(rawUsername);
    const gitHubUsername = extractGitHubUsername(rawUsername);
    
    // Fetch all domains
    const response = await fetch(RAW_DOMAINS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch domains: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON data
    const data = await response.json();
    
    // Find the specific domain
    const domainEntry = data.find((item: any) => 
      item.subdomain === subdomain || item.domain === subdomain
    );
    
    if (!domainEntry) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }
    
    // Check if the user owns this domain
    if (domainEntry.owner) {
      const ownerUsername = normalizeUsername(domainEntry.owner.username || '');
      const ownerGithub = normalizeUsername(domainEntry.owner.github || '');
      const extractedUsername = normalizeUsername(gitHubUsername);
      
      const isOwner = [
        ownerUsername === username,
        ownerGithub === username,
        ownerUsername === extractedUsername,
        ownerGithub === extractedUsername,
        (username === 'aloramia' || username === 'aloramiaa') && 
          (ownerUsername === 'aloramia' || ownerUsername === 'aloramiaa'),
      ].some(Boolean);
      
      if (!isOwner) {
        return NextResponse.json(
          { error: "You do not have permission to access this domain" },
          { status: 403 }
        );
      }
    }
    
    // Return the domain data
    return NextResponse.json({
      name: domainEntry.subdomain,
      domain: domainEntry.domain,
      description: domainEntry.description || domainEntry.domain,
      record: domainEntry.record,
      owner: domainEntry.owner,
      data: domainEntry
    });
    
  } catch (error) {
    console.error("Error fetching domain:", error);
    return NextResponse.json(
      { error: "Failed to fetch domain data" },
      { status: 500 }
    );
  }
} 