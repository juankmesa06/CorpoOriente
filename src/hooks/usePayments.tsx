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

interface CreditInfo {
  success: boolean;
  credit_generated?: boolean;
  amount?: number;
  message?: string;
}

export const usePayments = () => {
  const [loading, setLoading] = useState(false);

  const getPaymentStatus = async (appointmentId: string): Promise<Payment | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments?action=status&appointment_id=${appointmentId}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      return data.payment;
    } catch (error: any) {
      console.error('Error obteniendo estado de pago:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const listPayments = async (status?: string, limit: number = 50): Promise<Payment[]> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      let url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments?action=list&limit=${limit}`;
      if (status) url += `&status=${status}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      return data.payments || [];
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments?action=mark-paid`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          payment_method: paymentMethod,
          amount,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments?action=credits&patient_id=${patientId}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      return {
        credits: data.credits || [],
        total: data.total_credits || 0
      };
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payments?action=apply-credit`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credit_payment_id: creditPaymentId,
          new_appointment_id: newAppointmentId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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
