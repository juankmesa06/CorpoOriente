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
        .or('is_active.eq.true,is_active.is.null');

      if (error) throw error;
      console.log('Fetched Rooms:', data);
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
      // Force a session check/refresh to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        throw new Error('No autenticado');
      }

      console.log('Fetching availability for:', { doctorId, date });

      // Correctly use invoke with query parameters in the function name
      const { data, error } = await supabase.functions.invoke(`appointments?action=availability&doctor_id=${doctorId}&date=${date}`, {
        method: 'GET'
      });

      if (error) {
        console.error('Invoke error:', error);

        let errorMessage = 'Error al obtener disponibilidad';
        let errorDetails = '';

        if (error instanceof Error) {
          errorMessage = error.message;
          // @ts-ignore - Supabase specific error structure might have context
          if (error.context && error.context.json) {
            try {
              // @ts-ignore
              const body = await error.context.json();
              console.error('Full Error Body:', body); // Log the full body for debugging

              if (body) {
                if (body.error) errorMessage = body.error;
                if (body.details) errorDetails = body.details;
              }
            } catch (e) {
              console.error('Error parsing error body:', e);
            }
          }
        }

        // Include details in the thrown error if available
        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      }

      // If the function returns an error object inside data (some invocation styles)
      if (data && data.error) throw new Error(data.error);

      // Filter slots strictly between 9 AM and 7 PM Local Time
      const filteredSlots = (data.slots || []).filter((slot: string) => {
        const date = new Date(slot);
        const hour = date.getHours(); // Uses browser local time
        return hour >= 9 && hour < 19;
      });

      setSlots(filteredSlots);
      return filteredSlots;
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

      console.log('Creating appointment with:', { doctorId, patientId, startTime, isVirtual, roomId });

      // Use invoke for POST
      const { data, error } = await supabase.functions.invoke('appointments?action=create', {
        body: {
          doctor_id: doctorId,
          patient_id: patientId,
          start_time: startTime,
          is_virtual: isVirtual,
          room_id: roomId || null, // Send null if undefined/empty
          notes
        }
      });

      if (error) {
        console.error('Invoke create error details:', {
          message: error.message,
          name: error.name,
          // @ts-ignore
          context: error.context,
          // @ts-ignore
          status: error.status
        });

        let errorMessage = 'Error al crear la cita';
        if (error instanceof Error) {
          errorMessage = error.message;
          // @ts-ignore
          if (error.context && typeof error.context.json === 'function') {
            try {
              // @ts-ignore
              const body = await error.context.json();
              console.error('Invoke error body:', body);
              if (body && body.error) errorMessage = body.error;
            } catch (e) {
              console.error('Could not parse error body');
            }
          }
        }
        throw new Error(errorMessage);
      }

      if (data && data.error) throw new Error(data.error);

      toast.success('Cita creada exitosamente');
      return data.appointment;
    } catch (error: any) {
      console.error('Error creando cita:', error);
      // Clean up the error message if it's the generic one
      const displayError = error.message.includes('non-2xx')
        ? 'Error de validación en el servidor'
        : error.message;
      toast.error(displayError || 'Error al crear la cita');
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
    cancelAppointment,
    checkRoomAvailability: async (startTime: string, endTime: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc('check_any_available_room' as any, {
          p_start_time: startTime,
          p_end_time: endTime
        });

        if (error) {
          console.error('Error checking room availability:', error);
          throw error;
        }
        return data as boolean;
      } catch (error) {
        console.error('Catch Error checking room availability:', error);
        return false;
      }
    },
    assignRoomToAppointment: async (appointmentId: string, doctorId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc('assign_room_to_appointment' as any, {
          p_appointment_id: appointmentId,
          p_doctor_id: doctorId
        });

        if (error) {
          console.error('RPC Error (assign_room_to_appointment):', error);
          return false;
        }

        if (data && !(data as any).success) {
          console.warn('Backend Assignment Failed:', (data as any).message);
        }

        return (data as any)?.success || false;
      } catch (error) {
        console.error('Catch Error assigning room:', error);
        return false;
      }
    },
    generatePayout: async (appointmentId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase.rpc('generate_single_payout' as any, {
          p_appointment_id: appointmentId
        });

        if (error) throw error;
        return (data as any)?.success || false;
      } catch (error) {
        console.error('Error generating payout:', error);
        return false;
      }
    }
  };
};
