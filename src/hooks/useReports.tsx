import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardSummary {
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  income: {
    total: number;
    count: number;
  };
  appointments: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
    scheduled: number;
  };
  payments: {
    paid: { count: number; total: number };
    pending: { count: number; total: number };
    credits: { generated: number; total: number };
    credits_used: { count: number; total: number };
  };
  rooms: {
    total_active: number;
    avg_occupancy: number;
  };
}

interface IncomeByDay {
  date: string;
  total_income: number;
  payments_count: number;
}

interface IncomeByMonth {
  year: number;
  month: number;
  month_name: string;
  total_income: number;
  payments_count: number;
}

interface IncomeByDoctor {
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  total_income: number;
  appointments_count: number;
  avg_per_appointment: number;
}

interface IncomeByRoom {
  room_id: string;
  room_name: string;
  total_income: number;
  appointments_count: number;
}

interface AppointmentsByStatus {
  status: string;
  count: number;
  percentage: number;
}

interface RoomHours {
  room_id: string;
  room_name: string;
  total_hours: number;
  appointments_count: number;
  avg_hours_per_day: number;
}

interface RoomOccupancy {
  room_id: string;
  room_name: string;
  total_available_hours: number;
  total_used_hours: number;
  occupancy_percentage: number;
  status: 'subutilizado' | 'normal' | 'alta_demanda';
}

interface PaymentsSummary {
  status: string;
  count: number;
  total_amount: number;
}

type ReportType = 
  | 'dashboard'
  | 'income-by-day'
  | 'income-by-month'
  | 'income-by-doctor'
  | 'income-by-room'
  | 'appointments-by-status'
  | 'room-hours'
  | 'room-occupancy'
  | 'payments-summary';

export const useReports = () => {
  const [loading, setLoading] = useState(false);

  const fetchReport = async <T,>(
    report: ReportType,
    params?: {
      startDate?: string;
      endDate?: string;
      monthsBack?: number;
    }
  ): Promise<T | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      let url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reports?report=${report}`;
      
      if (params?.startDate) url += `&start_date=${params.startDate}`;
      if (params?.endDate) url += `&end_date=${params.endDate}`;
      if (params?.monthsBack) url += `&months_back=${params.monthsBack}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
        }
      });

      const response = await res.json();
      if (!res.ok) throw new Error(response.error);
      
      return response.data as T;
    } catch (error: any) {
      console.error(`Error obteniendo reporte ${report}:`, error);
      toast.error(error.message || 'Error al obtener reporte');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Métodos específicos para cada reporte
  const getDashboard = (startDate?: string, endDate?: string) =>
    fetchReport<DashboardSummary>('dashboard', { startDate, endDate });

  const getIncomeByDay = (startDate?: string, endDate?: string) =>
    fetchReport<IncomeByDay[]>('income-by-day', { startDate, endDate });

  const getIncomeByMonth = (monthsBack: number = 12) =>
    fetchReport<IncomeByMonth[]>('income-by-month', { monthsBack });

  const getIncomeByDoctor = (startDate?: string, endDate?: string) =>
    fetchReport<IncomeByDoctor[]>('income-by-doctor', { startDate, endDate });

  const getIncomeByRoom = (startDate?: string, endDate?: string) =>
    fetchReport<IncomeByRoom[]>('income-by-room', { startDate, endDate });

  const getAppointmentsByStatus = (startDate?: string, endDate?: string) =>
    fetchReport<AppointmentsByStatus[]>('appointments-by-status', { startDate, endDate });

  const getRoomHours = (startDate?: string, endDate?: string) =>
    fetchReport<RoomHours[]>('room-hours', { startDate, endDate });

  const getRoomOccupancy = (startDate?: string, endDate?: string) =>
    fetchReport<RoomOccupancy[]>('room-occupancy', { startDate, endDate });

  const getPaymentsSummary = (startDate?: string, endDate?: string) =>
    fetchReport<PaymentsSummary[]>('payments-summary', { startDate, endDate });

  return {
    loading,
    getDashboard,
    getIncomeByDay,
    getIncomeByMonth,
    getIncomeByDoctor,
    getIncomeByRoom,
    getAppointmentsByStatus,
    getRoomHours,
    getRoomOccupancy,
    getPaymentsSummary
  };
};
