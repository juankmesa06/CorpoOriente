import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Building2, Plus, Edit, Trash2, Video, Users,
    Image as ImageIcon, X, Loader2, DollarSign,
    Calendar, Stethoscope, List, CheckCircle2, Clock, Activity
} from 'lucide-react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from 'sonner';
import { RoomCalendarView } from './RoomCalendarView';

interface Room {
    id: string;
    name: string;
    description: string | null;
    room_type: 'physical' | 'event' | 'virtual';
    capacity: number;
    is_active: boolean;
    photos: string[] | null;
    price_per_hour: number | null;
    price_per_session: number | null;
    organization_id?: string;
    created_at?: string;
    updated_at?: string;
}

interface Occupancy {
    [key: string]: {
        type: 'appointment' | 'rental';
        doctorName: string;
        patientName?: string;
        endTime: string;
    } | null;
}

export const RoomManagement = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [occupancy, setOccupancy] = useState<Occupancy>({});
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('grid');
    const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
    const [fetchingAppointments, setFetchingAppointments] = useState(false);
    const [recentRentals, setRecentRentals] = useState<any[]>([]);
    const [fetchingRentals, setFetchingRentals] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>("all");

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        room_type: 'physical' as Room['room_type'],
        capacity: 1,
        is_active: true,
        photos: [] as string[],
        price_per_hour: 0,
        price_per_session: 0
    });

    const loadRoomsAndOccupancy = async () => {
        setLoading(true);
        try {
            const { data: roomsData, error: roomsError } = await supabase
                .from('rooms')
                .select('*')
                .order('name', { ascending: true });

            if (roomsError) throw roomsError;
            setRooms((roomsData as any) || []);

            // Fetch current occupancy (simplified for MVP)
            const now = new Date().toISOString();

            // Current appointments
            const { data: apts } = await supabase
                .from('appointments')
                .select('id, start_time, end_time, rental_id, room_id, doctor_id, patient_id')
                .lte('start_time', now)
                .gte('end_time', now);

            // Current rentals
            const { data: rentals } = await supabase
                .from('room_rentals')
                .select('id, room_id, end_time, renter_name')
                .lte('start_time', now)
                .gte('end_time', now);

            // Fetch profiles for names manually to avoid join complexity
            const doctorIds = Array.from(new Set([
                ...(apts?.map(a => a.doctor_id) || [])
            ])).filter(Boolean);

            const patientIds = Array.from(new Set([
                ...(apts?.map(a => a.patient_id) || [])
            ])).filter(Boolean);

            const { data: docProfiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', doctorIds);

            const { data: patProfiles } = await supabase
                .from('profiles')
                .select('user_id, full_name')
                .in('user_id', patientIds);

            const typedRentals = rentals as any[];
            const occData: Occupancy = {};

            typedRentals?.forEach(r => {
                occData[r.room_id] = {
                    type: 'rental',
                    doctorName: r.renter_name || 'Desconocido',
                    endTime: r.end_time
                };
            });

            // If appointment has a rental_id or room_id, it's occupying a room
            const typedApts = apts as any[];
            typedApts?.forEach(a => {
                const room_id = a.room_id || typedRentals?.find(r => r.id === a.rental_id)?.room_id;
                if (room_id) {
                    const docName = docProfiles?.find(p => p.user_id === a.doctor_id)?.full_name || 'Dr. Desconocido';
                    const patName = patProfiles?.find(p => p.user_id === a.patient_id)?.full_name;

                    occData[room_id] = {
                        type: 'appointment',
                        doctorName: docName,
                        patientName: patName,
                        endTime: a.end_time
                    };
                }
            });

            setOccupancy(occData || {});

            // Also fetch the full list of appointments and recent rentals
            await Promise.all([
                fetchAppointments(),
                fetchRecentRentals()
            ]);
        } catch (error: any) {
            console.error('Error in loadRoomsAndOccupancy:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoomsAndOccupancy();

        // Auto-refresh every 30 seconds
        const intervalId = setInterval(() => {
            if (!loading && !fetchingAppointments) {
                loadRoomsAndOccupancy();
            }
        }, 30000);

        return () => clearInterval(intervalId);
    }, [typeFilter]);

    const fetchAppointments = async () => {
        setFetchingAppointments(true);
        try {
            // 1. Fetch raw appointments using wildcard to avoid "column does not exist" errors
            let query = supabase
                .from('appointments')
                .select('*')
                .in('status', ['confirmed', 'completed']) // Filter confirmed only
                .order('start_time', { ascending: false });

            if (typeFilter === "virtual") query = query.eq('is_virtual', true);
            if (typeFilter === "presencial") query = query.eq('is_virtual', false);

            const { data: apts, error: aptError } = await query;
            if (aptError) throw aptError;

            if (!apts || apts.length === 0) {
                setAppointmentsList([]);
                return;
            }

            // 2. Collect IDs (safely handling potential missing columns)
            const appointmentIds = apts.map(a => a.id);
            const patientIds = [...new Set(apts.map(a => a.patient_id).filter(Boolean))];
            const doctorIds = [...new Set(apts.map(a => a.doctor_id).filter(Boolean))];

            // Check if room_id and rental_id exist in the returned data
            const roomIdsFromApts = apts.map((a: any) => a.room_id).filter(Boolean);
            const rentalIds = apts.map((a: any) => a.rental_id).filter(Boolean);

            // 3. Fetch related data in parallel
            const [
                { data: patientProfiles },
                { data: doctorProfiles },
                { data: payments },
                { data: rentals },
                { data: directRooms }
            ] = await Promise.all([
                patientIds.length > 0 ? supabase.from('patient_profiles').select('id, user_id').in('id', patientIds) : Promise.resolve({ data: [] }),
                doctorIds.length > 0 ? supabase.from('doctor_profiles').select('id, user_id').in('id', doctorIds) : Promise.resolve({ data: [] }),
                supabase.from('payments').select('appointment_id, amount, status').in('appointment_id', appointmentIds).eq('status', 'paid'), // Only fetch paid records
                rentalIds.length > 0 ? supabase.from('room_rentals').select('id, room_id').in('id', rentalIds) : Promise.resolve({ data: [] }),
                roomIdsFromApts.length > 0 ? supabase.from('rooms').select('id, name').in('id', roomIdsFromApts) : Promise.resolve({ data: [] })
            ]);

            // 4. Fetch Names from Profiles (using user_ids)
            const pUserIds = (patientProfiles as any[])?.map((p: any) => p.user_id) || [];
            const dUserIds = (doctorProfiles as any[])?.map((d: any) => d.user_id) || [];
            const allUserIds = [...new Set([...pUserIds, ...dUserIds])];

            let userProfiles: any[] = [];
            if (allUserIds.length > 0) {
                const { data } = await supabase.from('profiles').select('user_id, full_name').in('user_id', allUserIds);
                userProfiles = data || [];
            }

            // 5. Fetch Rooms for Rentals (if any rentals linked)
            const rentalRoomIds = (rentals as any[])?.map((r: any) => r.room_id).filter(Boolean) || [];
            const missingRoomIds = rentalRoomIds.filter(id => !(directRooms as any[])?.find((r: any) => r.id === id));

            let extraRooms: any[] = [];
            if (missingRoomIds.length > 0) {
                const { data } = await supabase.from('rooms').select('id, name').in('id', missingRoomIds);
                extraRooms = data || [];
            }

            const allRooms = [...(directRooms || []), ...extraRooms];

            // 6. Stitch and Flatten Data for Display
            const processed = apts.map((apt: any) => {
                // Find Patient Name
                const pProfile = (patientProfiles as any[])?.find((p: any) => p.id === apt.patient_id);
                const pName = pProfile ? userProfiles.find(u => u.user_id === pProfile.user_id)?.full_name : 'Desconocido';

                // Find Doctor Name
                const dProfile = (doctorProfiles as any[])?.find((d: any) => d.id === apt.doctor_id);
                const dName = dProfile ? userProfiles.find(u => u.user_id === dProfile.user_id)?.full_name : 'Desconocido';

                // Find Payment
                const payment = (payments as any[])?.find((p: any) => p.appointment_id === apt.id);
                const paymentStatus = payment?.status || 'pending';
                const paymentAmount = payment?.amount || 0;

                // Find Room Name
                let roomName = '---';
                if (apt.room_id) {
                    const r = allRooms.find((r: any) => r.id === apt.room_id);
                    if (r) roomName = r.name;
                } else if (apt.rental_id) {
                    const rental = (rentals as any[])?.find((r: any) => r.id === apt.rental_id);
                    if (rental) {
                        const r = allRooms.find((room: any) => room.id === rental.room_id);
                        if (r) roomName = r.name;
                    }
                }

                // Return a flat structure compatible with our display logic
                return {
                    ...apt,
                    patient_name: pName,
                    doctor_name: dName,
                    room_name: roomName,
                    payment_status: paymentStatus,
                    total_amount: paymentAmount,
                    // Keep original objects just in case
                    payments: payment ? [payment] : []
                };
            });

            // Filter to show ONLY paid transactions as requested
            const paidAppointments = processed.filter((apt: any) => apt.payment_status === 'paid');
            setAppointmentsList(paidAppointments);

        } catch (error: any) {
            console.error('Error fetching appointments:', error);
            toast.error("Error al cargar citas: " + (error.message || "Error desconocido"));
        } finally {
            setFetchingAppointments(false);
        }
    };

    const handleDeleteAppointment = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar permanentemente esta cita? Esta acción no se puede deshacer.')) return;

        try {
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Cita eliminada permanentemente');
            fetchAppointments();
        } catch (error: any) {
            console.error('Error deleting appointment:', error);
            toast.error('Error al eliminar la cita: ' + error.message);
        }
    };

    const handleCancelAppointment = async (id: string) => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

            toast.success('Cita cancelada correctamente');
            fetchAppointments();
        } catch (error: any) {
            console.error('Error cancelling appointment:', error);
            toast.error('Error al cancelar la cita: ' + error.message);
        }
    };

    const fetchRecentRentals = async () => {
        setFetchingRentals(true);
        try {
            const { data, error } = await supabase
                .from('room_rentals')
                .select(`
                    id,
                    start_time,
                    end_time,
                    status,
                    total_price,
                    renter_name,
                    rooms ( name )
                `)
                .order('created_at', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecentRentals(data || []);
        } catch (error: any) {
            console.error('Error fetching recent rentals:', error);
        } finally {
            setFetchingRentals(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            room_type: 'physical',
            capacity: 1,
            is_active: true,
            photos: [],
            price_per_hour: 0,
            price_per_session: 0
        });
        setEditingRoom(null);
    };

    const handleEdit = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            description: room.description || '',
            room_type: room.room_type,
            capacity: room.capacity,
            is_active: room.is_active,
            photos: room.photos || [],
            price_per_hour: room.price_per_hour || 0,
            price_per_session: room.price_per_session || 0
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        const roomData = {
            name: formData.name,
            description: formData.description,
            room_type: formData.room_type,
            capacity: formData.capacity,
            is_active: formData.is_active,
            photos: formData.photos,
            price_per_hour: formData.price_per_hour,
            price_per_session: formData.price_per_session
        };

        try {
            if (editingRoom) {
                const { error } = await supabase
                    .from('rooms')
                    .update(roomData)
                    .eq('id', editingRoom.id);
                if (error) throw error;
                toast.success('Espacio actualizado');
            } else {
                const { error } = await supabase
                    .from('rooms')
                    .insert(roomData);
                if (error) throw error;
                toast.success('Espacio creado');
            }
            setIsDialogOpen(false);
            resetForm();
            loadRoomsAndOccupancy();
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este espacio?')) return;
        try {
            const { error } = await supabase.from('rooms').delete().eq('id', id);
            if (error) throw error;
            toast.success('Espacio eliminado');
            loadRoomsAndOccupancy();
        } catch (error: any) {
            toast.error('Error al eliminar');
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `room-photos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('rooms')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('rooms')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                photos: [...prev.photos, publicUrl]
            }));
            toast.success('Foto subida');
        } catch (error: any) {
            toast.error('Error al subir foto');
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (url: string) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter(p => p !== url)
        }));
    };

    const getRoomTypeBadge = (type: string) => {
        switch (type) {
            case 'physical': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">Físico</Badge>;
            case 'event': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">Salón</Badge>;
            case 'virtual': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100">Virtual</Badge>;
            default: return <Badge variant="outline">{type}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="grid" onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                    <TabsList className="bg-slate-100/50 p-1">
                        <TabsTrigger value="grid" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Building2 className="h-4 w-4 mr-2" /> Espacios
                        </TabsTrigger>
                        <TabsTrigger value="occupancy" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Calendar className="h-4 w-4 mr-2" /> Alquileres / Uso
                        </TabsTrigger>
                        <TabsTrigger value="list" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <List className="h-4 w-4 mr-2" /> Listado de Citas
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        {activeTab === 'list' && (
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[160px] h-9 bg-white">
                                    <SelectValue placeholder="Filtrar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los tipos</SelectItem>
                                    <SelectItem value="virtual">Virtual</SelectItem>
                                    <SelectItem value="physical">Físico</SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) resetForm();
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-teal-600 hover:bg-teal-700 shadow-md transition-all active:scale-95 h-9 text-white">
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Espacio
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
                                <DialogHeader className="border-b pb-4 mb-2">
                                    <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                        <Building2 className="h-6 w-6 text-teal-600" />
                                        {editingRoom ? 'Editar Espacio' : 'Crear Nuevo Espacio'}
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-600">
                                        {editingRoom ? 'Modifica la información del espacio existente' : 'Completa los datos para crear un nuevo espacio en el sistema'}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-5 py-2">
                                    {/* Basic Info Card */}
                                    <Card className="border-teal-100 shadow-sm">
                                        <CardHeader className="pb-3 bg-gradient-to-r from-teal-50/50 to-transparent">
                                            <CardTitle className="text-sm font-semibold text-teal-800 flex items-center gap-2">
                                                <Building2 className="h-4 w-4" />
                                                Información Básica
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nombre del Espacio</Label>
                                                <Input
                                                    id="name"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Ej: Consultorio 2"
                                                    className="border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="room_type" className="text-sm font-medium text-slate-700">Tipo de Espacio</Label>
                                                    <Select
                                                        value={formData.room_type}
                                                        onValueChange={(value: Room['room_type']) => {
                                                            // Auto-set characteristics for different room types
                                                            const updates: any = { room_type: value };

                                                            if (value === 'virtual') {
                                                                updates.price_per_session = 10000;
                                                                updates.description = 'Plataforma de telemedicina profesional con videollamada HD, encriptación end-to-end, grabación de sesiones (opcional), compartición de pantalla, chat integrado, y gestión digital de historias clínicas. Compatible con dispositivos móviles y de escritorio.';
                                                            } else if (value === 'event') {
                                                                updates.description = 'Salón amplio y versátil equipado con sistema de audio profesional, proyector y pantalla HD, iluminación ajustable, aire acondicionado, sillas ergonómicas apilables, mesas modulares, tablero/pizarra, WiFi de alta velocidad, y área de catering. Ideal para talleres médicos, conferencias, capacitaciones y eventos corporativos.';
                                                            } else {
                                                                // Reset description for physical rooms
                                                                updates.description = '';
                                                            }

                                                            setFormData({ ...formData, ...updates });
                                                        }}
                                                    >
                                                        <SelectTrigger className="border-slate-200 focus:border-teal-500 focus:ring-teal-500">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="physical">
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 className="h-4 w-4 text-teal-600" />
                                                                    Consultorio Físico
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="event">
                                                                <div className="flex items-center gap-2">
                                                                    <Users className="h-4 w-4 text-purple-600" />
                                                                    Salón de Eventos
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="virtual">
                                                                <div className="flex items-center gap-2">
                                                                    <Video className="h-4 w-4 text-blue-600" />
                                                                    Consultorio Virtual
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="capacity" className="text-sm font-medium text-slate-700">Capacidad</Label>
                                                    <div className="relative">
                                                        <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                        <Input
                                                            id="capacity"
                                                            type="number"
                                                            min="1"
                                                            className="pl-9 border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                                                            value={formData.capacity}
                                                            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="description" className="text-sm font-medium text-slate-700">Descripción</Label>
                                                <Textarea
                                                    id="description"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                    placeholder={
                                                        formData.room_type === 'virtual'
                                                            ? 'La plataforma se configurará automáticamente. Puedes personalizar esta descripción si lo deseas.'
                                                            : formData.room_type === 'event'
                                                                ? 'Las características del salón se han establecido. Puedes personalizar o agregar detalles adicionales.'
                                                                : 'Ej: Consultorio físico con iluminación natural'
                                                    }
                                                    rows={3}
                                                    className="border-slate-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>


                                    {/* Pricing Card - Different UI for Virtual Rooms */}
                                    {formData.room_type === 'virtual' ? (
                                        <Card className="border-purple-200 shadow-lg bg-gradient-to-br from-purple-50 via-violet-50 to-purple-50">
                                            <CardHeader className="pb-3 bg-gradient-to-r from-purple-100 to-violet-100 border-b border-purple-200">
                                                <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                                                    <Video className="h-5 w-5 text-purple-600" />
                                                    Consultorio Virtual - Modalidad Especial
                                                </CardTitle>
                                                <CardDescription className="text-purple-700">
                                                    Este tipo de consultorio tiene características únicas para sesiones remotas
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-4">
                                                {/* Informational Box */}
                                                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 p-6 text-white shadow-xl">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                                                    <div className="relative z-10">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                                                                <DollarSign className="h-6 w-6 text-white" />
                                                            </div>
                                                            <h3 className="text-xl font-bold">Precio por Sesión Virtual</h3>
                                                        </div>
                                                        <p className="text-purple-100 text-sm mb-4">
                                                            Las sesiones virtuales tienen un precio único base que incluye la plataforma de videollamada y gestión digital
                                                        </p>
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-5xl font-bold tracking-tight">$10,000</span>
                                                            <span className="text-lg text-purple-200">COP / sesión</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Session Details */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-lg bg-white border-2 border-purple-200 p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Stethoscope className="h-4 w-4 text-purple-600" />
                                                            <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">Médico</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600">Realiza consultas remotas con herramientas digitales</p>
                                                    </div>
                                                    <div className="rounded-lg bg-white border-2 border-purple-200 p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <Users className="h-4 w-4 text-purple-600" />
                                                            <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">Paciente</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600">Accede desde cualquier lugar con conexión a internet</p>
                                                    </div>
                                                </div>

                                                {/* Features */}
                                                <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                                                    <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                                                        Incluye en el precio base
                                                    </h4>
                                                    <ul className="space-y-2 text-sm text-slate-700">
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-purple-600 mt-0.5">•</span>
                                                            <span>Plataforma de videollamada segura y encriptada</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-purple-600 mt-0.5">•</span>
                                                            <span>Gestión digital de historias clínicas</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-purple-600 mt-0.5">•</span>
                                                            <span>Recordatorios automáticos por email y SMS</span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                {/* Hidden input for form data */}
                                                <input type="hidden" value={formData.price_per_session} />
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <Card className="border-emerald-100 shadow-sm">
                                            <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50/50 to-transparent">
                                                <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4" />
                                                    Precio y Facturación
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="price_per_hour" className="text-sm font-medium text-slate-700">Precio del Espacio ($)</Label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                                                        <Input
                                                            id="price_per_hour"
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="pl-9 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-lg font-semibold"
                                                            value={formData.price_per_hour === 0 ? '' : formData.price_per_hour}
                                                            onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                                            placeholder="100000"
                                                        />
                                                    </div>
                                                    <p className="text-xs text-slate-500 italic">Este precio se aplicará para reservas del espacio</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Gallery Card - Only for non-virtual rooms */}
                                    {formData.room_type !== 'virtual' && (
                                        <Card className="border-blue-100 shadow-sm">
                                            <CardHeader className="pb-3 bg-gradient-to-r from-blue-50/50 to-transparent">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                                        <ImageIcon className="h-4 w-4" />
                                                        Galería de Fotos
                                                    </CardTitle>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                        {formData.photos.length} foto{formData.photos.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4">
                                                <div className="grid grid-cols-5 gap-3">
                                                    {formData.photos.map((photo, index) => (
                                                        <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-teal-400 transition-colors">
                                                            <img src={photo} alt="" className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removePhoto(photo)}
                                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg aspect-square cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all group">
                                                        {uploading ? (
                                                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                                        ) : (
                                                            <>
                                                                <ImageIcon className="h-8 w-8 text-slate-400 group-hover:text-teal-600 transition-colors mb-1" />
                                                                <span className="text-xs text-slate-500 group-hover:text-teal-600 font-medium">Subir foto</span>
                                                            </>
                                                        )}
                                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                                                    </label>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Status Card */}
                                    <Card className="border-slate-200 shadow-sm">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="flex flex-col gap-1">
                                                    <Label htmlFor="is_active" className="text-sm font-semibold text-slate-800 cursor-pointer">Estado Activo</Label>
                                                    <span className="text-xs text-slate-500">Determina si el espacio puede ser reservado</span>
                                                </div>
                                                <Switch
                                                    id="is_active"
                                                    checked={formData.is_active}
                                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                                    className="data-[state=checked]:bg-teal-600"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                <DialogFooter className="gap-2 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        className="border-slate-300 hover:bg-slate-100"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        className="bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all active:scale-95"
                                    >
                                        <Building2 className="h-4 w-4 mr-2" />
                                        Guardar Espacio
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <TabsContent value="grid" className="mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <Card key={i} className="animate-pulse bg-slate-50/50 border-slate-100 h-64 overflow-hidden" />
                            ))
                        ) : rooms.length === 0 ? (
                            <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-900">No hay espacios registrados</h3>
                                <p className="text-slate-500">Comienza creando el primer consultorio o salón.</p>
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <Card key={room.id} className="group overflow-hidden border-slate-200 hover:border-primary/30 hover:shadow-xl transition-all duration-300 bg-white shadow-sm flex flex-col">
                                    <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                                        {room.photos && room.photos.length > 0 ? (
                                            <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Building2 className="h-16 w-16 opacity-40" />
                                            </div>
                                        )}
                                        {/* Top badges - Type only */}
                                        <div className="absolute top-2 left-2">
                                            {getRoomTypeBadge(room.room_type)}
                                        </div>

                                        {/* Edit/Delete buttons */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg backdrop-blur-sm bg-white/90" onClick={() => handleEdit(room)}>
                                                <Edit className="h-4 w-4 text-slate-700" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg" onClick={() => handleDelete(room.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Active status badge - Bottom left */}
                                        <div className="absolute bottom-2 left-2">
                                            <Badge className={room.is_active ? "bg-emerald-500 hover:bg-emerald-600 shadow-md" : "bg-slate-500 shadow-md"}>
                                                {room.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardContent className="p-5 flex-1 flex flex-col">
                                        {/* Header - Name and Capacity */}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-xl text-slate-900 leading-tight line-clamp-1">{room.name}</h3>
                                            <div className="flex items-center gap-1 text-slate-600 text-sm font-medium bg-slate-50 px-2 py-1 rounded-md">
                                                <Users className="h-4 w-4" />
                                                <span>{room.capacity}</span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[40px] italic">
                                            {room.description || 'Sin descripción adicional para este espacio.'}
                                        </p>

                                        {/* Price section */}
                                        <div className="mb-4">
                                            {room.room_type === 'virtual' ? (
                                                <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                                    <div className="bg-purple-100 p-1.5 rounded">
                                                        <Video className="h-4 w-4 text-purple-600" />
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-bold text-slate-800">$10,000</span>
                                                        <span className="text-xs text-slate-500 font-medium">/sesión</span>
                                                    </div>
                                                </div>
                                            ) : room.price_per_hour && room.price_per_hour > 0 ? (
                                                <div className="flex items-center gap-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                                                    <div className="bg-primary/10 p-1.5 rounded">
                                                        <DollarSign className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-bold text-slate-800">${room.price_per_hour.toLocaleString()}</span>
                                                        <span className="text-xs text-slate-500 font-medium">/hora</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg text-center">
                                                    Precio no disponible
                                                </div>
                                            )}
                                        </div>

                                        {/* Availability status */}
                                        <div className="mt-auto pt-4 border-t border-slate-100">
                                            {occupancy[room.id] ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] font-bold px-2 py-0.5">
                                                            {occupancy[room.id]?.type === 'appointment' ? 'RESERVADO' : 'ALQUILADO'}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400 font-medium italic">En uso ahora</span>
                                                    </div>
                                                    <div className="space-y-1.5 pl-1">
                                                        {occupancy[room.id]?.doctorName && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-700">
                                                                <Stethoscope className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                                                <span className="font-medium truncate">{occupancy[room.id]?.doctorName}</span>
                                                            </div>
                                                        )}
                                                        {occupancy[room.id]?.patientName && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                <Users className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                                                <span className="truncate">{occupancy[room.id]?.patientName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold px-2 py-0.5">
                                                        DISPONIBLE
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-400 font-medium italic">Libre para uso</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="occupancy" className="space-y-6">
                    <RoomCalendarView />
                </TabsContent>

                <TabsContent value="list" className="mt-0">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-teal-500/10 via-teal-50/50 to-white border-b border-teal-100/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-teal-600" />
                                        Registro de Citas Recientes
                                    </CardTitle>
                                    <CardDescription className="text-slate-500 mt-1">
                                        Historial completo de citas y registro médico.
                                    </CardDescription>
                                </div>
                                <div className="hidden md:block">
                                    <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-teal-100 text-teal-700 font-bold px-3 py-1">
                                        VISTA ADMINISTRATIVA
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 border-b border-slate-100">
                                        <TableHead className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Fecha / Hora</TableHead>
                                        <TableHead className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Paciente</TableHead>
                                        <TableHead className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Especialista</TableHead>
                                        <TableHead className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Ubicación</TableHead>
                                        <TableHead className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Estado</TableHead>
                                        <TableHead className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Facturación</TableHead>
                                        <TableHead className="text-right font-bold text-slate-600 uppercase tracking-wider text-[11px]">Control</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fetchingAppointments ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                    Cargando citas...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : appointmentsList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay citas registradas</TableCell>
                                        </TableRow>
                                    ) : (
                                        appointmentsList.map((apt) => (
                                            <TableRow key={apt.id} className="group hover:bg-teal-50/40 transition-all duration-200 border-b border-slate-50 last:border-0">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 group-hover:border-teal-100 transition-colors">
                                                            <Calendar className="h-4 w-4 text-teal-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-700">
                                                                {(() => {
                                                                    try {
                                                                        return format(new Date(apt.start_time), "dd MMM, yyyy", { locale: es });
                                                                    } catch (e) {
                                                                        return "Fecha inválida";
                                                                    }
                                                                })()}
                                                            </span>
                                                            <span className="text-[11px] text-teal-600 font-semibold flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {(() => {
                                                                    try {
                                                                        return format(new Date(apt.start_time), "HH:mm");
                                                                    } catch (e) {
                                                                        return "";
                                                                    }
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-800">{apt.patient_name || 'Desconocido'}</span>
                                                        <span className="text-[10px] text-slate-400">Paciente Registrado</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-indigo-50 p-1.5 rounded-full">
                                                            <Stethoscope className="h-3.5 w-3.5 text-indigo-600" />
                                                        </div>
                                                        <span className="font-medium text-slate-700">{apt.doctor_name || 'Desconocido'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    {apt.room_name && apt.room_name !== '---' ? (
                                                        <div className="flex items-center gap-2 bg-slate-100/80 px-2 py-1 rounded-md w-fit">
                                                            <Building2 className="h-3.5 w-3.5 text-slate-500" />
                                                            <span className="text-xs font-semibold text-slate-600">{apt.room_name}</span>
                                                        </div>
                                                    ) : apt.is_virtual ? (
                                                        <div className="flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-md w-fit text-emerald-700 border border-emerald-100">
                                                            <Video className="h-3.5 w-3.5" />
                                                            <span className="text-xs font-bold">Virtual</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">No asignado</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm",
                                                        apt.status === 'confirmed' ? "bg-teal-50 text-teal-700 border-teal-200" :
                                                            apt.status === 'cancelled' ? "bg-red-50 text-red-700 border-red-200" :
                                                                "bg-slate-50 text-slate-500 border-slate-200"
                                                    )}>
                                                        {apt.status === 'confirmed' ? 'CONFIRMADA' : apt.status === 'cancelled' ? 'CANCELADA' : apt.status?.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {(() => {
                                                            const isPaid = apt.payment_status === 'paid' || apt.payment_status === 'confirmed';
                                                            const amount = apt.total_amount || 0;

                                                            return (
                                                                <>
                                                                    <div className={cn(
                                                                        "flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit shadow-sm",
                                                                        isPaid ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-700 border-red-200"
                                                                    )}>
                                                                        {isPaid ? (
                                                                            <><CheckCircle2 className="h-3 w-3" /> PAGADO</>
                                                                        ) : (
                                                                            <><Activity className="h-3 w-3" /> NO PROCESADO</>
                                                                        )}
                                                                    </div>
                                                                    {amount > 0 && isPaid && (
                                                                        <span className="text-xs font-bold text-slate-800 ml-1">
                                                                            ${amount.toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right py-4">
                                                    <div className="flex justify-end gap-2">
                                                        {apt.status === 'confirmed' && new Date(apt.start_time) > new Date() && (
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 shadow-sm transition-all active:scale-90"
                                                                title="Cancelar Cita"
                                                                onClick={() => handleCancelAppointment(apt.id)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 shadow-sm transition-all active:scale-90"
                                                            title="Eliminar de DB"
                                                            onClick={() => handleDeleteAppointment(apt.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
};

