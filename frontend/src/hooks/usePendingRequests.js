import { useState, useEffect, useCallback } from 'react';
import { accessRequestsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';

/**
 * Pending access-request count for admins.
 *
 * Drives the notification badge in the sidebar / header and the admin
 * dashboard banner. Refreshes on mount and whenever an
 * 'access-requests-updated' window event fires (dispatched by the
 * Access Requests page after approve/reject actions).
 */
export default function usePendingRequests() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (user?.role !== 'admin') {
      setCount(0);
      return;
    }
    try {
      const res = await accessRequestsAPI.pendingCount();
      setCount(res.data?.pending_count ?? 0);
    } catch {
      setCount(0);
    }
  }, [user?.role]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('access-requests-updated', handler);
    return () => window.removeEventListener('access-requests-updated', handler);
  }, [refresh]);

  return { count, refresh };
}
