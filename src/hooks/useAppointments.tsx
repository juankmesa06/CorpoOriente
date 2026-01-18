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

      const response = await supabase.functions.invoke('appointments', {
        body: null,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      // Hacer GET request manual para availability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointments?action=availability&doctor_id=${doctorId}&date=${date}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
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

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointments?action=create`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          patient_id: patientId,
          start_time: startTime,
          is_virtual: isVirtual,
          room_id: roomId,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointments?action=cancel`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          reason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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
