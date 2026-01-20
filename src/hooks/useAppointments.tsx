import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_virtual: boolean;
  room_id?: string;
  notes?: string;
}

interface Room {
  id: string;
  name: string;
  description?: string;
}

export const useAppointments = () => {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const getRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, description')
        .eq('is_active', true);

      if (error) throw error;
      setRooms(data || []);
      return data || [];
    } catch (error: any) {
      console.error('Error obteniendo consultorios:', error);
      return [];
    }
  };

  const getAvailability = async (doctorId: string, date: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      console.log('Fetching availability for:', { doctorId, date });

      // Correctly use invoke with query parameters in the function name
      const { data, error } = await supabase.functions.invoke(`appointments?action=availability&doctor_id=${doctorId}&date=${date}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
        }
      });

      if (error) {
        console.error('Invoke error:', error);
        throw error;
      }

      // If the function returns an error object inside data
      if (data && data.error) throw new Error(data.error);

      setSlots(data.slots || []);
      return data.slots;
    } catch (error: any) {
      console.error('Error obteniendo disponibilidad:', error);
      toast.error(error.message || 'Error al obtener disponibilidad');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (
    doctorId: string,
    patientId: string,
    startTime: string,
    isVirtual: boolean = false,
    roomId?: string,
    notes?: string
  ): Promise<Appointment | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      // Use invoke for POST
      const { data, error } = await supabase.functions.invoke('appointments?action=create', {
        body: {
          doctor_id: doctorId,
          patient_id: patientId,
          start_time: startTime,
          is_virtual: isVirtual,
          room_id: roomId,
          notes
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
        }
      });

      if (error) {
        console.error('Invoke create error:', error);
        throw error;
      }

      if (data && data.error) throw new Error(data.error);

      toast.success('Cita creada exitosamente');
      return data.appointment;
    } catch (error: any) {
      console.error('Error creando cita:', error);
      toast.error(error.message || 'Error al crear la cita');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('appointments?action=cancel', {
        body: {
          appointment_id: appointmentId,
          reason
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
        }
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      toast.success('Cita cancelada exitosamente');
      return true;
    } catch (error: any) {
      console.error('Error cancelando cita:', error);
      toast.error(error.message || 'Error al cancelar la cita');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    slots,
    rooms,
    getRooms,
    getAvailability,
    createAppointment,
    cancelAppointment
  };
};
