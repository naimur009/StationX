'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';

export function useTableStatusSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    };
    socket.on('table:statusChanged', handler);
    return () => {
      socket.off('table:statusChanged', handler);
    };
  }, [queryClient]);
}
