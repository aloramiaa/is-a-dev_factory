"use server"

import { Octokit } from "@octokit/rest"
import type { DomainData } from "@/types/domain"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/auth"

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || "is-a-dev"
const REPO_NAME = process.env.GITHUB_REPO_NAME || "register"
const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN

// Helper function to get auth token for API calls
async function getAuthToken(forUserOperation = true) {
  // For user operations like creating PRs, ALWAYS use the user's token
  if (forUserOperation) {
    try {
      const session = await getServerSession(authOptions);
      const userToken = session?.accessToken;
      
      if (!userToken) {
        throw new Error("User authentication required for this operation");
      }
      
      return userToken;
    } catch (error) {
      console.error("Error getting user session:", error);
      throw new Error("Authentication required: Please log in with GitHub");
    }
  }
  
  // For server operations or non-user operations, can use API token or session
  if (GITHUB_API_TOKEN) {
    return GITHUB_API_TOKEN;
  }
  
  // Fallback to session token for non-user operations if available
  try {
    const session = await getServerSession(authOptions);
    return session?.accessToken || null;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
}

export async function checkSubdomainAvailability(subdomain: string): Promise<boolean> {
  try {
    // This is a read-only operation, can use server token
    const token = await getAuthToken(false);

    if (!token) {
      throw new Error("Authentication required");
    }

    const octokit = new Octokit({
      auth: token,
    });

    try {
      // Check if the file exists in the repository
      await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: `domains/${subdomain}.json`,
      });
      // If we get here, the file exists
      return false;
    } catch (error: any) {
      // If we get a 404, the file doesn't exist
      if (error.status === 404) {
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error checking subdomain availability:", error);
    throw error;
  }
}

export async function getAllDomains(): Promise<string[]> {
  try {
    // Read-only operation, can use server token
    const token = await getAuthToken(false);
    
    const octokit = token 
      ? new Octokit({ auth: token })
      : new Octokit();

    // Get all files in the domains directory
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: "domains",
    });

    if (!Array.isArray(data)) {
      throw new Error("Expected an array of files");
    }

    // Filter for JSON files and extract domain names
    return data.filter((file) => file.name.endsWith(".json")).map((file) => file.name.replace(".json", ""));
  } catch (error) {
    console.error("Error fetching all domains:", error);
    throw error;
  }
}

export type ProgressStep = {
  id: string
  message: string
  status: "pending" | "loading" | "complete" | "error"
}

