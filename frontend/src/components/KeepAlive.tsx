'use client';

import { useEffect } from 'react';

const PING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export function KeepAlive() {
  useEffect(() => {
    function ping() {
      fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {});
    }

    // Ping immediately on mount
    ping();

    const interval = setInterval(ping, PING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}
