import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService } from '../../../../../services/SkribbleService';

export const dynamic = 'force-dynamic';

// Test Skribble configuration
const getSkribbleConfig = () => {
  return {
    apiKey: process.env.SKRIBBLE_API_KEY || '',
    baseUrl: process.env.SKRIBBLE_BASE_URL || 'https://api.skribble.de',
    environment: (process.env.SKRIBBLE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    webhookSecret: process.env.SKRIBBLE_WEBHOOK_SECRET || 'demo_webhook_secret_123',
    username: process.env.SKRIBBLE_USERNAME || 'api_demo_companiox_15d1_0'
  };
};

export async function GET(request: NextRequest) {
  console.log('=== SKRIBBLE CONNECTION TEST START ===');
  
  try {
    const config = getSkribbleConfig();
    
    console.log('Testing with configuration:', {
      username: config.username,
      baseUrl: config.baseUrl,
      environment: config.environment,
      hasApiKey: !!config.apiKey
    });

    // Initialize Skribble service
    const skribbleService = new SkribbleService(config);
    
    // Test the connection
    const isConnected = await skribbleService.testConnection();
    
    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: 'Skribble API connection successful',
        configuration: {
          username: config.username,
          baseUrl: config.baseUrl,
          environment: config.environment,
          status: 'connected'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Skribble API connection failed',
        configuration: {
          username: config.username,
          baseUrl: config.baseUrl,
          environment: config.environment,
          status: 'failed'
        },
        suggestions: [
          'Verify your API credentials are correct',
          'Check that the Skribble API is accessible',
          'Ensure your account has the necessary permissions'
        ]
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('Skribble connection test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error.message,
      configuration: getSkribbleConfig(),
      troubleshooting: {
        commonIssues: [
          'Invalid API credentials',
          'Network connectivity issues',
          'Account permissions insufficient',
          'API rate limits exceeded'
        ],
        nextSteps: [
          'Verify SKRIBBLE_USERNAME and SKRIBBLE_API_KEY in .env.local',
          'Check internet connection',
          'Contact Skribble support if credentials are correct'
        ]
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('=== SKRIBBLE MANUAL TEST START ===');
  
  try {
    const body = await request.json();
    const config = getSkribbleConfig();
    
    // Test with custom credentials if provided
    if (body.username) config.username = body.username;
    if (body.apiKey) config.apiKey = body.apiKey;
    
    console.log('Manual test with credentials:', {
      username: config.username,
      hasApiKey: !!config.apiKey
    });

    // Manual API test
    const credentials = `${config.username}:${config.apiKey}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    console.log('Testing direct API call...');
    const response = await fetch(`${config.baseUrl}/v2/access/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Accept': 'application/json',
        'User-Agent': 'Swiss-Insurance-Test/1.0'
      }
    });

    const responseText = await response.text();
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText
    });

    if (response.ok) {
      let accountData;
      try {
        accountData = JSON.parse(responseText);
      } catch {
        accountData = { message: 'Response received but not JSON', raw: responseText };
      }

      return NextResponse.json({
        success: true,
        message: 'Manual API test successful',
        apiResponse: {
          status: response.status,
          data: accountData
        },
        configuration: {
          username: config.username,
          baseUrl: config.baseUrl
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Manual API test failed',
        apiResponse: {
          status: response.status,
          statusText: response.statusText,
          error: responseText
        },
        configuration: {
          username: config.username,
          baseUrl: config.baseUrl
        }
      }, { status: response.status });
    }

  } catch (error: any) {
    console.error('Manual test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Manual test failed',
      details: error.message
    }, { status: 500 });
  }
}