export async function createPullRequest(
  subdomain: string, 
  domainData: DomainData,
  screenshot?: File | null
): Promise<{ url: string }> {
  try {
    const reportProgress = (id: string, message: string, status: ProgressStep["status"]) => {
      // Just log to server console instead of using callbacks
      console.log(`[${status}] ${message}`)
    }

    reportProgress("auth", "Authenticating with GitHub...", "loading")
    // This is a user operation, must use user token
    const token = await getAuthToken(true);

    if (!token) {
      reportProgress("auth", "Authentication failed - no token available", "error")
      throw new Error("Authentication required")
    }
    reportProgress("auth", "Authentication successful", "complete")

    const octokit = new Octokit({
      auth: token,
    })

    // Get the authenticated user
    reportProgress("user", "Getting GitHub user information...", "loading")
    const { data: user } = await octokit.users.getAuthenticated()
    const username = user.login
    reportProgress("user", `Authenticated as ${username}`, "complete")

    // Store the actual GitHub username in the domain data
    // This ensures we use the login name, not the display name
    if (domainData.owner) {
      domainData.owner.username = username
    }
    
    // Handle screenshot upload if provided
    let screenshotUrl = "";
    if (screenshot) {
      const isEmailOnlyDomain = Object.keys(domainData.record).length === 1 && domainData.record.MX;
      if (!isEmailOnlyDomain) {
        reportProgress("screenshot", "Uploading screenshot...", "loading");
        
        // Create or get a repo to store screenshots
        const screenshotRepoName = "domain-screenshots";
        
        // Check if screenshot repo exists, if not create it
        try {
          await octokit.repos.get({
            owner: username,
            repo: screenshotRepoName
          });
          reportProgress("screenshot", "Found existing screenshot repository", "complete");
        } catch (error) {
          // Repo doesn't exist, create it
          reportProgress("screenshot", "Creating screenshot repository...", "loading");
          await octokit.repos.createForAuthenticatedUser({
            name: screenshotRepoName,
            description: "Screenshots for my is-a.dev domains",
            auto_init: true,
            private: false
          });
          reportProgress("screenshot", "Created screenshot repository", "complete");
          
          // Wait a bit for the repo to be ready
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Convert screenshot to base64
        const arrayBuffer = await screenshot.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        
        // Create a unique filename with timestamp
        const timestamp = Date.now();
        const fileExtension = screenshot.name.split('.').pop() || 'png';
        const filename = `${subdomain}-${timestamp}.${fileExtension}`;
        
        // Upload screenshot to user's screenshot repo
        reportProgress("screenshot", `Uploading screenshot as ${filename}...`, "loading");
        try {
          await octokit.repos.createOrUpdateFileContents({
            owner: username,
            repo: screenshotRepoName,
            path: filename,
            message: `Add screenshot for ${subdomain}.is-a.dev`,
            content: base64Data,
          });
          
          // Get raw image URL
          screenshotUrl = `https://raw.githubusercontent.com/${username}/${screenshotRepoName}/main/${filename}`;
          reportProgress("screenshot", "Screenshot uploaded successfully", "complete");
        } catch (error) {
          console.error("Error uploading screenshot:", error);
          reportProgress("screenshot", "Failed to upload screenshot", "error");
          // Continue with PR creation even if screenshot upload fails
        }
      }
    }

    // 1. Fork the repository if not already forked
    reportProgress("fork", "Checking for existing fork...", "loading")
    let fork: { data?: any } = { data: undefined }
    try {
      reportProgress("fork", `Forking repository ${REPO_OWNER}/${REPO_NAME}...`, "loading")
      console.log(`Creating fork of ${REPO_OWNER}/${REPO_NAME} for user ${username}`)
      
      // Try to create fork with explicit parameters
      fork = await octokit.repos.createFork({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        name: REPO_NAME,
        default_branch_only: false,
      })
      
      console.log(`Fork creation response:`, {
        forkId: fork.data?.id,
        forkName: fork.data?.full_name,
        status: "created"
      })
      
      reportProgress("fork", "Fork created or already exists", "complete")
    } catch (error: any) {
      console.error("Fork creation error:", error)
      reportProgress("fork", "Fork creation failed, checking if fork already exists...", "loading")
      
      // Check if error indicates the fork already exists
      if (error.status === 422 && error.message?.includes("already exists")) {
        console.log("Fork already exists error detected, looking for existing fork")
      }
      
      // If fork already exists, get the fork
      const { data: userRepos } = await octokit.repos.listForAuthenticatedUser()
      const existingFork = userRepos.find((repo) => repo.name === REPO_NAME)
      
      if (!existingFork) {
        reportProgress("fork", "Could not create or find fork", "error")
        console.error("Could not create or find fork", error)
        throw new Error(`Could not create or find fork: ${error.message || "Unknown error"}`)
      }
      
      console.log(`Found existing fork:`, {
        forkId: existingFork.id,
        forkName: existingFork.full_name
      })
      
      fork.data = existingFork
      reportProgress("fork", `Found existing fork: ${username}/${REPO_NAME}`, "complete")
    }

    // Wait longer for the fork to be ready (GitHub API can take time to complete the fork)
    // Increase wait time significantly to ensure the fork is ready
    reportProgress("wait-fork", "Waiting for fork to be ready...", "loading")
    await new Promise((resolve) => setTimeout(resolve, 15000)) // Increased to 15 seconds
    
    if (!fork.data) {
      reportProgress("wait-fork", "Fork data is undefined", "error")
      throw new Error("Fork data is undefined")
    }
    reportProgress("wait-fork", `Fork ready: ${fork.data.full_name}`, "complete")

    // Verify fork exists and is accessible
    reportProgress("verify-fork", "Verifying fork access...", "loading")
    
    // Implement retry logic with exponential backoff for fork verification
    let forkVerified = false
    let verifyAttempts = 0
    const maxVerifyAttempts = 5
    let verifyBackoffTime = 3000 // Start with 3 seconds
    
    while (!forkVerified && verifyAttempts < maxVerifyAttempts) {
      verifyAttempts++
      try {
        console.log(`Verify attempt ${verifyAttempts}: Checking fork ${username}/${REPO_NAME}`)
        
        const { data: verifiedFork } = await octokit.repos.get({
          owner: username,
          repo: REPO_NAME,
        })
        
        reportProgress("verify-fork", `Fork verified and accessible: ${verifiedFork.full_name} (attempt ${verifyAttempts})`, "complete")
        forkVerified = true
      } catch (error) {
        console.error(`Fork verification error (attempt ${verifyAttempts}):`, error)
        
        if (verifyAttempts >= maxVerifyAttempts) {
          reportProgress("verify-fork", `Failed to verify fork after ${maxVerifyAttempts} attempts`, "error")
          console.error("Error accessing fork:", error)
          throw new Error("Cannot access fork, please try again later")
        } else {
          reportProgress("verify-fork", `Fork not yet accessible (attempt ${verifyAttempts}), waiting longer...`, "loading")
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, verifyBackoffTime))
          verifyBackoffTime *= 2 // Exponential backoff
        }
      }
    }

    // 2. Get the default branch
    reportProgress("get-branch", "Getting default branch information...", "loading")
    const { data: repo } = await octokit.repos.get({
      owner: REPO_OWNER,
      repo: REPO_NAME,
    })
    const defaultBranch = repo.default_branch
    reportProgress("get-branch", `Default branch: ${defaultBranch}`, "complete")

    // 3. Get the latest commit SHA from the original repo
    reportProgress("get-commit", "Getting latest commit information...", "loading")
    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${defaultBranch}`,
    })
    const latestCommitSha = refData.object.sha
    reportProgress("get-commit", `Latest commit SHA: ${latestCommitSha.substring(0, 7)}...`, "complete")

    // 4. Create a new branch in the fork
    // Use only the last part of subdomain for branch name if it contains dots
    const subdomainForBranch = subdomain.includes('.') ? 
      subdomain.replace(/\./g, '-') : 
      subdomain
    
    const timestamp = Date.now()
    const branchName = `add-${subdomainForBranch}-${timestamp}`
    reportProgress("create-branch", `Creating branch in fork: ${branchName}...`, "loading")
    
    // Try to create the branch, with retry and exponential backoff
    let branchCreated = false
    let attempts = 0
    const maxAttempts = 5 // Increased from 3 to 5 attempts
    let backoffTime = 2000 // Start with 2 seconds
    
    while (!branchCreated && attempts < maxAttempts) {
      attempts++
      try {
        // Add more descriptive logging
        console.log(`Attempt ${attempts}: Creating branch ${branchName} in ${username}/${REPO_NAME} from SHA ${latestCommitSha}`)
        
        await octokit.git.createRef({
          owner: username,
          repo: REPO_NAME,
          ref: `refs/heads/${branchName}`,
          sha: latestCommitSha,
        })
        reportProgress("create-branch", `Branch created successfully (attempt ${attempts})`, "complete")
        branchCreated = true
      } catch (error: any) {
        console.error(`Branch creation error (attempt ${attempts}):`, error)
        
        if (attempts >= maxAttempts) {
          reportProgress("create-branch", `Failed to create branch after ${maxAttempts} attempts`, "error")
          if (error.status === 422) {
            throw new Error("Failed to create branch - it may already exist. Please try again.")
          } else if (error.message && error.message.includes("Reference already exists")) {
            // If branch already exists, consider it a success
            reportProgress("create-branch", `Branch ${branchName} already exists, proceeding`, "complete")
            branchCreated = true
          } else {
            throw new Error(`Failed to create branch in fork: ${error.message || "Unknown error"}`)
          }
        } else {
          reportProgress("create-branch", `Failed to create branch (attempt ${attempts}), retrying...`, "loading")
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffTime))
          backoffTime *= 2 // Exponential backoff
        }
      }
    }

    // 5. Create the file content in the fork
    const content = Buffer.from(JSON.stringify(domainData, null, 2)).toString("base64")
    reportProgress("create-file", `Creating file: domains/${subdomain}.json...`, "loading")
    
    try {
      // First check if the file already exists to get its SHA
      let fileSha = '';
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner: username,
          repo: REPO_NAME,
          path: `domains/${subdomain}.json`,
          ref: branchName,
        });
        
        if ('sha' in existingFile) {
          fileSha = existingFile.sha;
          reportProgress("create-file", "File exists, updating with new content", "loading");
        }
      } catch (err) {
        // File doesn't exist, which is fine for a new domain
        reportProgress("create-file", "File doesn't exist yet, creating new file", "loading");
      }
      
      // Create or update the file with the SHA if it exists
      const updateParams: any = {
        owner: username,
        repo: REPO_NAME,
        path: `domains/${subdomain}.json`,
        message: `Add ${subdomain}.is-a.dev`,
        content,
        branch: branchName,
      };
      
      // Only include SHA if the file already exists
      if (fileSha) {
        updateParams.sha = fileSha;
      }
      
      await octokit.repos.createOrUpdateFileContents(updateParams);
      reportProgress("create-file", "File created successfully", "complete")
    } catch (error) {
      reportProgress("create-file", "Failed to create file", "error")
      console.error("Error creating file:", error)
      throw new Error("Failed to create file in fork")
    }

    // 6. Create a pull request from fork to original repo - update to include screenshot
    reportProgress("create-pr", "Creating pull request...", "loading")
    try {
      // Create PR body with screenshot
      const prBody = `## Domain Registration\n\nI'd like to register \`${subdomain}.is-a.dev\`.\n\n`;
      
      // Add domain details
      let detailsSection = "";
      if (domainData.description) {
        detailsSection += `- **Description**: ${domainData.description}\n`;
      }
      if (domainData.repo) {
        detailsSection += `- **Repository**: ${domainData.repo}\n`;
      }
      
      // Add screenshot section if we have a URL
      const screenshotSection = screenshotUrl 
        ? `\n## Website Preview\n\n![${subdomain}.is-a.dev Screenshot](${screenshotUrl})\n`
        : "";
      
      // Add checklist
      const checklistSection = `\n## Checklist\n\n- [x] I've read the [documentation](https://is-a.dev/docs)\n- [x] I've verified that my domain adheres to the [domain structure](https://is-a.dev/docs/#domain-structure)\n- [x] I've verified that my JSON file is valid`;
      
      // Combine all sections
      const fullBody = prBody + (detailsSection ? detailsSection + "\n" : "") + screenshotSection + checklistSection;
      
      const { data: pullRequest } = await octokit.pulls.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        title: `Add ${subdomain}.is-a.dev`,
        head: `${username}:${branchName}`,
        base: defaultBranch,
        body: fullBody,
      })
      reportProgress("create-pr", `Pull request created successfully: #${pullRequest.number}`, "complete")
      return { url: pullRequest.html_url }
    } catch (error) {
      reportProgress("create-pr", "Failed to create pull request", "error")
      console.error("Error creating pull request:", error)
      throw new Error("Failed to create pull request")
    }
  } catch (error) {
    console.error("Error creating pull request:", error)
    throw error
  }
}

