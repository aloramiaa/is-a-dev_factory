import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";

// Raw JSON URL containing all registered domains
const RAW_DOMAINS_URL = "https://raw.is-a.dev/";

// Define types
interface DomainOwner {
  username?: string;
  github?: string;
  [key: string]: any;
}

interface DomainRecord {
  [key: string]: any;
}

interface DomainEntry {
  owner?: DomainOwner;
  record?: DomainRecord;
  subdomain?: string;
  domain?: string;
  description?: string;
  reserved?: boolean;
  [key: string]: any;
}

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

export async function GET() {
  try {
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
    
    console.log("Authentication info:");
    console.log("Raw username from session:", rawUsername);
    console.log("Normalized username for search:", username);
    console.log("Extracted GitHub username:", gitHubUsername);
    
    // Fetch all domains using the same approach as test.js
    console.log("Fetching all domains from raw.is-a.dev");
    const response = await fetch(RAW_DOMAINS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch domains: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON data and filter out reserved domains
    const data: DomainEntry[] = await response.json();
    console.log(`Loaded ${data.length} total domains from raw.is-a.dev`);
    
    // Filter domains by the current user with multiple username comparison strategies
    const userDomains = data
      .filter(item => !item.reserved) // Exclude reserved domains
      .filter(item => {
        if (!item.owner) return false;
        
        const ownerUsername = normalizeUsername(item.owner.username || '');
        const ownerGithub = normalizeUsername(item.owner.github || '');
        const extractedUsername = normalizeUsername(gitHubUsername);
        
        // Try several matching strategies
        const strategies = [
          // Exact match on normalized usernames
          ownerUsername === username,
          ownerGithub === username,
          
          // Match with extracted GitHub username
          ownerUsername === extractedUsername,
          ownerGithub === extractedUsername,
          
          // Special case for Alora Mia -> aloramiaa
          (username === 'aloramia' || username === 'aloramiaa') && 
            (ownerUsername === 'aloramia' || ownerUsername === 'aloramiaa'),
          
          // For debugging: partial matches
          username.length > 3 && ownerUsername.includes(username),
          username.length > 3 && ownerGithub.includes(username),
          extractedUsername.length > 3 && ownerUsername.includes(extractedUsername),
          extractedUsername.length > 3 && ownerGithub.includes(extractedUsername)
        ];
        
        // If any strategy matches, log and return true
        if (strategies.some(result => result === true)) {
          console.log("Match found for domain:", item.domain);
          console.log("Domain owner:", item.owner.username || item.owner.github);
          return true;
        }
        
        return false;
      })
      .map(item => ({
        name: item.subdomain,
        domain: item.domain,
        description: item.description || item.domain,
        record: item.record,
        data: item
      }));
    
    console.log(`Found ${userDomains.length} domains for user ${username}`);
    
    return NextResponse.json({ 
      domains: userDomains,
      debug: {
        rawUsername,
        username,
        gitHubUsername
      }
    });
  } catch (error) {
    console.error("Error fetching user domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
} 