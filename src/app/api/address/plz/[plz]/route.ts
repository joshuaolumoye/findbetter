import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plz: string }> }
) {
  try {
    const { plz } = await params;
    
    if (!plz || plz.length !== 4) {
      console.error('[PLZ API] Invalid postal code:', plz);
      return NextResponse.json(
        { error: 'Invalid postal code' },
        { status: 400 }
      );
    }

    console.log(`[PLZ API] Fetching region data for PLZ: ${plz}`);
    
    const externalApiUrl = `https://compando-backend-dwl4f.ondigitalocean.app/api/address/plz/${plz}`;
    console.log(`[PLZ API] External API URL: ${externalApiUrl}`);

    const response = await fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FindBetter-NextJS/1.0',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    console.log(`[PLZ API] External API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PLZ API] External API Error: ${response.status} ${response.statusText}`);
      console.error(`[PLZ API] Response body:`, errorText);
      
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[PLZ API] External API Data:`, JSON.stringify(data).substring(0, 200));
    
    // Ensure we return consistent format
    if (!data) {
      console.warn(`[PLZ API] No data returned from external API for PLZ: ${plz}`);
      return NextResponse.json(
        { error: 'No data found for this postal code' },
        { status: 404 }
      );
    }

    // Return the data as-is (backend should handle array format)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    console.error('[PLZ API] Error fetching region data:', errorMessage);
    
    // Handle specific error types
    if (errorName === 'AbortError') {
      console.error('[PLZ API] Request timeout');
      return NextResponse.json(
        { error: 'Request timeout - external service is slow' },
        { status: 408 }
      );
    }
    
    if (errorMessage.includes('socket hang up')) {
      console.error('[PLZ API] Connection reset');
      return NextResponse.json(
        { error: 'Connection error with external service' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch region data', details: errorMessage },
      { status: 500 }
    );
  }
}