export async function getUserDomains(username: string): Promise<string[]> {
  try {
    console.log("Fetching domains for user:", username);
    
    if (!username) {
      console.error("No username provided");
      throw new Error("Username is required");
    }
    
    // Read-only operation, can use server token
    const token = await getAuthToken(false);
    console.log("Auth token available:", !!token);
    
    const octokit = token 
      ? new Octokit({ auth: token })
      : new Octokit();
    
    console.log("Fetching repository contents...");
    try {
      const { data } = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: "domains",
      });
      
      if (!Array.isArray(data)) {
        console.error("Expected array of files but got:", typeof data);
        throw new Error("Expected an array of files");
      }
      
      console.log(`Found ${data.length} total domain files`);
      
      // Take only first 20 files for faster testing
      const domainFiles = data.filter(file => file.name.endsWith(".json")).slice(0, 20);
      console.log(`Processing ${domainFiles.length} domain files`);
      
      const userDomains = [];
      
      // Process each file to find those registered by the user
      for (const file of domainFiles) {
        try {
          console.log(`Checking file: ${file.name}`);
          const content = await octokit.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: `domains/${file.name}`,
          });
          
          // Decode content from base64
          if ('content' in content.data) {
            const contentStr = Buffer.from(content.data.content, 'base64').toString();
            const domainData = JSON.parse(contentStr);
            
            console.log(`Domain ${file.name} owner:`, domainData.owner?.username || domainData.owner?.github);
            
            // Check if this domain belongs to the user
            if (domainData.owner && 
                (domainData.owner.username === username || 
                 domainData.owner.github === username)) {
              console.log(`Found user domain: ${file.name}`);
              userDomains.push(file.name.replace('.json', ''));
            }
          }
        } catch (error) {
          // Skip files that can't be processed
          console.error(`Error processing file ${file.name}:`, error);
          continue;
        }
      }
      
      console.log(`Found ${userDomains.length} domains for user ${username}`);
      return userDomains;
    } catch (error) {
      console.error("Error fetching repository contents:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in getUserDomains:", error);
    // Return empty array instead of throwing to prevent endless loading
    return [];
  }
}

export async function checkDomainOwnership(domainName: string, username: string): Promise<boolean> {
  try {
    console.log(`Checking if ${domainName} belongs to ${username}`);
    
    if (!domainName || !username) {
      return false;
    }
    
    // Read-only operation, can use server token
    const token = await getAuthToken(false);
    const octokit = token 
      ? new Octokit({ auth: token })
      : new Octokit();
    
    try {
      const content = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: `domains/${domainName}.json`,
      });
      
      if ('content' in content.data) {
        const contentStr = Buffer.from(content.data.content, 'base64').toString();
        const domainData = JSON.parse(contentStr);
        
        return !!(domainData.owner && 
          (domainData.owner.username === username || 
           domainData.owner.github === username));
      }
      
      return false;
    } catch (error: any) {
      if (error.status === 404) {
        // File doesn't exist
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error checking domain ownership for ${domainName}:`, error);
    return false;
  }
}
