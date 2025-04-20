import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";
import { createPullRequest } from "@/app/actions/github";
import type { DomainData, DomainRecord } from "@/types/domain";

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

  return { valid: true };
}

// Validate domain data format and content
function validateDomainData(data: any): { valid: boolean; message?: string } {
  if (!data) {
    return { valid: false, message: "Domain data is required" };
  }
  
  // Check owner information
  if (!data.owner) {
    return { valid: false, message: "Owner information is required" };
  }
  
  // Check record information
  if (!data.record) {
    return { valid: false, message: "Record information is required" };
  }
  
  // Check record has at least one valid entry
  const record = data.record as DomainRecord;
  const hasValidRecord = 
    (record.A && Array.isArray(record.A) && record.A.length > 0) ||
    (record.AAAA && Array.isArray(record.AAAA) && record.AAAA.length > 0) ||
    typeof record.CNAME === 'string' ||
    (record.MX && Array.isArray(record.MX) && record.MX.length > 0) ||
    record.TXT !== undefined ||
    typeof record.URL === 'string' ||
    (record.NS && Array.isArray(record.NS) && record.NS.length > 0);
    
  if (!hasValidRecord) {
    return { 
      valid: false, 
      message: "At least one valid record type (A, AAAA, CNAME, MX, TXT, URL, NS) must be specified" 
    };
  }
  
  // If repo URL is provided, validate it
  if (data.repo) {
    try {
      new URL(data.repo);
    } catch (e) {
      return { valid: false, message: "Repository URL must be a valid URL" };
    }
  }
  
  return { valid: true };
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.name) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Parse the request body
    let formData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to parse form data", details: "Invalid form data format" },
        { status: 400 }
      );
    }
    
    const subdomainFormData = formData.get("subdomain") as string;
    const domainDataJson = formData.get("domainData") as string;
    const screenshot = formData.get("screenshot") as File | null;
    
    // Validate required fields
    if (!subdomainFormData || !domainDataJson) {
      return NextResponse.json(
        { 
          error: "Missing required fields",
          details: "Both subdomain and domainData are required" 
        },
        { status: 400 }
      );
    }
    
    // Validate subdomain format
    const subdomainValidation = validateSubdomain(subdomainFormData);
    if (!subdomainValidation.valid) {
      return NextResponse.json(
        { 
          error: "Invalid subdomain format", 
          details: subdomainValidation.message 
        },
        { status: 400 }
      );
    }
    
    // Sanitize subdomain
    const sanitizedSubdomain = subdomainFormData.toLowerCase().trim();
    
    try {
      // Parse the domain data
      let domainData: DomainData;
      try {
        domainData = JSON.parse(domainDataJson) as DomainData;
      } catch (jsonError) {
        return NextResponse.json(
          { 
            error: "Invalid domain data format", 
            details: "The domain data must be valid JSON"
          },
          { status: 400 }
        );
      }
      
      // Validate domain data structure
      const domainDataValidation = validateDomainData(domainData);
      if (!domainDataValidation.valid) {
        return NextResponse.json(
          { 
            error: "Invalid domain data", 
            details: domainDataValidation.message 
          },
          { status: 400 }
        );
      }
      
      // Validate screenshot if provided
      if (screenshot) {
        // Check file type
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(screenshot.type)) {
          return NextResponse.json(
            { 
              error: "Invalid screenshot format", 
              details: "Screenshot must be a valid image file (JPEG, PNG, GIF, or WebP)" 
            },
            { status: 400 }
          );
        }
        
        // Check file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (screenshot.size > maxSize) {
          return NextResponse.json(
            { 
              error: "Screenshot too large", 
              details: "Screenshot must be smaller than 5MB" 
            },
            { status: 400 }
          );
        }
      }
      
      // Ensure the owner matches the authenticated user
      domainData.owner = {
        username: session.user.name,
        email: session.user.email || undefined,
      };
      
      // Create the pull request
      const result = await createPullRequest(sanitizedSubdomain, domainData, screenshot);
      
      return NextResponse.json({
        success: true,
        url: result.url,
        message: "Domain update pull request created successfully",
      });
      
    } catch (parseError) {
      console.error("Error processing domain data:", parseError);
      return NextResponse.json(
        { 
          error: "Error processing domain data", 
          details: parseError instanceof Error ? parseError.message : "Unknown error"
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error("Error updating domain:", error);
    return NextResponse.json(
      { 
        error: "Failed to update domain",
        details: error instanceof Error ? error.message : "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
} 