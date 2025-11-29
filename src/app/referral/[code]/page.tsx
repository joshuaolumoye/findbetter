'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ReferralPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [referralName, setReferralName] = useState('');

  useEffect(() => {
    const validateAndRedirect = async () => {
      if (!code) {
        setStatus('invalid');
        return;
      }

      try {
        // Validate the referral code
        const response = await fetch(`/api/referrals/validate?code=${encodeURIComponent(code)}`);
        const data = await response.json();

        if (data.valid) {
          setStatus('valid');
          setReferralName(data.referral.name);
          
          // Store the referral code in sessionStorage for the registration form
          sessionStorage.setItem('referralCode', code);
          sessionStorage.setItem('referralId', data.referral.id.toString());
          
          // Redirect to home page after a short delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setStatus('invalid');
        }
      } catch (error) {
        console.error('Error validating referral:', error);
        setStatus('invalid');
      }
    };

    validateAndRedirect();
  }, [code, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Validating Referral Code...</h1>
            <p className="text-gray-600">Please wait while we verify your referral link.</p>
          </>
        )}

        {status === 'valid' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Referral Code Valid!</h1>
            <p className="text-gray-600 mb-4">
              Welcome! You came via <span className="font-semibold text-blue-600">{referralName}</span>.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting you to the homepage...
            </p>
            <div className="mt-4 bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                Your referral code <code className="font-mono bg-blue-100 px-2 py-0.5 rounded">{code}</code> has been saved.
              </p>
            </div>
          </>
        )}

        {status === 'invalid' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Referral Code</h1>
            <p className="text-gray-600 mb-6">
              The referral code <code className="font-mono bg-gray-100 px-2 py-0.5 rounded">{code}</code> is not valid or has expired.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Continue to Homepage
            </button>
          </>
        )}
      </div>
    </div>
  );
}

