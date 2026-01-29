import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Payment {
  id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'credit';
  payment_method?: string;
  paid_at?: string;
  notes?: string;
}

export const usePayments = () => {
  const [loading, setLoading] = useState(false);

  const getPaymentStatus = async (appointmentId: string): Promise<Payment | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error obteniendo estado de pago:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const listPayments = async (status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'credit', limit: number = 50): Promise<Payment[]> => {
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select(`*, appointments(id, start_time, doctor_id, patient_id, status)`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as any[]) || [];
    } catch (error: any) {
      console.error('Error listando pagos:', error);
      toast.error(error.message || 'Error al listar pagos');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (
    appointmentId: string,
    paymentMethod: string,
    amount?: number,
    notes?: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('Intentando pago directo...', { appointmentId, paymentMethod, amount });

      // Fallback DIRECTO: Inserción sin RPC y sin columnas problemáticas
      // Omitimos 'paid_at' y 'notes' deliberadamente

      // 1. UPSERT Payment (Handles both existing pending payments from trigger or new ones)
      // Check if payment already exists to avoid unique constraint error (42P10)
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      const paymentData = {
        appointment_id: appointmentId,
        status: 'paid',
        payment_method: paymentMethod,
        amount: amount ?? 0,
        // currency: 'COP', // Waiting for migration
        // updated_at: new Date().toISOString() // Waiting for migration
      };

      let error;
      if (existingPayment) {
        const { error: updateError } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', existingPayment.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('payments')
          .insert(paymentData);
        error = insertError;
      }

      if (error) throw error;

      // 2. Actualizar estado de la cita
      const { error: aptError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);

      if (aptError) throw aptError;

      toast.success('Pago registrado exitosamente');
      return true;

    } catch (error: any) {
      console.error('Error registrando pago:', error);
      toast.error(error.message || 'Error al registrar pago');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getPatientCredits = async (patientId: string): Promise<{ credits: Payment[], total: number }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`*, appointments!inner(patient_id)`)
        .eq('status', 'credit')
        .eq('appointments.patient_id', patientId);

      if (error) throw error;

      const credits = data || [];
      const total = credits.reduce((sum, c) => sum + Number(c.amount), 0);

      return { credits, total };
    } catch (error: any) {
      console.error('Error obteniendo créditos:', error);
      return { credits: [], total: 0 };
    } finally {
      setLoading(false);
    }
  };

  const applyCredit = async (creditPaymentId: string, newAppointmentId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: credit, error: creditError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', creditPaymentId)
        .single();

      if (creditError || !credit) throw new Error('Crédito no encontrado');

      const { error: payError } = await supabase
        .from('payments')
        .insert({
          appointment_id: newAppointmentId,
          status: 'paid',
          payment_method: 'credit',
          amount: credit.amount,
          currency: 'COP'
        });

      if (payError) throw payError;

      await supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', creditPaymentId);

      toast.success('Crédito aplicado exitosamente');
      return true;

    } catch (error: any) {
      console.error('Error aplicando crédito:', error);
      toast.error(error.message || 'Error al aplicar crédito');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getPaymentStatus,
    listPayments,
    markAsPaid,
    getPatientCredits,
    applyCredit
  };
};
