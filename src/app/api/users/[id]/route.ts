// File: src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserDetails, updateUserStatus } from '../../../../lib/db-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    const userDetails = await getUserDetails(userId);
    
    return NextResponse.json(userDetails);
    
  } catch (error) {
    console.error('Error fetching user details:', error);
    
    if (error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const { status, adminUser, notes } = await request.json();
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    if (!['pending', 'active', 'inactive', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    await updateUserStatus(userId, status, adminUser || 'admin', notes);
    
    return NextResponse.json({
      success: true,
      message: 'User status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}