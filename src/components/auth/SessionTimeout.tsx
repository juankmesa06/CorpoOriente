import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const SessionTimeout = () => {
    const { user, signOut } = useAuth();
    const timeoutRef = useRef<NodeJS.Timeout>();

    const handleLogout = useCallback(() => {
        if (user) {
            signOut();
            toast.info('Sesión cerrada por inactividad');
        }
    }, [user, signOut]);

    const resetTimer = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (user) {
            timeoutRef.current = setTimeout(handleLogout, TIMEOUT_MS);
        }
    }, [user, handleLogout]);

    useEffect(() => {
        if (!user) return;

        // Events to listen for activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        // Initial set
        resetTimer();

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, resetTimer]);

    return null;
};
