import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, CreditCard, Wallet } from 'lucide-react';

const mockData = [
    { name: 'Ene', income: 4000 },
    { name: 'Feb', income: 3000 },
    { name: 'Mar', income: 2000 },
    { name: 'Abr', income: 2780 },
    { name: 'May', income: 1890 },
    { name: 'Jun', income: 2390 },
];

export const AdminAccountingReports = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-green-50 border-green-100">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-green-700">Ingresos Totales (Mes)</p>
                            <DollarSign className="h-4 w-4 text-green-700" />
                        </div>
                        <div className="text-2xl font-bold text-green-900">$12,345.00</div>
                        <p className="text-xs text-green-600 mt-1">+15% vs mes anterior</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Citas Pagadas</p>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">145</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-muted-foreground">Alquileres Activos</p>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">24</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Resumen Financiero Semestral
                    </CardTitle>
                    <CardDescription>Comportamiento de ingresos brutos por mes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => [`$${value}`, 'Ingresos']}
                                />
                                <Bar dataKey="income" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
