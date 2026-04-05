'use client';

import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
}

export function GoogleSignInButton({ onSuccess, onError, text = 'continue_with' }: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  if (!clientId) {
    return null;
  }

  return (
    <div className="w-full flex justify-center google-signin-wrapper">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential);
          } else {
            onError?.('No credential returned from Google.');
          }
        }}
        onError={() => {
          onError?.('Google sign-in failed. Please try again.');
        }}
        theme="filled_black"
        size="large"
        width="352"
        text={text}
        shape="rectangular"
        logo_alignment="left"
      />
    </div>
  );
}
