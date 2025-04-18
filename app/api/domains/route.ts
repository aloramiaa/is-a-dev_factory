import { NextResponse } from "next/server";

// Raw JSON URL containing all registered domains
const RAW_DOMAINS_URL = "https://raw.is-a.dev/";

interface DomainEntry {
  subdomain?: string;
  domain?: string;
  description?: string;
  reserved?: boolean;
  [key: string]: any;
}

export interface DomainsApiParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "48");
    const search = url.searchParams.get("search") || "";
    
    // Validate params
    const validatedPage = Math.max(1, page);
    const validatedPageSize = Math.min(Math.max(12, pageSize), 200); // Between 12 and 200
    
    // Fetch all domains from raw.is-a.dev
    console.log("Fetching all domains from raw.is-a.dev");
    const response = await fetch(RAW_DOMAINS_URL, {
      // Add cache control headers
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch domains: ${response.status} ${response.statusText}`);
    }
    
    // Parse the JSON data and filter out reserved domains
    const data: DomainEntry[] = await response.json();
    console.log(`Loaded ${data.length} total domains from raw.is-a.dev`);
    
    // Filter and format domains
    const filteredDomains = data
      .filter(item => !item.reserved) // Exclude reserved domains
      .filter(item => {
        // Apply search filter if provided
        if (!search) return true;
        return item.subdomain?.toLowerCase().includes(search.toLowerCase());
      })
      .map(item => ({
        name: item.subdomain || "",
        domain: item.domain || "",
        description: item.description || item.domain || "",
      }));
    
    // Calculate pagination
    const totalDomains = filteredDomains.length;
    const totalPages = Math.ceil(totalDomains / validatedPageSize);
    const startIndex = (validatedPage - 1) * validatedPageSize;
    const endIndex = Math.min(startIndex + validatedPageSize, totalDomains);
    
    // Slice the domains for the current page
    const paginatedDomains = filteredDomains.slice(startIndex, endIndex);
    
    return NextResponse.json({ 
      domains: paginatedDomains,
      pagination: {
        page: validatedPage,
        pageSize: validatedPageSize,
        totalPages,
        totalItems: totalDomains,
        hasNextPage: validatedPage < totalPages,
        hasPrevPage: validatedPage > 1
      },
      source: RAW_DOMAINS_URL
    });
  } catch (error) {
    console.error("Error fetching domains:", error);
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
} 