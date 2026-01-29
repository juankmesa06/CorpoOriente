import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PatientNameDisplayProps {
    patientId: string;
    className?: string;
}

export const PatientNameDisplay = ({ patientId, className }: PatientNameDisplayProps) => {
    const [name, setName] = useState<string>('Cargando...');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchName = async () => {
            if (!patientId) {
                if (isMounted) {
                    setName('Sin ID');
                    setLoading(false);
                }
                return;
            }

            try {
                // 1. Try to find link in patient_profiles
                // Using maybeSingle() to avoid 406 errors if not found
                const { data: patientProfile, error: ppError } = await supabase
                    .from('patient_profiles')
                    .select('user_id')
                    .eq('id', patientId)
                    .maybeSingle();

                let userIdToFetch = patientProfile?.user_id;

                // 2. If no link found, check if the ID itself is a User ID in profiles (Direct Fallback)
                if (!userIdToFetch) {
                    // Try exact match on ID or User ID (handling inconsistent data)
                    const { data: directProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .or(`id.eq.${patientId},user_id.eq.${patientId}`)
                        .maybeSingle();

                    if (directProfile?.full_name) {
                        if (isMounted) {
                            setName(directProfile.full_name);
                            setLoading(false);
                        }
                        return;
                    }
                }

                // 3. Fetch profile using the found user_id
                if (userIdToFetch) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, email')
                        .eq('user_id', userIdToFetch)
                        .maybeSingle();

                    if (isMounted) {
                        setName(profile?.full_name || profile?.email || 'Nombre Desconocido');
                    }
                } else {
                    // No user found linked and not a direct profile.
                    if (isMounted) setName('Paciente (No Encontrado)');
                }
            } catch (error) {
                console.error('Error fetching name:', error);
                if (isMounted) setName('Error');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchName();

        return () => {
            isMounted = false;
        };
    }, [patientId]);

    if (loading) {
        return (
            <span className={`inline-block animate-pulse bg-gray-200 h-4 w-24 rounded align-middle ${className}`}>
                <span className="sr-only">Cargando...</span>
            </span>
        );
    }

    return <span className={`inline-block align-middle ${className}`}>{name}</span>;
};
