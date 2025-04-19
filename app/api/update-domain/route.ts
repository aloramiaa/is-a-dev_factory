import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/auth";
import { createPullRequest } from "@/app/actions/github";
import type { DomainData } from "@/types/domain";

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
    const formData = await request.formData();
    const subdomainFormData = formData.get("subdomain") as string;
    const domainDataJson = formData.get("domainData") as string;
    const screenshot = formData.get("screenshot") as File | null;
    
    if (!subdomainFormData || !domainDataJson) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    try {
      // Parse the domain data
      const domainData = JSON.parse(domainDataJson) as DomainData;
      
      // Ensure the owner matches the authenticated user
      domainData.owner = {
        username: session.user.name,
        email: session.user.email || undefined,
      };
      
      // Create the pull request
      const result = await createPullRequest(subdomainFormData, domainData, screenshot);
      
      return NextResponse.json({
        success: true,
        url: result.url,
        message: "Domain update pull request created successfully",
      });
      
    } catch (parseError) {
      console.error("Error parsing domain data:", parseError);
      return NextResponse.json(
        { error: "Invalid domain data format" },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error("Error updating domain:", error);
    return NextResponse.json(
      { error: "Failed to update domain" },
      { status: 500 }
    );
  }
} 