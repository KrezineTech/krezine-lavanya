// Admin Real-time Chat Hook
// Provides real-time messaging functionality for admin users

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeOptions {
  enabled?: boolean;
  role?: 'admin' | 'customer';
  onNewMessage?: (event: any) => void;
  onThreadUpdate?: (event: any) => void;
  onUserJoined?: (event: any) => void;
  onUserLeft?: (event: any) => void;
  onPresenceChanged?: (event: any) => void;
  onMessagesRead?: (event: any) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface UseRealtimeReturn {
  socket: Socket | null;
  connected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  joinThread: (threadId: number) => void;
  leaveThread: (threadId: number) => void;
  sendMessage: (threadId: number, content: string, attachments?: File[]) => Promise<void>;
  markAsRead: (threadId: number, messageIds: number[]) => void;
  updatePresence: (status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY') => void;
}

export function useRealtime(options: UseRealtimeOptions = {}): UseRealtimeReturn {
  const {
    enabled = true,
    role = 'admin',
    onNewMessage,
    onThreadUpdate,
    onUserJoined,
    onUserLeft,
    onPresenceChanged,
    onMessagesRead,
    onConnectionChange
  } = options;

  const { toast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  const currentThreadRef = useRef<number | null>(null);
  // Keep track of join requests made before socket connected so we can retry
  const pendingJoinsRef = useRef<Set<number>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Control detailed socket error logging in production via env flag
  const debugSocketErrors = typeof process !== 'undefined' && process?.env?.NEXT_PUBLIC_DEBUG_SOCKET_ERRORS === 'true';
  // Control general realtime logging
  const debugRealtime = typeof process !== 'undefined' && process?.env?.NEXT_PUBLIC_DEBUG_REALTIME === 'true';

  // Get authentication token (no authentication required)
  const getAuthToken = useCallback(() => {
    if (debugRealtime) console.log('DEBUG: getAuthToken - using default admin token');
    return 'dev-token-admin';
  }, [debugRealtime]);

  // Memoize the socket initialization function to prevent unnecessary re-runs
  const initializeSocket = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') return;

    setConnectionStatus('connecting');

    const token = getAuthToken();
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

    console.log('DEBUG: Initializing socket with token length:', token.length, 'url:', socketUrl);

    const newSocket = io(socketUrl, {
      auth: {
        token,
        userType: 'admin',
        userIdentifier: 'admin-user'
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });

    // Set socket immediately to prevent cleanup
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Admin socket connected:', newSocket.id);
      setConnected(true);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      onConnectionChange?.(true);

      // Process any pending thread joins that were requested while disconnected
      if (pendingJoinsRef.current.size > 0) {
        console.log('🔁 Processing pending thread joins:', Array.from(pendingJoinsRef.current));
        pendingJoinsRef.current.forEach((threadId) => {
          try {
            newSocket.emit('join_thread', { threadId, userType: role.toUpperCase() });
            currentThreadRef.current = threadId;
          } catch (e) {
            console.warn('Failed to join pending thread', threadId, e);
          }
        });
        pendingJoinsRef.current.clear();
      }

      // Rejoin current thread if set (for reconnects where pending were cleared)
      if (currentThreadRef.current) {
        console.log('🔁 Rejoining current thread on connect:', currentThreadRef.current);
        newSocket.emit('join_thread', { threadId: currentThreadRef.current, userType: role.toUpperCase() });
      }

      toast({
        title: 'Connected',
        description: 'Real-time messaging is active',
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Admin socket disconnected:', reason);
      setConnected(false);
      setConnectionStatus('disconnected');
      onConnectionChange?.(false);

      // Only attempt reconnection for certain disconnect reasons
      if (reason === 'io server disconnect') {
        handleReconnect();
      }
      // Don't reconnect on 'io client disconnect' as that's intentional
    });

    newSocket.on('connect_error', (error) => {
      // Determine whether the error object contains meaningful details
      const hasMeaningfulContent = error && typeof error === 'object' && Object.keys(error).length > 0 &&
        ((error as any).message || (error as any).code || (error as any).type || (error as any).description);

      // Show a concise message; include the raw object only when it's meaningful
      if (hasMeaningfulContent) {
        const msg = (error as any).message || 'Connection error';
        if (debugSocketErrors) {
          console.error('🔌 Admin socket connection error:', msg, error);
        } else {
          console.error('🔌 Admin socket connection error:', msg);
        }
      } else {
        console.debug('🔌 Admin socket connection failed (non-critical)');
      }

      setConnectionStatus('error');
      setConnected(false);
      onConnectionChange?.(false);

      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to connect to real-time service',
      });

      handleReconnect();
    });

    // Message events - memoize event handlers to prevent recreation
    const handleNewMessage = (data: any) => {
      console.log('📨 New message received:', data);
      onNewMessage?.(data);
    };

    const handleThreadUpdate = (data: any) => {
      console.log('📝 Thread updated:', data);
      onThreadUpdate?.(data);
    };

    const handleUserJoined = (data: any) => {
      console.log('👥 User joined thread:', data);
      onUserJoined?.(data);
    };

    const handleUserLeft = (data: any) => {
      console.log('👋 User left thread:', data);
      onUserLeft?.(data);
    };

    const handlePresenceChanged = (data: any) => {
      console.log('👤 Presence changed:', data);
      onPresenceChanged?.(data);
    };

    const handleMessagesRead = (data: any) => {
      console.log('👁️ Messages read:', data);
      onMessagesRead?.(data);
    };

    const handleSocketError = (error: any) => {
      // Only log and show toast for meaningful errors
      const errorMessage = (error && typeof error === 'object' && 'message' in error)
        ? error.message
        : 'An error occurred';

      // Don't log empty objects or generic errors that don't provide useful information
      // Check if error is a non-empty object with actual content
      const hasMeaningfulContent = error &&
        (typeof error === 'string' ||
         (typeof error === 'object' && (error.message || error.code || error.type || error.description)));

      if (hasMeaningfulContent) {
        // Log a concise, human-friendly message first. Only pass the raw object
        // when it actually contains enumerable details — this prevents "{}" from
        // being printed in the console when Socket.IO emits an empty object.
        const details = (typeof error === 'object' && Object.keys(error).length > 0) ? error : undefined;
        console.error('🔌 Socket error:', errorMessage);

        // If there's a stack trace, log it separately to aid debugging.
        if ((error as any)?.stack) {
          console.error((error as any).stack);
        }

        toast({
          variant: 'destructive',
          title: 'Socket Error',
          description: errorMessage,
        });
      } else {
        console.debug('🔌 Socket connection issue (non-critical)');
        // Don't show toast for empty errors
      }
    };

    newSocket.on('new_message', handleNewMessage);
    newSocket.on('new_chat_message', handleNewMessage);
    newSocket.on('new_direct_message', handleNewMessage);
    newSocket.on('thread_updated', handleThreadUpdate);
    newSocket.on('user_joined', handleUserJoined);
    newSocket.on('user_left', handleUserLeft);
    newSocket.on('presence_changed', handlePresenceChanged);
    newSocket.on('messages_read', handleMessagesRead);
    newSocket.on('error', handleSocketError);

    return newSocket;
  }, [enabled, getAuthToken, onConnectionChange, onNewMessage, onThreadUpdate, onUserJoined, onUserLeft, onPresenceChanged, onMessagesRead, toast]);

  // Handle reconnection - simplified to avoid circular dependency
  const handleReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('🔌 Max reconnection attempts reached');
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Unable to reconnect to real-time service',
      });
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    console.log(`🔌 Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(async () => {
      // Create new socket directly instead of calling initializeSocket to avoid circular dependency
      if (!enabled || typeof window === 'undefined') return;

      const token = getAuthToken();
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });

      // Set socket immediately
      setSocket(newSocket);
      setConnectionStatus('connecting');

      // Add event handlers
      newSocket.on('connect', () => {
        console.log('🔌 Admin socket reconnected:', newSocket.id);
        setConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Admin socket disconnected:', reason);
        setConnected(false);
        setConnectionStatus('disconnected');
        onConnectionChange?.(false);
        if (reason === 'io server disconnect') {
          handleReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        const hasMeaningfulContent = error && typeof error === 'object' && Object.keys(error).length > 0 &&
          ((error as any).message || (error as any).code || (error as any).type || (error as any).description);

        if (hasMeaningfulContent) {
          const msg = (error as any).message || 'Connection error';
          if (debugSocketErrors) {
            console.error('🔌 Admin socket connection error:', msg, error);
          } else {
            console.error('🔌 Admin socket connection error:', msg);
          }
        } else {
          console.debug('🔌 Admin socket connection failed (non-critical)');
        }

        setConnectionStatus('error');
        setConnected(false);
        onConnectionChange?.(false);
        handleReconnect();
      });

    }, delay);
  }, [enabled, getAuthToken, onConnectionChange, toast]);

  // Join a thread room
  const joinThread = useCallback((threadId: number) => {
    if (!socket || !connected) {
      console.warn('🔌 Socket not connected - queuing join for thread', threadId);
      pendingJoinsRef.current.add(threadId);
      return;
    }

    // Leave current thread if different
    if (currentThreadRef.current && currentThreadRef.current !== threadId) {
      leaveThread(currentThreadRef.current);
    }

    console.log(`👥 Joining thread ${threadId}`);
    socket.emit('join_thread', { threadId, userType: role.toUpperCase() });
    currentThreadRef.current = threadId;
  }, [socket, connected, role]);

  // Leave a thread room
  const leaveThread = useCallback((threadId: number) => {
    // If we have a pending join for this thread, remove it
    if (pendingJoinsRef.current.has(threadId)) {
      pendingJoinsRef.current.delete(threadId);
    }

    if (!socket || !connected) return;

    console.log(`👋 Leaving thread ${threadId}`);
    socket.emit('leave_thread', { threadId });
    currentThreadRef.current = null;
  }, [socket, connected]);

  // Send a message
  const sendMessage = useCallback(async (threadId: number, content: string, attachments?: File[]) => {
    // If socket is not connected, wait for connection
    if (!socket || !connected) {
      console.log(`🔌 Socket not connected, waiting for connection to send message to thread ${threadId}`);

      // Wait for connection with timeout
      const maxWaitTime = 10000; // 10 seconds
      const startTime = Date.now();

      while ((!socket || !connected) && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
      }

      // If still not connected after waiting, throw error
      if (!socket || !connected) {
        throw new Error('Socket connection timeout - cannot send message');
      }
    }

    console.log(`💬 Sending message to thread ${threadId}`);

    socket.emit('send_message', {
      threadId,
      content,
      authorRole: role.toUpperCase(),
      authorName: 'Admin',
      attachments: attachments?.map(file => ({
        url: '', // This would be uploaded first
        filename: file.name,
        mimeType: file.type,
        size: file.size
      }))
    });
  }, [socket, connected, role]);

  // Mark messages as read
  const markAsRead = useCallback((threadId: number, messageIds: number[]) => {
    if (!socket || !connected) return;
    socket.emit('mark_read', { threadId, messageIds });
  }, [socket, connected]);

  // Update presence
  const updatePresence = useCallback((status: 'ONLINE' | 'OFFLINE' | 'AWAY' | 'BUSY') => {
    if (!socket || !connected) return;
    socket.emit('presence_update', { status });
  }, [socket, connected]);

  // Initialize on mount or when enabled changes
  useEffect(() => {
    if (!enabled) {
      // Cleanup existing socket if disabled
      if (socket) {
        console.log('🔌 Cleaning up socket connection (disabled)');
        socket.disconnect();
        setSocket(null);
        setConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Only initialize if we don't have a socket or it's not connected
    if (!socket || !connected) {
      initializeSocket();
    }

    // Cleanup function - only disconnect on unmount or when dependencies change
    return () => {
      // Don't disconnect here - let the component control the socket lifecycle
      // The socket will be cleaned up when the component unmounts
    };
  }, [enabled]); // Only depend on enabled

  // Separate effect for session changes that require socket reinitialization (removed - no auth)
  useEffect(() => {
    // No authentication-based reinitialization needed
  }, []); // Empty dependency array

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        console.log('🔌 Cleaning up socket connection (component unmount)');
        socket.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run on unmount

  return {
    socket,
    connected,
    connectionStatus,
    joinThread,
    leaveThread,
    sendMessage,
    markAsRead,
    updatePresence
  };
}