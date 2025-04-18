import { NextResponse } from "next/server"

// In a real application, this would check against the actual is-a.dev registry
// For demo purposes, we'll simulate the check
export async function POST(req: Request) {
  try {
    const { subdomain } = await req.json()

    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain is required" }, { status: 400 })
    }

    // Simulate API call to check availability
    // In a real app, you would fetch from the is-a.dev registry
    // or use the GitHub API to check if the file exists

    // For demo purposes, we'll say subdomains with 'test' are taken
    const isAvailable = !subdomain.includes("test")

    return NextResponse.json({
      subdomain,
      available: isAvailable,
    })
  } catch (error) {
    console.error("Error checking subdomain:", error)
    return NextResponse.json({ error: "Failed to check subdomain availability" }, { status: 500 })
  }
}
