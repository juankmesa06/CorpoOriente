import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, startOfDay, endOfDay, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, Loader2 } from 'lucide-react';

export const DoctorWeeklyStats = ({ className }: { className?: string }) => {
    const { user } = useAuth();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchWeeklyData();
        }
    }, [user]);

    const fetchWeeklyData = async () => {
        try {
            const { data: doctorProfile } = await supabase
                .from('doctor_profiles')
                .select('id')
                .eq('user_id', user!.id)
                .single();

            if (!doctorProfile) return;

            const today = new Date();
            const sevenDaysAgo = subDays(today, 6); // Last 7 days including today

            const { data: appointments } = await supabase
                .from('appointments')
                .select('start_time, status')
                .eq('doctor_id', doctorProfile.id)
                .gte('start_time', startOfDay(sevenDaysAgo).toISOString())
                .lte('start_time', endOfDay(today).toISOString());

            // Process data for the chart
            const chartData = [];
            for (let i = 0; i < 7; i++) {
                const date = addDays(sevenDaysAgo, i);
                const dayAppointments = appointments?.filter(apt =>
                    isSameDay(new Date(apt.start_time), date)
                ) || [];

                const completed = dayAppointments.filter(a => a.status === 'completed').length;
                const scheduled = dayAppointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;

                chartData.push({
                    name: format(date, 'EEE', { locale: es }).charAt(0).toUpperCase() + format(date, 'EEE', { locale: es }).slice(1), // Mon, Tue
                    fullDate: format(date, 'd MMM', { locale: es }),
                    completed,
                    scheduled,
                    total: completed + scheduled
                });
            }

            setData(chartData);
        } catch (error) {
            console.error('Error fetching weekly stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-100 shadow-md rounded-lg text-xs">
                    <p className="font-bold text-slate-700 mb-1">{payload[0].payload.fullDate}</p>
                    <div className="space-y-1">
                        <div className="text-teal-600 flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                            Realizadas: {payload[0].value}
                        </div>
                        <div className="text-indigo-400 flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-300" />
                            Programadas: {payload[1].value}
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={`bg-white border-primary/20 shadow-sm ${className || ''}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg text-secondary flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" />
                    Actividad Semanal
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full mt-2">
                    {loading ? (
                        <div className="h-full w-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#64748b' }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar
                                    dataKey="completed"
                                    name="Realizadas"
                                    stackId="a"
                                    fill="#14b8a6"
                                    radius={[0, 0, 4, 4]}
                                    barSize={20}
                                />
                                <Bar
                                    dataKey="scheduled"
                                    name="Programadas"
                                    stackId="a"
                                    fill="#a5b4fc"
                                    radius={[4, 4, 0, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
