import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/auth"
import { createPullRequest } from "@/app/actions/github"
import { DomainData, RecordType } from "@/types/domain"

// Validate subdomain format and naming
function validateSubdomain(subdomain: string): { valid: boolean; message?: string } {
  // Check if subdomain is empty or too short
  if (!subdomain || subdomain.length < 2) {
    return { valid: false, message: "Subdomain must be at least 2 characters long" };
  }

  // Check if subdomain is too long
  if (subdomain.length > 63) {
    return { valid: false, message: "Subdomain must be less than 64 characters long" };
  }

  // Check if subdomain only contains valid characters (alphanumeric and hyphens)
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(subdomain)) {
    return { 
      valid: false, 
      message: "Subdomain must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen" 
    };
  }

  // Check for consecutive hyphens (often not allowed)
  if (subdomain.includes('--')) {
    return { valid: false, message: "Subdomain cannot contain consecutive hyphens" };
  }

  // Check for reserved keywords or unsafe values
  const reservedWords = ['www', 'mail', 'email', 'admin', 'administrator', 'blog', 
    'dev', 'api', 'staging', 'test', 'demo', 'example', 'is-a-dev'];
  
  if (reservedWords.includes(subdomain.toLowerCase())) {
    return { valid: false, message: "This subdomain is reserved and cannot be used" };
  }

  return { valid: true };
}

// Validate record type and target
function validateRecord(recordType: string, target: string): { valid: boolean; message?: string } {
  // Validate record type
  const validRecordTypes = ["A", "AAAA", "CNAME", "MX", "TXT", "URL"];
  if (!validRecordTypes.includes(recordType)) {
    return { valid: false, message: `Invalid record type. Must be one of: ${validRecordTypes.join(", ")}` };
  }
  
  // Validate target based on record type
  if (!target || target.trim().length === 0) {
    return { valid: false, message: "Target cannot be empty" };
  }
  
  if (recordType === "A") {
    // Validate IP address format for A records
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipv4Regex.test(target)) {
      return { valid: false, message: "Target must be a valid IPv4 address for A records" };
    }
    
    // Validate each octet is within range
    const octets = target.split('.').map(Number);
    if (octets.some(octet => octet < 0 || octet > 255)) {
      return { valid: false, message: "Each part of the IPv4 address must be between 0 and 255" };
    }
  } else if (recordType === "AAAA") {
    // Basic IPv6 validation
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    if (!ipv6Regex.test(target)) {
      return { valid: false, message: "Target must be a valid IPv6 address for AAAA records" };
    }
  } else if (recordType === "CNAME" || recordType === "URL") {
    // URL validation for CNAME and URL records
    try {
      // Check if it's a valid URL by attempting to construct a URL object
      new URL(target.startsWith('http') ? target : `https://${target}`);
    } catch (e) {
      return { valid: false, message: `Target must be a valid domain name or URL for ${recordType} records` };
    }
  }
  
  return { valid: true };
}

export async function POST(req: Request) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ 
        error: "Invalid JSON in request body" 
      }, { status: 400 });
    }
    
    const { subdomain, recordType, target, description, repo } = body;

    // Validate required fields exist
    if (!subdomain || !recordType || !target) {
      return NextResponse.json({ 
        error: "Missing required fields", 
        details: "Subdomain, recordType, and target are required"
      }, { status: 400 })
    }

    // Validate subdomain format
    const subdomainValidation = validateSubdomain(subdomain);
    if (!subdomainValidation.valid) {
      return NextResponse.json({ 
        error: "Invalid subdomain", 
        details: subdomainValidation.message 
      }, { status: 400 });
    }

    // Validate record type and target
    const recordValidation = validateRecord(recordType, target);
    if (!recordValidation.valid) {
      return NextResponse.json({ 
        error: "Invalid record configuration", 
        details: recordValidation.message 
      }, { status: 400 });
    }

    // Validate repo URL if provided
    if (repo) {
      try {
        new URL(repo);
      } catch (e) {
        return NextResponse.json({ 
          error: "Invalid repository URL", 
          details: "The repository URL must be a valid URL" 
        }, { status: 400 });
      }
    }

    // Sanitize inputs
    const sanitizedSubdomain = subdomain.toLowerCase().trim();
    const sanitizedDescription = description ? description.trim() : undefined;
    const sanitizedRepo = repo ? repo.trim() : undefined;

    // Create domain data object
    const domainData: DomainData = {
      owner: {
        username: session.user.name || "",
        email: session.user.email || "",
      },
      record: recordType === "CNAME" 
        ? { CNAME: target } 
        : { A: [target] }, // A records should be an array according to the type definition
      description: sanitizedDescription,
      repo: sanitizedRepo,
    }

    // Use the real PR creation functionality
    const result = await createPullRequest(sanitizedSubdomain, domainData)

    return NextResponse.json({
      success: true,
      message: "Pull request created successfully",
      prUrl: result.url,
    })
  } catch (error) {
    console.error("Error generating PR:", error)
    return NextResponse.json({ 
      error: "Failed to generate pull request", 
      details: error instanceof Error ? error.message : "Unknown error"  
    }, { status: 500 })
  }
}
