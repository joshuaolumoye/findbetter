// app/api/users/[id]/route.ts - PRODUCTION MODE
import { NextRequest, NextResponse } from 'next/server';
import { getUserDetails } from '../../../lib/db-utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Fetching user details for ID:', params.id);
  
  try {
    const userId = parseInt(params.id);
    
    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID',
          details: 'User ID must be a positive number',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    // Get user details with timeout protection
    const userDetails = await Promise.race([
      getUserDetails(userId),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 15000)
      )
    ]);

    if (!userDetails.user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          details: `No user found with ID ${userId}`,
          code: 'USER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    console.log('User details fetched successfully for:', userDetails.user.email);

    return NextResponse.json({
      success: true,
      user: userDetails.user,
      quotes: userDetails.quotes,
      compliance: userDetails.compliance,
      adminActions: userDetails.adminActions
    });

  } catch (error: any) {
    console.error('Error fetching user details:', error);
    
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { 
          error: 'Request timeout',
          details: 'Database query took too long',
          code: 'TIMEOUT_ERROR'
        },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch user details',
        details: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        code: 'FETCH_ERROR'
      },
      { status: 500 }
    );
  }
}