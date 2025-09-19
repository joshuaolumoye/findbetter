// File: src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUserWithInsurance, getAllUsers, searchUsers, getUsersByStatus, getDashboardStats } from '../../../lib/db-utils';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'birthDate'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    
    // Create user with insurance data
    const userId = await createUserWithInsurance(userData);
    
    return NextResponse.json({
      success: true,
      userId,
      message: 'User registration completed successfully'
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    
    let users;
    
    if (search) {
      users = await searchUsers(search, status);
    } else if (status) {
      users = await getUsersByStatus(status);
    } else {
      users = await getAllUsers();
    }
    
    return NextResponse.json({ users });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}