import { NextResponse } from "next/server"

// Validate the format and characters of a subdomain
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

// In a real application, this would check against the actual is-a.dev registry
// For demo purposes, we'll simulate the check
export async function POST(req: Request) {
  try {
    const { subdomain } = await req.json()

    // Basic validation check
    if (!subdomain) {
      return NextResponse.json({ 
        error: "Subdomain is required",
        available: false
      }, { status: 400 })
    }

    // Perform detailed subdomain format validation
    const validation = validateSubdomain(subdomain);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.message,
        subdomain,
        available: false,
        valid: false
      }, { status: 400 })
    }

    // Sanitize the input for safety before any further processing
    const sanitizedSubdomain = subdomain.toLowerCase().trim();

    // Simulate API call to check availability
    // In a real app, you would fetch from the is-a.dev registry
    // or use the GitHub API to check if the file exists

    // For demo purposes, we'll say subdomains with 'test' are taken
    const isAvailable = !sanitizedSubdomain.includes("test")

    return NextResponse.json({
      subdomain: sanitizedSubdomain,
      available: isAvailable,
      valid: true
    })
  } catch (error) {
    console.error("Error checking subdomain:", error)
    return NextResponse.json({ 
      error: "Failed to check subdomain availability",
      available: false,
      valid: false
    }, { status: 500 })
  }
}
