"use client";
import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Settings, Loader } from 'lucide-react';

export default function SkribbleTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [manualTest, setManualTest] = useState({
    username: 'api_demo_companiox_15d1_0',
    apiKey: 'd01dbed4-0ae9-4d49-bd85-88e2c14aa1b0'
  });

  const runConnectionTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/skribble/test-connection', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Test request failed',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runManualTest = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/skribble/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(manualTest)
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Manual test failed',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setManualTest(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center mb-4">
            <Settings className="w-6 h-6 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Skribble API Connection Test</h1>
          </div>
          <p className="text-gray-600">
            Test your Skribble API connection to ensure documents are properly sent to your dashboard.
          </p>
        </div>

        {/* Current Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-gray-600 font-medium">Username</label>
              <p className="bg-gray-50 p-2 rounded border">
                {process.env.NEXT_PUBLIC_SKRIBBLE_USERNAME || 'api_demo_companiox_15d1_0'}
              </p>
            </div>
            <div>
              <label className="block text-gray-600 font-medium">API Key</label>
              <p className="bg-gray-50 p-2 rounded border">
                d01dbed4-0ae9-4d49-bd85-88e2c14aa1b0
              </p>
            </div>
            <div>
              <label className="block text-gray-600 font-medium">Base URL</label>
              <p className="bg-gray-50 p-2 rounded border">
                https://api.skribble.com
              </p>
            </div>
            <div>
              <label className="block text-gray-600 font-medium">Environment</label>
              <p className="bg-gray-50 p-2 rounded border">
                sandbox
              </p>
            </div>
          </div>
        </div>

        {/* Automatic Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Automatic Connection Test</h2>
          <p className="text-gray-600 mb-4">
            Test the connection using your current environment configuration.
          </p>
          
          <button
            onClick={runConnectionTest}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </button>
        </div>

        {/* Manual Test */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Manual Credential Test</h2>
          <p className="text-gray-600 mb-4">
            Test with specific credentials to troubleshoot connection issues.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={manualTest.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="api_demo_companiox_15d1_0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <input
                type="text"
                value={manualTest.apiKey}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="d01dbed4-0ae9-4d49-bd85-88e2c14aa1b0"
              />
            </div>
          </div>
          
          <button
            onClick={runManualTest}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Test Manual Credentials
              </>
            )}
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            
            {testResult.success ? (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-semibold text-green-800">Connection Successful</span>
                </div>
                <p className="text-green-700 text-sm">{testResult.message}</p>
                
                {testResult.configuration && (
                  <div className="mt-3 text-sm">
                    <p><strong>Username:</strong> {testResult.configuration.username}</p>
                    <p><strong>Environment:</strong> {testResult.configuration.environment}</p>
                    <p><strong>Status:</strong> {testResult.configuration.status}</p>
                  </div>
                )}

                {testResult.apiResponse && (
                  <div className="mt-3">
                    <p className="font-medium text-green-800">API Response:</p>
                    <pre className="bg-green-100 p-2 rounded text-xs overflow-x-auto mt-1">
                      {JSON.stringify(testResult.apiResponse.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <XCircle className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-semibold text-red-800">Connection Failed</span>
                </div>
                <p className="text-red-700 text-sm mb-3">{testResult.message || testResult.error}</p>
                
                {testResult.details && (
                  <div className="mb-3">
                    <p className="font-medium text-red-800">Details:</p>
                    <p className="text-red-700 text-sm">{testResult.details}</p>
                  </div>
                )}

                {testResult.apiResponse && (
                  <div className="mb-3">
                    <p className="font-medium text-red-800">API Response:</p>
                    <div className="bg-red-100 p-2 rounded text-xs mt-1">
                      <p><strong>Status:</strong> {testResult.apiResponse.status}</p>
                      <p><strong>Error:</strong> {testResult.apiResponse.error || testResult.apiResponse.statusText}</p>
                    </div>
                  </div>
                )}

                {testResult.suggestions && (
                  <div className="mb-3">
                    <p className="font-medium text-red-800">Suggestions:</p>
                    <ul className="list-disc list-inside text-red-700 text-sm mt-1">
                      {testResult.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {testResult.troubleshooting && (
                  <div>
                    <p className="font-medium text-red-800">Troubleshooting:</p>
                    
                    {testResult.troubleshooting.commonIssues && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-700">Common Issues:</p>
                        <ul className="list-disc list-inside text-red-600 text-xs mt-1">
                          {testResult.troubleshooting.commonIssues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {testResult.troubleshooting.nextSteps && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-700">Next Steps:</p>
                        <ul className="list-disc list-inside text-red-600 text-xs mt-1">
                          {testResult.troubleshooting.nextSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">What This Test Does</h3>
              <div className="text-blue-800 text-sm space-y-2">
                <p>
                  This test verifies your Skribble API connection by calling the <code>/v2/account</code> endpoint.
                  If successful, it means your credentials are valid and documents should appear in your Skribble dashboard.
                </p>
                <p>
                  <strong>If the test passes:</strong> Your insurance documents should now be sent to Skribble when users complete the form.
                </p>
                <p>
                  <strong>If the test fails:</strong> Check your credentials and ensure your Skribble demo account is active.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}