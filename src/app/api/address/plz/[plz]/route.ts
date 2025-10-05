import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plz: string }> }
) {
  try {
    const { plz } = await params;
    
    if (!plz || plz.length !== 4) {
      return NextResponse.json(
        { error: 'Invalid postal code' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://compando-backend-dwl4f.ondigitalocean.app/api/address/plz/${plz}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout and retry options
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`External API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching region data:', error);
    
    // Handle specific error types
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout - external service is slow' },
        { status: 408 }
      );
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
      return NextResponse.json(
        { error: 'External service unavailable' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch region data' },
      { status: 500 }
    );
  }
}
