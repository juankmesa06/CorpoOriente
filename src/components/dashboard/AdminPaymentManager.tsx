import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, isWithinInterval, parseISO, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    DollarSign, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown,
    CreditCard, Building2, MoreHorizontal, Trash2, Ban, Calendar,
    Wallet, PieChart, BarChart3, ArrowUpRight, ArrowDownRight, Stethoscope,
    FileText, Edit2, Settings, History, ChevronRight, Download, List
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    status: string;
    appointment_id: string;
    appointments?: {
        patient_profiles?: {
            profiles?: {
                full_name: string;
            }
        }
    }
}

interface RentalPayment {
    id: string;
    total_price: number;
    start_time: string;
    status: string;
    renter_name?: string;
    rooms?: {
        name: string;
        room_type: string;
    }
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

interface DoctorPayout {
    doctor_id: string;
    doctor_name: string;
    total_appointments: number;
    appointment_revenue: number;
    rental_costs: number;
    net_payout: number;
}

export const AdminPaymentManager = () => {
    const { roles } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [rentals, setRentals] = useState<RentalPayment[]>([]);
    const [doctorPayouts, setDoctorPayouts] = useState<DoctorPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [commissionRate, setCommissionRate] = useState(10);
    const [editingCommission, setEditingCommission] = useState(false);
    const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [tempCommissionRate, setTempCommissionRate] = useState(10);

    // Weekly Payouts State
    const [selectedWeek, setSelectedWeek] = useState(new Date());
    const [weeklyPayouts, setWeeklyPayouts] = useState<any[]>([]);
    const [generatingPayouts, setGeneratingPayouts] = useState(false);
    const [doctorNames, setDoctorNames] = useState<Record<string, string>>({});
    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
    const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
    const [viewingPayoutDetail, setViewingPayoutDetail] = useState<any>(null);
    const [doctorProfiles, setDoctorProfiles] = useState<Record<string, any>>({});
    const [viewingHistory, setViewingHistory] = useState(false);
    const [showArimeInvoice, setShowArimeInvoice] = useState(false);
    const [arimeInvoiceData, setArimeInvoiceData] = useState<any>(null);

    const isSuperAdmin = roles.includes('super_admin');

    useEffect(() => {
        fetchData();
    }, [selectedWeek]);

    const fetchData = async () => {
        try {
            setLoading(true);
            await fetchDoctorNames();
            await fetchWeeklyPayouts();
            await Promise.all([
                fetchPayments().catch(e => console.error('Payments fetch error:', e)),
                fetchRentals().catch(e => console.error('Rentals fetch error:', e)),
                fetchDoctorPayouts().catch(e => console.error('Payouts fetch error:', e)),
                fetchPayoutHistory().catch(e => console.error('History fetch error:', e))
            ]);
        } catch (error) {
            console.error('Data fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctorNames = async () => {
        try {
            const { data: drs, error: e1 } = await supabase.from('doctor_profiles').select('*');
            if (e1) throw e1;
            const { data: profs, error: e2 } = await supabase.from('profiles').select('user_id, full_name');
            if (e2) throw e2;
            const map: Record<string, string> = {};
            const profsData: Record<string, any> = {};
            const profNames: Record<string, string> = {};
            profs?.forEach(p => profNames[p.user_id] = p.full_name);
            drs?.forEach(d => {
                map[d.id] = profNames[d.user_id] || 'Especialista';
                profsData[d.id] = d;
            });
            setDoctorNames(map);
            setDoctorProfiles(profsData);
        } catch (e: any) {
            console.error('fetchDoctorNames failed:', e);
        }
    };

    const fetchWeeklyPayouts = async () => {
        try {
            const start = startOfWeek(selectedWeek, { weekStartsOn: 1 });
            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .eq('week_start_date', format(start, 'yyyy-MM-dd'));

            if (error) {
                console.error('Weekly payouts fetch error:', JSON.stringify(error));
                throw error;
            }
            setWeeklyPayouts(data || []);
        } catch (e: any) {
            console.error('fetchWeeklyPayouts failed:', e);
        }
    };

    const handleGeneratePayouts = async () => {
        setGeneratingPayouts(true);
        try {
            const start = startOfWeek(selectedWeek, { weekStartsOn: 1 });
            const { error } = await supabase.rpc('calculate_weekly_payouts', {
                _week_start_date: format(start, 'yyyy-MM-dd'),
                _arime_commission_percent: commissionRate
            });

            if (error) throw error;
            toast.success('Corte semanal generado exitosamente');
            setShowGenerateConfirm(false);
            fetchWeeklyPayouts();
        } catch (error) {
            console.error('Error generating payouts:', error);
            toast.error('Error al generar el corte');
        } finally {
            setGeneratingPayouts(false);
        }
    };

    const handleProcessPayout = async (payoutIds: string[]) => {
        try {
            const { error } = await supabase.rpc('mark_payouts_processed', {
                _payout_ids: payoutIds
            });

            if (error) throw error;
            toast.success('Pagos marcados como procesados');
            fetchWeeklyPayouts();
        } catch (error) {
            console.error('Error processing payouts:', error);
            toast.error('Error al procesar los pagos');
        }
    };

    const handleProcessAllPayouts = async () => {
        const pendingIds = weeklyPayouts.filter(p => p.status === 'pending').map(p => p.id);
        if (pendingIds.length === 0) return;
        try {
            await handleProcessPayout(pendingIds);
            setShowPayAllConfirm(false);
        } catch (error) {
            console.error('Error in batch payout:', error);
        }
    };

    const fetchDoctorPayouts = async () => {
        try {
            // 1. Get Doctors
            const { data: doctors, error: dError } = await supabase
                .from('doctor_profiles')
                .select('id, user_id');

            if (dError) {
                console.error('Doctors error:', JSON.stringify(dError));
                toast.error(`Error cargando lista de médicos: ${dError.message || 'Error desconocido'}`);
                return;
            }

            // 2. Get Profiles for names (independently)
            const { data: profiles } = await supabase.from('profiles').select('user_id, full_name');
            const namesMap: Record<string, string> = {};
            profiles?.forEach(p => namesMap[p.user_id] = p.full_name);

            const start = startOfWeek(selectedWeek, { weekStartsOn: 1 });
            const end = endOfWeek(selectedWeek, { weekStartsOn: 1 });

            // 3. Get all appointments for the week
            const { data: allAppointments, error: aError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    doctor_id,
                    start_time,
                    end_time,
                    is_virtual,
                    payments!inner(amount, status),
                    rooms (
                        id,
                        name,
                        room_type,
                        price_per_hour,
                        price_per_session
                    )
                `)
                .in('payments.status', ['paid', 'confirmed', 'completed'])
                .gte('start_time', start.toISOString())
                .lte('start_time', end.toISOString());

            if (aError) {
                console.error('Appointments error:', JSON.stringify(aError));
            }

            const payoutMap: Record<string, DoctorPayout> = {};

            // Initialize with all existing doctors
            (doctors || []).forEach(doc => {
                payoutMap[doc.id] = {
                    doctor_id: doc.id,
                    doctor_name: namesMap[doc.user_id] || 'Especialista',
                    total_appointments: 0,
                    appointment_revenue: 0,
                    rental_costs: 0,
                    net_payout: 0
                };
            });

            // Process matches
            allAppointments?.forEach((apt: any) => {
                if (payoutMap[apt.doctor_id]) {
                    const stats = payoutMap[apt.doctor_id];
                    stats.total_appointments += 1;

                    // Sum all successful payments for this appointment
                    const validPayments = Array.isArray(apt.payments)
                        ? apt.payments
                        : [apt.payments];

                    const paymentAmount = validPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
                    stats.appointment_revenue += paymentAmount;

                    let rentalCost = 0;

                    // Calculate duration in hours
                    let durationHours = 1; // Default 1 hour
                    if (apt.start_time && apt.end_time) {
                        const start = new Date(apt.start_time);
                        const end = new Date(apt.end_time);
                        durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60)); // Minimum 0.5 hours
                    }

                    // Calculate rental cost based on type and duration (precios desde BD/espacios)
                    if (apt.is_virtual && apt.rooms) {
                        rentalCost = Number(apt.rooms.price_per_session) || Number(apt.rooms.price_per_hour) || 0;
                    } else if (apt.rooms) {
                        if (apt.rooms.room_type === 'virtual' || apt.rooms.name?.toLowerCase().includes('virtual')) {
                            rentalCost = Number(apt.rooms.price_per_session) || Number(apt.rooms.price_per_hour) || 0;
                        } else {
                            const hourlyRate = Number(apt.rooms.price_per_hour) || 0;
                            rentalCost = hourlyRate * durationHours;
                        }
                    } else {
                        rentalCost = 0;
                    }

                    stats.rental_costs += rentalCost;
                    stats.net_payout = Math.max(0, stats.appointment_revenue - stats.rental_costs);
                }
            });

            setDoctorPayouts(Object.values(payoutMap).sort((a, b) => b.net_payout - a.net_payout));
        } catch (error: any) {
            console.error('Payouts exception:', error);
            toast.error(`Error inesperado al cargar pagos: ${error.message || 'Consulte consola'}`);
        }
    };

    const fetchPayoutHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('payouts')
                .select('*')
                .order('week_start_date', { ascending: false });

            if (error) throw error;

            // Group by week
            const grouped = (data || []).reduce((acc: any, curr) => {
                const week = curr.week_start_date;
                if (!acc[week]) {
                    acc[week] = {
                        week_start: week,
                        total_paid: 0,
                        count: 0,
                        status: 'processed', // default to processed, check if any pending
                        payout_ids: []
                    };
                }
                acc[week].total_paid += Number(curr.doctor_payout || 0);
                acc[week].count += 1;
                acc[week].payout_ids.push(curr.id);
                if (curr.status === 'pending') acc[week].status = 'pending';
                return acc;
            }, {});

            setPayoutHistory(Object.values(grouped));
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };



    const fetchPayments = async () => {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    appointments (
                        *,
                        is_virtual,
                        rooms (*)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data as any || []);
        } catch (e: any) {
            console.error('fetchPayments failed:', e);
        }
    };

    const fetchRentals = async () => {
        try {
            const { data, error } = await supabase
                .from('room_rentals')
                .select(`
                    id,
                    total_price,
                    start_time,
                    created_at,
                    status,
                    renter_name,
                    rooms(
                        name,
                        room_type
                    )
                `)
                .order('start_time', { ascending: false });

            if (error) {
                console.error('Rentals fetch error:', JSON.stringify(error));
                throw error;
            }
            setRentals(data || []);
        } catch (e: any) {
            console.error('fetchRentals failed:', e);
        }
    };

    const handleUpdateStatus = async (id: string, table: 'payments' | 'room_rentals', newStatus: string) => {
        try {
            const { error } = await supabase
                .from(table)
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Estado actualizado a ${newStatus}`);
            fetchData();
        } catch (error) {
            toast.error('Error al actualizar el estado');
        }
    };

    // Advanced Statistics Calculations
    const statistics = useMemo(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const last30Days = subDays(now, 30);

        // Normalize payments (Fix 500 peso bug)
        const normalizedPayments = payments.map(p => {
            let amount = Number(p.amount) || 0;
            if (amount === 500) {
                const apt = p.appointments as any;
                const actualApt = Array.isArray(apt) ? apt[0] : apt;
                const fee = Number(actualApt?.doctor_profiles?.consultation_fee);
                if (!isNaN(fee) && fee > 0) amount = fee;
                else amount = 150000; // Fallback
            }
            return { ...p, amount };
        });

        // Filter completed payments (include 'confirmed' as it represents processed income)
        const completedPayments = normalizedPayments
            .filter(p => p.status === 'paid' || p.status === 'completed' || p.status === 'confirmed');
        const completedRentals = rentals.filter(r => r.status === 'confirmed' || r.status === 'paid');

        // Helper: calcular costo de alquiler de una cita (consultorio virtual = 10000 COP fijo si no hay room)
        const getAppointmentRentalCost = (actualApt: any): number => {
            if (!actualApt) return 0;
            let cost = 0;
            let durationHours = 1;
            if (actualApt.start_time && actualApt.end_time) {
                const start = new Date(actualApt.start_time);
                const end = new Date(actualApt.end_time);
                durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
            }
            if (actualApt.is_virtual) {
                cost = actualApt.rooms
                    ? (Number(actualApt.rooms.price_per_session) || Number(actualApt.rooms.price_per_hour) || 0)
                    : 10000; // Costo fijo consultorio virtual
            } else if (actualApt.rooms) {
                if (actualApt.rooms.room_type === 'virtual' || actualApt.rooms.name?.toLowerCase().includes('virtual')) {
                    cost = Number(actualApt.rooms.price_per_session) || Number(actualApt.rooms.price_per_hour) || 0;
                } else {
                    cost = (Number(actualApt.rooms.price_per_hour) || 0) * durationHours;
                }
            }
            return cost;
        };

        // Calculate income
        let totalGrossAptIncome = 0;
        let implicitRentalIncome = 0;

        completedPayments.forEach(p => {
            totalGrossAptIncome += (p.amount || 0);

            const apt = p.appointments as any;
            const actualApt = Array.isArray(apt) ? apt[0] : apt;

            if (actualApt) {
                let rentalCost = 0;
                
                // Calculate duration in hours
                let durationHours = 1; // Default 1 hour
                if (actualApt.start_time && actualApt.end_time) {
                    const start = new Date(actualApt.start_time);
                    const end = new Date(actualApt.end_time);
                    durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60)); // Minimum 0.5 hours
                }
                
                // Calculate rental cost based on type and duration (precios desde BD/espacios)
                if (actualApt.is_virtual && actualApt.rooms) {
                    rentalCost = Number(actualApt.rooms.price_per_session) || Number(actualApt.rooms.price_per_hour) || 0;
                } else if (actualApt.rooms) {
                    if (actualApt.rooms.room_type === 'virtual' || actualApt.rooms.name?.toLowerCase().includes('virtual')) {
                        rentalCost = Number(actualApt.rooms.price_per_session) || Number(actualApt.rooms.price_per_hour) || 0;
                    } else {
                        const hourlyRate = Number(actualApt.rooms.price_per_hour) || 0;
                        rentalCost = hourlyRate * durationHours;
                    }
                } else {
                    rentalCost = 0;
                }
                
                implicitRentalIncome += rentalCost;
            }
        });

        const getSplit = (subsetPayments: any[], subsetRentals: any[]) => {
            const subGross = subsetPayments.reduce((s, p) => s + (p.amount || 0), 0);
            let subImplicit = 0;
            
            // Calculate rental costs from appointments (implicit rentals)
            subsetPayments.forEach(p => {
                const apt = p.appointments as any;
                const actualApt = Array.isArray(apt) ? apt[0] : apt;
                subImplicit += getAppointmentRentalCost(actualApt);
            });
            
            // Direct rentals (room_rentals table)
            const subDirectRentals = subsetRentals.reduce((s, r) => s + (Number(r.total_price) || 0), 0);

            // CICLO DE PAGOS CORRECTO:
            // 1. Paciente paga la cita → ese dinero entra al admin (subGross)
            // 2. El admin divide ese dinero en:
            //    - Valor de la cita menos alquiler → para el médico (netDoctorPayout)
            //    - Valor del alquiler del consultorio → para CorpoOriente (subImplicit)
            // 3. Todos los lunes debe pagar:
            //    - Al super admin (Arime Software): 10% del valor del alquiler de consultorios
            //    - A los médicos: valor de las citas menos el alquiler

            const totalRentalIncome = subDirectRentals + subImplicit;
            const netDoctorPayout = Math.max(0, subGross - subImplicit);
            const arimeCommission = Math.round(totalRentalIncome * (commissionRate / 100));
            const corpoOrienteNet = totalRentalIncome - arimeCommission;

            return {
                grossApt: subGross, // Total pagado por pacientes
                netApt: netDoctorPayout, // Valor de citas menos alquiler (para médicos)
                arimeCommission: arimeCommission, // 10% del total de alquileres (para Arime)
                corpoOrienteNet: corpoOrienteNet, // 90% del total de alquileres (para CorpoOriente)
                totalRental: totalRentalIncome, // Total de ingresos por alquileres
                totalIncome: subGross + subDirectRentals // Ingresos totales (citas + alquileres directos)
            };
        };



        const getPaymentDate = (p: any) => p.paid_at || p.created_at || new Date().toISOString();

        const todayPayments = completedPayments.filter(p => isWithinInterval(parseISO(getPaymentDate(p)), { start: todayStart, end: todayEnd }));
        const todayRentals = completedRentals.filter(r => isWithinInterval(parseISO(r.start_time), { start: todayStart, end: todayEnd }));
        const todaySplit = getSplit(todayPayments, todayRentals);

        const monthPayments = completedPayments.filter(p => isWithinInterval(parseISO(getPaymentDate(p)), { start: monthStart, end: monthEnd }));
        const monthRentals = completedRentals.filter(r => isWithinInterval(parseISO(r.start_time), { start: monthStart, end: monthEnd }));
        const monthSplit = getSplit(monthPayments, monthRentals);

        const totalSplit = getSplit(completedPayments, completedRentals);

        // Payment method breakdown
        const methodBreakdown = completedPayments.reduce((acc, p) => {
            const method = p.payment_method || 'other';
            acc[method] = (acc[method] || 0) + (p.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        // Daily revenue for last 30 days
        const dailyRevenue = [];
        for (let i = 29; i >= 0; i--) {
            const day = subDays(now, i);
            const dS = startOfDay(day);
            const dE = endOfDay(day);

            const dPayments = completedPayments.filter(p => isWithinInterval(parseISO(getPaymentDate(p)), { start: dS, end: dE }));
            const dRentals = completedRentals.filter(r => isWithinInterval(parseISO(r.start_time), { start: dS, end: dE }));
            const dSplit = getSplit(dPayments, dRentals);

            dailyRevenue.push({
                date: format(day, 'dd/MM', { locale: es }),
                pacientes: dSplit.netApt,
                alquileres: dSplit.totalRental,
                total: dSplit.netApt + dSplit.totalRental
            });
        }

        // Pending amounts
        const pendingPayments = payments.filter(p => p.status === 'pending');
        const pendingRentals = rentals.filter(r => r.status === 'pending');
        const pendingTotal = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0) +
            pendingRentals.reduce((sum, r) => sum + (r.total_price || 0), 0);

        // Physical vs Virtual breakdown
        let physicalIncome = 0;
        let virtualIncome = 0;
        completedRentals.forEach(r => {
            if (r.rooms?.room_type === 'virtual') virtualIncome += (r.total_price || 0);
            else physicalIncome += (r.total_price || 0);
        });
        completedPayments.forEach(p => {
            const apt = p.appointments as any;
            const actualApt = Array.isArray(apt) ? apt[0] : apt;
            const cost = getAppointmentRentalCost(actualApt);
            if (cost > 0) {
                if (actualApt?.is_virtual) virtualIncome += cost;
                else physicalIncome += cost;
            }
        });

        return {
            todayTotal: todaySplit.netApt + todaySplit.totalRental,
            monthTotal: monthSplit.netApt + monthSplit.totalRental,
            methodBreakdown,
            dailyRevenue,
            pendingTotal,
            pendingCount: pendingPayments.length + pendingRentals.length,
            totalGrossAptIncome: totalSplit.grossApt, // Total pagado por pacientes (bruto)
            totalPatientIncome: totalSplit.netApt, // Valor de citas menos alquiler (para médicos)
            totalArimeCommission: totalSplit.arimeCommission, // 10% del total de alquileres (para Arime)
            totalCorpoNet: totalSplit.corpoOrienteNet, // 90% del total de alquileres (para CorpoOriente)
            totalRentalIncome: totalSplit.totalRental, // Total de ingresos por alquileres
            virtualIncome,
            physicalIncome,
            monthPaymentsCount: monthPayments.length,
            monthUniqueAppointments: new Set(monthPayments.map(p => p.appointment_id)).size,
            monthRentalsCount: monthRentals.length,
            monthImplicitRentalFromApts: monthSplit.totalRental - monthRentals.reduce((s, r) => s + (Number(r.total_price) || 0), 0)
        };
    }, [payments, rentals, commissionRate]);

    const getMethodLabel = (method: string) => {
        switch (method?.toUpperCase()) {
            case 'PSE': return 'PSE';
            case 'TARJETA': 
            case 'CARD': return 'Tarjeta';
            case 'TRANSFER': 
            case 'TRANSFERENCIA': return 'PSE'; // Migrar transferencias antiguas a PSE
            case 'CASH': 
            case 'EFECTIVO': return 'Tarjeta'; // Migrar efectivo antiguo a Tarjeta
            default: return method || 'Tarjeta';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
            case 'paid':
            case 'confirmed':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Procesado</Badge>;
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><Ban className="h-3 w-3 mr-1" /> Cancelado</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Prepare pie chart data
    const pieChartData = Object.entries(statistics.methodBreakdown).map(([method, amount]) => ({
        name: getMethodLabel(method),
        value: amount
    }));

    // Todas las entradas de dinero (pagos + alquileres) ordenadas por fecha
    const allMovements = useMemo(() => {
        const items: { id: string; date: string; dateSort: Date; concept: string; type: 'Cita' | 'Alquiler'; method: string; amount: number; status: string }[] = [];
        const validPaymentStatus = ['paid', 'completed', 'confirmed'];
        const validRentalStatus = ['paid', 'confirmed'];

        payments.forEach((p: any) => {
            if (!validPaymentStatus.includes(p.status)) return;
            const apt = p.appointments;
            const actualApt = Array.isArray(apt) ? apt[0] : apt;
            const doctorName = actualApt?.doctor_id ? (doctorNames[actualApt.doctor_id] || 'Especialista') : 'Cita';
            items.push({
                id: `P-${p.id?.slice(0, 8) || ''}`,
                date: format(parseISO(p.paid_at || p.created_at || new Date().toISOString()), "dd/MM/yyyy HH:mm", { locale: es }),
                dateSort: new Date(p.paid_at || p.created_at || 0),
                concept: `Cita - ${doctorName}`,
                type: 'Cita',
                method: getMethodLabel(p.payment_method || ''),
                amount: Number(p.amount) || 0,
                status: p.status
            });
        });

        rentals.forEach((r: any) => {
            if (!validRentalStatus.includes(r.status)) return;
            const roomName = r.rooms?.name || r.renter_name || 'Alquiler';
            items.push({
                id: `A-${r.id?.slice(0, 8) || ''}`,
                date: format(parseISO(r.start_time || r.created_at || new Date().toISOString()), "dd/MM/yyyy HH:mm", { locale: es }),
                dateSort: new Date(r.start_time || r.created_at || 0),
                concept: `Alquiler - ${roomName}`,
                type: 'Alquiler',
                method: '-',
                amount: Number(r.total_price) || 0,
                status: r.status
            });
        });

        return items.sort((a, b) => b.dateSort.getTime() - a.dateSort.getTime());
    }, [payments, rentals, doctorNames]);

    // === NEW LOGIC START ===
    // === NEW LOGIC START ===
    // (Duplicate state/handlers removed - using existing ones)

    const isMonday = new Date().getDay() === 1;

    // Group payouts by doctor for display and export
    const processedPayouts = useMemo(() => {
        return Object.values(weeklyPayouts.reduce((acc: any, curr) => {
            const docId = curr.doctor_id;
            if (!acc[docId]) {
                acc[docId] = {
                    ...curr,
                    total_amount: 0,
                    count: 0,
                    payout_ids: []
                };
            }
            acc[docId].total_amount += Number(curr.doctor_payout);
            acc[docId].count += 1;
            acc[docId].payout_ids.push(curr.id);
            return acc;
        }, {}));
    }, [weeklyPayouts]);

    const handleExportCSV = () => {
        if (processedPayouts.length === 0) return;

        const headers = ["Médico", "Citas", "Honorarios", "Deducciones", "Neto a Pagar", "Estado"];
        const csvContent = [
            headers.join(','),
            ...processedPayouts.map((p: any) => {
                const name = doctorNames[p.doctor_id] || 'Desconocido';
                const feeTotal = Number(p.consultation_fee || 0) * p.count;
                const deductions = Number(p.room_rental_cost || 0) * p.count + Number(p.platform_commission || 0) * p.count;
                return [
                    `"${name}"`,
                    p.count,
                    feeTotal,
                    deductions,
                    p.total_amount,
                    p.status
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `corte_medicos_${selectedWeek.toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateArimeInvoice = () => {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        
        // Calcular alquileres de la semana
        const weekPayments = payments.filter(p => {
            const paymentDate = p.paid_at || p.created_at || new Date().toISOString();
            return isWithinInterval(parseISO(paymentDate), { start: weekStart, end: weekEnd }) &&
                   (p.status === 'paid' || p.status === 'completed' || p.status === 'confirmed');
        });
        
        const weekRentals = rentals.filter(r => 
            isWithinInterval(parseISO(r.start_time), { start: weekStart, end: weekEnd }) &&
            (r.status === 'confirmed' || r.status === 'paid')
        );

        // Calcular alquileres implícitos de citas
        const rentalDetails: any[] = [];
        let totalImplicitRentals = 0;

        weekPayments.forEach(p => {
            const apt = p.appointments as any;
            const actualApt = Array.isArray(apt) ? apt[0] : apt;
            if (actualApt) {
                let durationHours = 1;
                if (actualApt.start_time && actualApt.end_time) {
                    const start = new Date(actualApt.start_time);
                    const end = new Date(actualApt.end_time);
                    durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
                }

                let rentalCost = 0;
                let roomType = '';
                let roomName = '';

                if (actualApt.is_virtual && actualApt.rooms) {
                    rentalCost = Number(actualApt.rooms.price_per_session) || Number(actualApt.rooms.price_per_hour) || 0;
                    roomType = 'Virtual';
                    roomName = actualApt.rooms.name || 'Consulta Virtual';
                } else if (actualApt.rooms) {
                    if (actualApt.rooms.room_type === 'virtual' || actualApt.rooms.name?.toLowerCase().includes('virtual')) {
                        rentalCost = Number(actualApt.rooms.price_per_session) || Number(actualApt.rooms.price_per_hour) || 0;
                        roomType = 'Virtual';
                        roomName = actualApt.rooms.name || 'Consulta Virtual';
                    } else {
                        const hourlyRate = Number(actualApt.rooms.price_per_hour) || 0;
                        rentalCost = hourlyRate * durationHours;
                        roomType = 'Físico';
                        roomName = actualApt.rooms.name || 'Consultorio';
                    }
                } else {
                    rentalCost = 0;
                    roomType = 'Físico';
                    roomName = 'Consultorio';
                }

                totalImplicitRentals += rentalCost;
                rentalDetails.push({
                    tipo: 'Cita',
                    espacio: roomName,
                    tipoEspacio: roomType,
                    duracion: `${durationHours.toFixed(1)}h`,
                    costo: rentalCost,
                    fecha: format(parseISO(actualApt.start_time || new Date().toISOString()), 'dd/MM/yyyy HH:mm', { locale: es })
                });
            }
        });

        // Agregar alquileres directos
        weekRentals.forEach(r => {
            const roomType = r.rooms?.room_type === 'virtual' ? 'Virtual' : 'Físico';
            rentalDetails.push({
                tipo: 'Alquiler Directo',
                espacio: r.rooms?.name || 'Salón',
                tipoEspacio: roomType,
                duracion: '-',
                costo: Number(r.total_price) || 0,
                fecha: format(parseISO(r.start_time), 'dd/MM/yyyy HH:mm', { locale: es })
            });
        });

        const totalDirectRentals = weekRentals.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
        const totalRentalIncome = totalImplicitRentals + totalDirectRentals;
        const arimeCommission = totalRentalIncome * (commissionRate / 100);
        const corpoNet = totalRentalIncome - arimeCommission;

        setArimeInvoiceData({
            weekStart: format(weekStart, 'dd/MM/yyyy', { locale: es }),
            weekEnd: format(weekEnd, 'dd/MM/yyyy', { locale: es }),
            rentalDetails,
            totalImplicitRentals,
            totalDirectRentals,
            totalRentalIncome,
            commissionRate,
            arimeCommission,
            corpoNet,
            generatedAt: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })
        });

        setShowArimeInvoice(true);
    };

    // === NEW LOGIC END ===

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Gestión de Cobros
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Panel de control financiero con estadísticas avanzadas</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData()}
                        disabled={loading}
                        className="gap-2 border-slate-200 hover:bg-slate-50"
                    >
                        <History className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar Datos
                    </Button>
                </div>
            </div>

            {/* Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Today's Revenue */}
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-50 flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Ingresos Hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${statistics.todayTotal.toLocaleString()}</div>
                        <p className="text-xs text-emerald-100 mt-1 flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Acumulado del día
                        </p>
                    </CardContent>
                </Card>

                {/* Month's Revenue */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-50 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Ingresos del Mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">${statistics.monthTotal.toLocaleString()}</div>
                        <p className="text-xs text-blue-100 mt-1">
                            {statistics.monthUniqueAppointments} cita{statistics.monthUniqueAppointments !== 1 ? 's' : ''} pagada{statistics.monthUniqueAppointments !== 1 ? 's' : ''}
                            {statistics.monthRentalsCount > 0 && ` · ${statistics.monthRentalsCount} alquiler{statistics.monthRentalsCount !== 1 ? 'es' : ''} directo${statistics.monthRentalsCount !== 1 ? 's' : ''}`}
                            {statistics.monthImplicitRentalFromApts > 0 && ` · $${statistics.monthImplicitRentalFromApts.toLocaleString()} alq. consultorio en citas`}
                        </p>
                    </CardContent>
                </Card>

                {/* Total Income */}
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-50 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Ingresos Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            ${(statistics.totalPatientIncome + statistics.totalRentalIncome).toLocaleString()}
                        </div>
                        <p className="text-xs text-purple-100 mt-1">Histórico completo</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-emerald-600" /> Ingreso por Citas (Bruto)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${statistics.totalGrossAptIncome.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground mt-1">Total pagado por pacientes</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-blue-600" /> Pago a Médicos (Neto)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${statistics.totalPatientIncome.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground mt-1">Libre para médicos</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-purple-600" /> Ingresos por Alquileres
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">${statistics.totalRentalIncome.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground mt-1">Consultorio en citas + alquileres directos · Base para comisiones</p>
                    </CardContent>
                </Card>
            </div>

            {/* Commission & Net Balance Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-purple-50 border-purple-100 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-purple-900 font-bold flex items-center gap-2">
                                    Comisión ArímeSoftware
                                    {isSuperAdmin && (
                                        <Dialog open={editingCommission} onOpenChange={setEditingCommission}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-400 hover:text-purple-600 hover:bg-purple-100">
                                                    <Settings className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Configurar Comisión</DialogTitle>
                                                    <DialogDescription>
                                                        Ajuste el porcentaje de comisión sobre el total de alquileres.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="rate" className="text-right">
                                                            Porcentaje
                                                        </Label>
                                                        <Input
                                                            id="rate"
                                                            type="number"
                                                            value={tempCommissionRate}
                                                            onChange={(e) => setTempCommissionRate(Number(e.target.value))}
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={() => {
                                                        setCommissionRate(tempCommissionRate);
                                                        setEditingCommission(false);
                                                    }}>Guardar Cambios</Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </h3>
                                <p className="text-purple-700 text-sm">{commissionRate}% de Alquileres</p>
                            </div>
                            <DollarSign className="h-6 w-6 text-purple-400" />
                        </div>
                        <div className="text-3xl font-bold text-purple-900">${statistics.totalArimeCommission.toLocaleString()}</div>
                        <Button
                            className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all hover:scale-[1.02]"
                            onClick={handleGenerateArimeInvoice}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Generar Factura de Cobro
                        </Button>
                        <p className="text-xs text-purple-600/80 mt-2 text-center flex items-center justify-center gap-1 bg-purple-50 py-1 rounded-md">
                            <Clock className="h-3 w-3" />
                            Pago automático: Lunes 00:00 AM
                        </p>

                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="text-slate-700 font-bold">Balance Neto CorpoOriente</h3>
                                <p className="text-slate-500 text-sm">{100 - commissionRate}% del valor de alquileres queda en la corporación</p>
                            </div>
                            <div className="text-3xl font-bold text-teal-600">${statistics.totalCorpoNet.toLocaleString()}</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Revenue Chart */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            Ingresos Diarios (Últimos 30 Días)
                        </CardTitle>
                        <CardDescription>Comparativa de ingresos por pacientes y alquileres</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statistics.dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPacientes" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="colorAlquileres" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                        }}
                                        formatter={(value: any) => `$${value.toLocaleString()}`}
                                    />
                                    <Area type="monotone" dataKey="pacientes" name="Pacientes" stroke="#10b981" fillOpacity={1} fill="url(#colorPacientes)" />
                                    <Area type="monotone" dataKey="alquileres" name="Alquileres" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAlquileres)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Methods Pie Chart */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChart className="h-5 w-5 text-purple-600" />
                            Métodos de Pago
                        </CardTitle>
                        <CardDescription>Distribución por método</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Detailed Tables */}
            <Tabs defaultValue="movimientos" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="movimientos" className="gap-2">
                        <List className="h-4 w-4" /> Movimientos
                    </TabsTrigger>
                    <TabsTrigger value="doctors" className="gap-2">
                        <Stethoscope className="h-4 w-4" /> Pagos a Médicos
                    </TabsTrigger>
                    <TabsTrigger value="historial" className="gap-2">
                        <History className="h-4 w-4" /> Historial de Cortes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="movimientos" className="mt-4">
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-slate-50 via-white to-teal-50/30 border-b border-slate-200">
                            <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                                <List className="h-5 w-5 text-teal-600" />
                                Todas las Entradas de Dinero
                            </CardTitle>
                            <CardDescription>
                                Historial completo de pagos de citas y alquileres ordenado por fecha
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-20 text-muted-foreground">
                                    <Clock className="mr-3 h-6 w-6 animate-spin" />
                                    <span className="text-lg">Cargando movimientos...</span>
                                </div>
                            ) : allMovements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                        <DollarSign className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700">Sin movimientos registrados</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-2">
                                        Los pagos de citas y alquileres aparecerán aquí cuando se procesen.
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-lg overflow-hidden overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="font-semibold">ID</TableHead>
                                                <TableHead className="font-semibold">Fecha</TableHead>
                                                <TableHead className="font-semibold">Concepto</TableHead>
                                                <TableHead className="font-semibold">Tipo</TableHead>
                                                <TableHead className="font-semibold">Método</TableHead>
                                                <TableHead className="text-right font-semibold">Monto</TableHead>
                                                <TableHead className="font-semibold">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {allMovements.map((mov) => (
                                                <TableRow key={mov.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-mono text-xs text-slate-600">{mov.id}</TableCell>
                                                    <TableCell className="text-slate-700">{mov.date}</TableCell>
                                                    <TableCell className="font-medium text-slate-800">{mov.concept}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={mov.type === 'Alquiler' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-teal-50 text-teal-700 border-teal-200'}>
                                                            {mov.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600">{mov.method}</TableCell>
                                                    <TableCell className="text-right font-bold text-teal-700">
                                                        ${mov.amount.toLocaleString('es-CO')}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(mov.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="doctors" className="mt-4">
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white border-b border-teal-100">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2 text-teal-900">
                                        <Stethoscope className="h-5 w-5 text-teal-600" />
                                        Liquidación Semanal a Médicos
                                    </CardTitle>
                                    <CardDescription className="mt-1 text-slate-600">
                                        Cortes semanales cada Lunes: <span className="font-medium text-teal-700">Valor de citas - Alquiler de consultorio</span>
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-teal-200 shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedWeek(subDays(selectedWeek, 7))}
                                        className="hover:bg-teal-50"
                                    >
                                        <ChevronRight className="h-4 w-4 rotate-180" />
                                    </Button>
                                    <div className="flex items-center gap-2 px-3 text-sm font-medium">
                                        <Calendar className="h-4 w-4 text-teal-600" />
                                        <span className="text-slate-700">
                                            Semana: {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'd MMM', { locale: es })}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                                        disabled={selectedWeek > new Date()}
                                        className="hover:bg-teal-50"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Explicación del ciclo de pagos */}
                            <div className="mb-6 bg-gradient-to-r from-slate-50 to-teal-50/30 rounded-xl p-4 border border-slate-200">
                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-teal-600" />
                                    Ciclo de Pagos
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                                        <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">1</div>
                                        <div>
                                            <p className="font-medium text-slate-700">Paciente paga</p>
                                            <p className="text-slate-500">El valor total de la cita</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                                        <div className="h-5 w-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[10px]">2</div>
                                        <div>
                                            <p className="font-medium text-slate-700">Se descuenta alquiler</p>
                                            <p className="text-slate-500">Virtual: $10,000 | Físico: tarifa/hora</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-100">
                                        <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</div>
                                        <div>
                                            <p className="font-medium text-slate-700">Médico recibe</p>
                                            <p className="text-slate-500">Valor cita - alquiler (cada Lunes)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Actions Bar */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="text-sm text-slate-600 flex items-center gap-2">
                                        <span className="text-slate-500">Estado:</span>
                                        <Badge 
                                            variant={weeklyPayouts.length > 0 ? 'secondary' : 'outline'}
                                            className={weeklyPayouts.length > 0 
                                                ? weeklyPayouts.some(p => p.status === 'pending') 
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                : 'bg-slate-100 text-slate-600'
                                            }
                                        >
                                            {weeklyPayouts.length > 0 ? (
                                                weeklyPayouts.some(p => p.status === 'pending') ? 'Pendiente de Pago' : 'Procesado'
                                            ) : 'No generado'}
                                        </Badge>
                                    </div>
                                    {!isMonday && (
                                        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-200">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            Pagos habilitados solo los Lunes
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    {processedPayouts.length > 0 && (
                                        <Button
                                            variant="outline"
                                            onClick={handleExportCSV}
                                            className="border-slate-200 text-slate-700 hover:bg-slate-50"
                                            title="Descargar reporte en CSV"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Exportar
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => setShowGenerateConfirm(true)}
                                        disabled={generatingPayouts || weeklyPayouts.length > 0}
                                        className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white shadow-md"
                                    >
                                        {generatingPayouts ? (
                                            <>
                                                <Clock className="mr-2 h-4 w-4 animate-spin" />
                                                Calculando...
                                            </>
                                        ) : (
                                            <>
                                                <History className="mr-2 h-4 w-4" />
                                                Generar Corte
                                            </>
                                        )}
                                    </Button>
                                    {weeklyPayouts.some(p => p.status === 'pending') && (
                                        <Button
                                            onClick={() => setShowPayAllConfirm(true)}
                                            disabled={!isMonday}
                                            className={`${!isMonday ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'}`}
                                            title={!isMonday ? 'El pago masivo solo está disponible los lunes' : 'Pagar todo'}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Pagar Todo
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Payouts Table */}
                            {loading ? (
                                <div className="flex items-center justify-center py-20 text-muted-foreground">
                                    <Clock className="mr-3 h-6 w-6 animate-spin" />
                                    <span className="text-lg">Cargando información...</span>
                                </div>
                            ) : weeklyPayouts.length > 0 ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Médico</TableHead>
                                                <TableHead className="text-center">Citas</TableHead>
                                                <TableHead className="text-right">Honorarios</TableHead>
                                                <TableHead className="text-right">Deducciones</TableHead>
                                                <TableHead className="text-right">Neto a Pagar</TableHead>
                                                <TableHead className="text-center">Estado</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {processedPayouts.map((payout: any) => (
                                                <TableRow key={payout.doctor_id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                                                {(doctorNames[payout.doctor_id] || 'Dr').substring(0, 2).toUpperCase()}
                                                            </div>
                                                            {doctorNames[payout.doctor_id] || 'Desconocido'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                            {payout.count}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-slate-600">
                                                        ${(Number(payout.consultation_fee || 0) * payout.count).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-red-600">
                                                        -${(Number(payout.room_rental_cost || 0) * payout.count + Number(payout.platform_commission || 0) * payout.count).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-emerald-600 text-lg">
                                                        ${payout.total_amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {payout.status === 'processed' ? (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                Pagado
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                                Pendiente
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setViewingPayoutDetail(payout)}
                                                                className="h-8 px-2 border-slate-200 text-slate-600 hover:text-indigo-600"
                                                                title="Ver Pagaré / Detalle"
                                                            >
                                                                <FileText className="h-4 w-4 mr-1" />
                                                                Detalle
                                                            </Button>
                                                            {payout.status === 'processed' ? (
                                                                <div className="flex items-center text-emerald-600 text-xs font-medium px-2 py-1 bg-emerald-50 rounded-md border border-emerald-100">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Pagado
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    disabled={!isMonday}
                                                                    onClick={() => handleProcessPayout(payout.payout_ids)}
                                                                    className={`${!isMonday ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} h - 8 px - 3`}
                                                                >
                                                                    <DollarSign className="h-4 w-4 mr-1" /> Pagar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : doctorPayouts.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start gap-3">
                                        <Clock className="h-5 w-5 text-teal-600 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-teal-800">Vista Previa - Corte no generado</h4>
                                            <p className="text-xs text-teal-600 mt-1">
                                                Estos valores se actualizan en tiempo real según las citas pagadas de la semana.
                                                Para congelar los montos y proceder al pago, haga clic en <strong>"Generar Corte"</strong>.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Resumen de totales */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                            <p className="text-xs text-blue-600 font-medium">Total Citas</p>
                                            <p className="text-xl font-bold text-blue-700">
                                                {doctorPayouts.reduce((sum, p) => sum + p.total_appointments, 0)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                            <p className="text-xs text-slate-600 font-medium">Honorarios Brutos</p>
                                            <p className="text-xl font-bold text-slate-700">
                                                ${doctorPayouts.reduce((sum, p) => sum + p.appointment_revenue, 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                            <p className="text-xs text-amber-600 font-medium">Alquileres</p>
                                            <p className="text-xl font-bold text-amber-700">
                                                -${doctorPayouts.reduce((sum, p) => sum + p.rental_costs, 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                                            <p className="text-xs text-emerald-600 font-medium">Neto a Pagar</p>
                                            <p className="text-xl font-bold text-emerald-700">
                                                ${doctorPayouts.reduce((sum, p) => sum + p.net_payout, 0).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="font-semibold">Médico</TableHead>
                                                    <TableHead className="text-center font-semibold">Citas</TableHead>
                                                    <TableHead className="text-right font-semibold">Honorarios</TableHead>
                                                    <TableHead className="text-right font-semibold">Alquiler Consultorio</TableHead>
                                                    <TableHead className="text-right font-semibold">Neto Estimado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {doctorPayouts.filter(p => p.total_appointments > 0).map((payout) => (
                                                    <TableRow key={payout.doctor_id} className="hover:bg-slate-50/50">
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center text-teal-700 font-bold text-sm border border-teal-200">
                                                                    {(payout.doctor_name || 'Dr').substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <span className="text-slate-800">{payout.doctor_name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="secondary" className="bg-teal-100 text-teal-700 font-bold">
                                                                {payout.total_appointments}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-slate-700">
                                                            ${payout.appointment_revenue.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right text-amber-600 font-medium">
                                                            -${payout.rental_costs.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-lg font-bold text-emerald-600">
                                                                ${payout.net_payout.toLocaleString()}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {doctorPayouts.filter(p => p.total_appointments > 0).length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                            No hay citas pagadas en esta semana
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                        <Calendar className="h-8 w-8 text-indigo-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700">Sin médicos registrados</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-2">
                                        No se encontraron perfiles de médicos activos en el sistema.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="historial" className="mt-4">
                    <Card className="border-slate-200 shadow-lg">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                                <History className="h-5 w-5 text-indigo-600" />
                                Historial de Cortes Pagados
                            </CardTitle>
                            <CardDescription>
                                Registro histórico de liquidaciones enviadas a los especialistas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-20 text-muted-foreground">
                                    <Clock className="mr-3 h-6 w-6 animate-spin" />
                                    <span className="text-lg">Cargando historial...</span>
                                </div>
                            ) : payoutHistory.length > 0 ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead>Semana del Corte</TableHead>
                                                <TableHead className="text-center">Médicos Pagados</TableHead>
                                                <TableHead className="text-right">Total Liquidado</TableHead>
                                                <TableHead className="text-center">Estado General</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payoutHistory.map((week: any) => (
                                                <TableRow key={week.week_start} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-slate-500" />
                                                            {format(parseISO(week.week_start), "d 'de' MMMM, yyyy", { locale: es })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                                            {week.count} Especialistas
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-slate-700">
                                                        ${week.total_paid.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {week.status === 'processed' ? (
                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Completado
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                                <Clock className="h-3 w-3 mr-1" /> Pendiente
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                                            onClick={() => {
                                                                // Convert string date (YYYY-MM-DD) back to Date object adjusted for timezone
                                                                // Or just parseISO which is safer
                                                                const date = parseISO(week.week_start);
                                                                // Need to ensure we're finding the right "start of week" that matches expected state
                                                                // Since week_start is already the monday, we can use it directly
                                                                setSelectedWeek(date);
                                                                setActiveTab('doctors');
                                                            }}
                                                        >
                                                            Ver Detalle <ArrowUpRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                        <History className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700">Sin historial disponible</h3>
                                    <p className="text-sm text-slate-500 max-w-sm mt-2">
                                        Aún no se han generado cortes de pago en el sistema.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >

            {/* Confirmation Dialog for Generation */}
            < Dialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm} >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-indigo-900">
                            <AlertCircle className="h-6 w-6 text-amber-500" />
                            ¿Generar corte semanal?
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Esta acción calculará los honorarios netos de todos los médicos para la semana seleccionada:
                            <div className="mt-2 p-3 bg-indigo-50 rounded-lg text-indigo-700 text-xs leading-relaxed">
                                <div className="font-bold mb-1 underline">Se aplicará:</div>
                                <ul className="list-disc ml-4 space-y-1">
                                    <li>Cobro de consulta (pago del paciente)</li>
                                    <li>Deducción por consultorio físico (por hora)</li>
                                    <li>Deducción por consultorio virtual (tarifa fija $10,000)</li>
                                    <li>Comisión de la plataforma</li>
                                </ul>
                            </div>
                            <div className="mt-3 text-slate-600">
                                Una vez generado, el corte será inmutable hasta procesar los pagos.
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowGenerateConfirm(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleGeneratePayouts}
                            disabled={generatingPayouts}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Confirmar y Generar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Pagaré / Detail Modal */}
            < Dialog open={!!viewingPayoutDetail} onOpenChange={() => setViewingPayoutDetail(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl text-indigo-900">
                            <FileText className="h-6 w-6 text-indigo-600" />
                            Pagaré de Liquidación
                        </DialogTitle>
                        <DialogDescription>
                            Detalle de honorarios para <strong>{viewingPayoutDetail ? doctorNames[viewingPayoutDetail.doctor_id] : ''}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {viewingPayoutDetail && (
                        <div className="space-y-6 pt-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Citas</div>
                                    <div className="text-2xl font-bold">{viewingPayoutDetail.count}</div>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                    <div className="text-xs text-emerald-600 uppercase tracking-wider mb-1">Neto a Transferir</div>
                                    <div className="text-2xl font-bold text-emerald-700">${viewingPayoutDetail.total_amount.toLocaleString()}</div>
                                </div>
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                                    <div className="text-xs text-indigo-600 uppercase tracking-wider mb-1">Estado</div>
                                    <Badge variant="outline" className={viewingPayoutDetail.status === 'processed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                                        {viewingPayoutDetail.status === 'processed' ? 'Pagado' : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Bank Account Info */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Building2 className="h-3.5 w-3.5" /> Datos para Transferencia
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium">BANCO</div>
                                        <div className="text-sm font-semibold text-slate-700">{doctorProfiles[viewingPayoutDetail.doctor_id]?.bank_name || 'No registrado'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium">NÚMERO DE CUENTA</div>
                                        <div className="text-sm font-semibold text-slate-700 font-mono">{doctorProfiles[viewingPayoutDetail.doctor_id]?.account_number || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium">TIPO DE CUENTA</div>
                                        <div className="text-sm font-bold text-indigo-600">{doctorProfiles[viewingPayoutDetail.doctor_id]?.account_type || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-medium font-bold">TOTAL A PAGAR</div>
                                        <div className="text-sm font-bold text-emerald-600">${viewingPayoutDetail.total_amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="text-xs">Detalle / Cita</TableHead>
                                            <TableHead className="text-right text-xs">Consulta</TableHead>
                                            <TableHead className="text-right text-xs">Alquiler</TableHead>
                                            <TableHead className="text-right text-xs">Comisión</TableHead>
                                            <TableHead className="text-right text-xs font-bold">Neto</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {weeklyPayouts
                                            .filter(p => p.doctor_id === viewingPayoutDetail.doctor_id)
                                            .map((item, idx) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-xs">
                                                        {item.appointment_id ? (
                                                            <div>
                                                                <div className="font-medium">Cita #{idx + 1}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">ID: {item.appointment_id.substring(0, 8)}...</div>
                                                            </div>
                                                        ) : 'Cita Genérica'}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-slate-600">
                                                        ${Number(item.consultation_fee).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-red-500">
                                                        -${Number(item.room_rental_cost).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-red-500 font-medium">
                                                        -${Number(item.platform_commission).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-bold text-emerald-600">
                                                        ${Number(item.doctor_payout).toLocaleString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3 items-start">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800 leading-relaxed">
                                    <p className="font-bold mb-1">Nota legal:</p>
                                    Este documento constituye un registro de liquidación de servicios profesionales. El pago neto corresponde al valor recaudado de los pacientes menos los gastos operativos pactados por uso de espacios y mantenimiento de la plataforma.
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setViewingPayoutDetail(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Confirmation Dialog for Mass Payment */}
            < Dialog open={showPayAllConfirm} onOpenChange={setShowPayAllConfirm} >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl text-emerald-900">
                            <DollarSign className="h-6 w-6 text-emerald-500" />
                            ¿Procesar todos los pagos?
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Se marcarán como <strong>"Pagados"</strong> todos los honorarios pendientes de la semana para todos los especialistas.
                            <div className="mt-3 text-slate-600">
                                Asegúrate de haber realizado las transferencias bancarias correspondientes antes de confirmar en el sistema.
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowPayAllConfirm(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleProcessAllPayouts}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            Confirmar Pago Masivo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Arime Invoice Dialog */}
            <Dialog open={showArimeInvoice} onOpenChange={setShowArimeInvoice}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl text-purple-900">
                            <FileText className="h-6 w-6 text-purple-600" />
                            Factura de Cobro - Aríme Software
                        </DialogTitle>
                        <DialogDescription>
                            Comisión por alquileres de consultorios y salones - Semana del {arimeInvoiceData?.weekStart} al {arimeInvoiceData?.weekEnd}
                        </DialogDescription>
                    </DialogHeader>

                    {arimeInvoiceData && (
                        <div className="space-y-6 pt-4">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                <div>
                                    <div className="text-xs text-purple-600 uppercase tracking-wider mb-1">Período</div>
                                    <div className="text-sm font-bold text-purple-900">
                                        {arimeInvoiceData.weekStart} - {arimeInvoiceData.weekEnd}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha de Generación</div>
                                    <div className="text-sm font-semibold text-purple-700">{arimeInvoiceData.generatedAt}</div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Alquileres</div>
                                    <div className="text-2xl font-bold text-slate-900">${arimeInvoiceData.totalRentalIncome.toLocaleString()}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Implícitos: ${arimeInvoiceData.totalImplicitRentals.toLocaleString()}<br />
                                        Directos: ${arimeInvoiceData.totalDirectRentals.toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                                    <div className="text-xs text-purple-600 uppercase tracking-wider mb-1">Comisión ({arimeInvoiceData.commissionRate}%)</div>
                                    <div className="text-2xl font-bold text-purple-900">${arimeInvoiceData.arimeCommission.toLocaleString()}</div>
                                    <div className="text-xs text-purple-600 mt-1">A favor de Aríme Software</div>
                                </div>
                                <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                                    <div className="text-xs text-teal-600 uppercase tracking-wider mb-1">CorpoOriente Neto</div>
                                    <div className="text-2xl font-bold text-teal-700">${arimeInvoiceData.corpoNet.toLocaleString()}</div>
                                    <div className="text-xs text-teal-600 mt-1">{100 - arimeInvoiceData.commissionRate}% del total</div>
                                </div>
                            </div>

                            {/* Rental Details Table */}
                            <div className="border rounded-xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="text-xs">Tipo</TableHead>
                                            <TableHead className="text-xs">Espacio</TableHead>
                                            <TableHead className="text-xs">Tipo Espacio</TableHead>
                                            <TableHead className="text-xs">Duración</TableHead>
                                            <TableHead className="text-xs text-right">Costo</TableHead>
                                            <TableHead className="text-xs">Fecha</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {arimeInvoiceData.rentalDetails.map((detail: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="text-xs">
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-700">
                                                        {detail.tipo}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">{detail.espacio}</TableCell>
                                                <TableCell className="text-xs">
                                                    <Badge variant={detail.tipoEspacio === 'Virtual' ? 'secondary' : 'default'}>
                                                        {detail.tipoEspacio}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs">{detail.duracion}</TableCell>
                                                <TableCell className="text-xs text-right font-bold">
                                                    ${detail.costo.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">{detail.fecha}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Total Summary */}
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-purple-700 font-semibold">Total a Cobrar a CorpoOriente</div>
                                        <div className="text-xs text-purple-600 mt-1">Comisión del {arimeInvoiceData.commissionRate}% sobre alquileres</div>
                                    </div>
                                    <div className="text-3xl font-bold text-purple-900">
                                        ${arimeInvoiceData.arimeCommission.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3 items-start">
                                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-800 leading-relaxed">
                                    <p className="font-bold mb-1">Nota importante:</p>
                                    Esta factura incluye todos los alquileres de consultorios físicos y virtuales, así como salones, correspondientes a la semana indicada. El monto corresponde al {arimeInvoiceData.commissionRate}% del total de ingresos por alquileres.
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (arimeInvoiceData) {
                                    // Generar CSV de la factura
                                    const csvHeaders = ["Tipo", "Espacio", "Tipo Espacio", "Duración", "Costo", "Fecha"];
                                    const csvRows = arimeInvoiceData.rentalDetails.map((d: any) => [
                                        d.tipo,
                                        d.espacio,
                                        d.tipoEspacio,
                                        d.duracion,
                                        d.costo,
                                        d.fecha
                                    ]);
                                    const csvContent = [
                                        csvHeaders.join(','),
                                        ...csvRows.map((row: any[]) => row.join(',')),
                                        '',
                                        `Total Alquileres,${arimeInvoiceData.totalRentalIncome}`,
                                        `Comisión (${arimeInvoiceData.commissionRate}%),${arimeInvoiceData.arimeCommission}`,
                                        `CorpoOriente Neto,${arimeInvoiceData.corpoNet}`
                                    ].join('\n');

                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.setAttribute('href', url);
                                    link.setAttribute('download', `factura_arime_${arimeInvoiceData.weekStart.replace(/\//g, '-')}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    toast.success('Factura descargada exitosamente');
                                }
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar CSV
                        </Button>
                        <Button onClick={() => setShowArimeInvoice(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
};
