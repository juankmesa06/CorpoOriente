import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Building2, Plus, Edit, Trash2, Video, Users,
    Image as ImageIcon, X, Loader2, DollarSign,
    Calendar, Stethoscope, List, CheckCircle2, Clock
} from 'lucide-react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from 'sonner';

interface Room {
    id: string;
    name: string;
    description: string | null;
    room_type: 'consultation' | 'event_hall' | 'virtual';
    capacity: number;
    is_active: boolean;
    photos: string[] | null;
    price_per_hour: number | null;
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
        room_type: 'consultation' as Room['room_type'],
        capacity: 2,
        is_active: true,
        photos: [] as string[],
        price_per_hour: 0
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
    }, [typeFilter]);

    const fetchAppointments = async () => {
        setFetchingAppointments(true);
        try {
            let query = supabase
                .from('appointments')
                .select(`
                    id,
                    start_time,
                    status,
                    is_virtual,
                    rental_id,
                    rooms ( name ),
                    patient_profiles (
                        profiles (
                            full_name
                        )
                    ),
                    doctor_profiles (
                        profiles:profiles!doctor_profiles_user_id_fkey (
                            full_name
                        )
                    ),
                    payments (
                        amount,
                        status
                    )
                `)
                .order('start_time', { ascending: false })
                .limit(30);

            if (typeFilter === "virtual") query = query.eq('is_virtual', true);
            if (typeFilter === "presencial") query = query.eq('is_virtual', false);

            const { data: apts, error: aptError } = await query;
            if (aptError) throw aptError;

            // Fetch related rentals manually to avoid join cache issues
            const rentalIds = apts?.map(a => a.rental_id).filter(Boolean);
            let rentals: any[] = [];

            if (rentalIds && rentalIds.length > 0) {
                const { data: rentalData } = await supabase
                    .from('room_rentals')
                    .select('id, total_price, status, rooms ( name )')
                    .in('id', rentalIds);
                rentals = rentalData || [];
            }

            // Stitch data
            const stitchedApts = apts?.map(a => ({
                ...a,
                room_rentals: rentals.find(r => r.id === a.rental_id) || null
            }));

            setAppointmentsList(stitchedApts || []);
        } catch (error: any) {
            console.error('Error fetching appointments:', error);
        } finally {
            setFetchingAppointments(false);
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
                .limit(30);

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
            room_type: 'consultation',
            capacity: 2,
            is_active: true,
            photos: [],
            price_per_hour: 0
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
            price_per_hour: room.price_per_hour || 0
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
            price_per_hour: formData.price_per_hour
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
            case 'consultation': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">Consultorio</Badge>;
            case 'event_hall': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100">Salón</Badge>;
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
                                    <SelectItem value="presencial">Presencial</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadRoomsAndOccupancy}
                            disabled={loading || fetchingAppointments}
                            className="h-9"
                        >
                            <Loader2 className={cn("h-4 w-4 mr-2", (loading || fetchingAppointments) && "animate-spin")} />
                            {loading || fetchingAppointments ? 'Actualizando...' : 'Actualizar'}
                        </Button>

                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) resetForm();
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95 h-9">
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Espacio
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>{editingRoom ? 'Editar Espacio' : 'Crear Nuevo Espacio'}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nombre</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Consultorio 6"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="price_per_hour">Precio por Hora ($)</Label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="price_per_hour"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="pl-8"
                                                value={formData.price_per_hour}
                                                onChange={(e) => setFormData({ ...formData, price_per_hour: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="room_type">Tipo de Espacio</Label>
                                            <Select
                                                value={formData.room_type}
                                                onValueChange={(value: Room['room_type']) => setFormData({ ...formData, room_type: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="consultation">Consultorio Físico</SelectItem>
                                                    <SelectItem value="event_hall">Salón de Eventos</SelectItem>
                                                    <SelectItem value="virtual">Consultorio Virtual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="capacity">Capacidad</Label>
                                            <Input
                                                id="capacity"
                                                type="number"
                                                min="1"
                                                value={formData.capacity}
                                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descripción</Label>
                                        <Textarea
                                            id="description"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Características del espacio..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Galería de Fotos</Label>
                                        <div className="grid grid-cols-3 gap-4">
                                            {formData.photos.map((photo, index) => (
                                                <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border">
                                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={() => removePhoto(photo)}
                                                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded-full"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg aspect-video cursor-pointer hover:bg-muted/50 transition-colors">
                                                {uploading ? (
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <>
                                                        <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                                                        <span className="text-[10px] text-muted-foreground">Subir</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex flex-col gap-0.5">
                                            <Label htmlFor="is_active">Estado Activo</Label>
                                            <span className="text-xs text-muted-foreground">Determina si el espacio puede ser reservado</span>
                                        </div>
                                        <Switch
                                            id="is_active"
                                            checked={formData.is_active}
                                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleSave}>Guardar Espacio</Button>
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
                                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                                        {room.photos && room.photos.length > 0 ? (
                                            <img src={room.photos[0]} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Building2 className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                            {getRoomTypeBadge(room.room_type)}
                                            <Badge className={room.is_active ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-500"}>
                                                {room.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg" onClick={() => handleEdit(room)}>
                                                <Edit className="h-4 w-4 text-slate-700" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-lg" onClick={() => handleDelete(room.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <CardContent className="p-5 flex-1 flex flex-col">
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-bold text-lg text-slate-900 leading-tight line-clamp-1">{room.name}</h3>
                                                <div className="flex items-center text-slate-500 text-xs font-medium">
                                                    <Users className="h-3 w-3 mr-1" />
                                                    {room.capacity}
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10 italic">
                                                {room.description || 'Sin descripción adicional para este espacio.'}
                                            </p>

                                            <div className="pt-4 border-t border-slate-50 mt-auto">
                                                {room.price_per_hour && room.price_per_hour > 0 && (
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <div className="bg-primary/10 p-1 rounded">
                                                            <DollarSign className="h-3 w-3 text-primary" />
                                                        </div>
                                                        <span className="text-xs font-semibold">
                                                            <span className="text-slate-800">${room.price_per_hour}</span> /hora
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-slate-50">
                                                {occupancy[room.id] ? (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 text-[10px] font-bold">
                                                                {occupancy[room.id]?.type === 'appointment' ? 'RESERVADO' : 'ALQUILADO'}
                                                            </Badge>
                                                            <span className="text-[10px] text-slate-400 font-medium italic">En uso ahora</span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {occupancy[room.id]?.doctorName && (
                                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                    <Stethoscope className="h-3 w-3 text-primary" />
                                                                    <span className="font-medium">{occupancy[room.id]?.doctorName}</span>
                                                                </div>
                                                            )}
                                                            {occupancy[room.id]?.patientName && (
                                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                                    <Users className="h-3 w-3 text-slate-400" />
                                                                    <span>Paciente: {occupancy[room.id]?.patientName}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold">
                                                            DISPONIBLE
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-400 font-medium italic">Libre para uso</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="occupancy" className="space-y-6">
                    <Card className="border-slate-200 shadow-sm overflow-hidden text-lifting">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-lg">Estado Detallado de Ocupación</CardTitle>
                            <CardDescription>Monitoreo en tiempo real del uso de consultorios y salones.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cargando ocupación...
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead className="w-[200px]">Espacio</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Profesional</TableHead>
                                            <TableHead>Paciente</TableHead>
                                            <TableHead className="text-right">Termina</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rooms.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay espacios registrados</TableCell>
                                            </TableRow>
                                        ) : (
                                            rooms.map(room => (
                                                <TableRow key={room.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="font-semibold text-slate-700">{room.name}</TableCell>
                                                    <TableCell>
                                                        {occupancy[room.id] ? (
                                                            <Badge className={occupancy[room.id]?.type === 'appointment' ? 'bg-red-500' : 'bg-amber-500'}>
                                                                {occupancy[room.id]?.type === 'appointment' ? 'Cita activa' : 'Alquiler activo'}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Libre</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium">
                                                        {occupancy[room.id]?.doctorName || <span className="text-slate-400 italic">N/A</span>}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {occupancy[room.id]?.patientName || <span className="text-slate-400">---</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-mono text-slate-500">
                                                        {occupancy[room.id]?.endTime ? (
                                                            (() => {
                                                                try {
                                                                    return format(new Date(occupancy[room.id]!.endTime), "HH:mm");
                                                                } catch (e) {
                                                                    return "---";
                                                                }
                                                            })()
                                                        ) : '---'}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm overflow-hidden text-lifting">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg">Registro de Alquileres Realizados</CardTitle>
                                    <CardDescription>Historial de alquileres de espacios y estado de cobros.</CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1">
                                    <List className="h-3 w-3" /> {recentRentals.length} Registros
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {fetchingRentals ? (
                                <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Cargando historial...
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead>Fecha / Hora</TableHead>
                                            <TableHead>Consultorio</TableHead>
                                            <TableHead>Profesional</TableHead>
                                            <TableHead>Precio</TableHead>
                                            <TableHead>Estado Pago</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentRentals.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay alquileres registrados</TableCell>
                                            </TableRow>
                                        ) : (
                                            recentRentals.map((rental) => (
                                                <TableRow key={rental.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{format(new Date(rental.start_time), "dd/MM/yyyy")}</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {format(new Date(rental.start_time), "HH:mm")} - {format(new Date(rental.end_time), "HH:mm")}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-700">
                                                        {rental.rooms?.name || '---'}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {rental.renter_name || 'Desconocido'}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-slate-700">
                                                        ${rental.total_price?.toLocaleString() || '0'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {rental.status === 'confirmed' ? (
                                                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">
                                                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Pagado
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-[10px]">
                                                                <Clock className="h-2.5 w-2.5 mr-1 text-amber-500" /> Pendiente
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="list" className="mt-0">
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-lg">Registro de Citas Recientes (MVP)</CardTitle>
                            <CardDescription>Control de las últimas 30 citas y su estado de pago.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead>Fecha / Hora</TableHead>
                                        <TableHead>Paciente</TableHead>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Consultorio</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Pago</TableHead>
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
                                            <TableRow key={apt.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {(() => {
                                                                try {
                                                                    return format(new Date(apt.start_time), "dd/MM/yyyy");
                                                                } catch (e) {
                                                                    return "Fecha inválida";
                                                                }
                                                            })()}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {(() => {
                                                                try {
                                                                    return format(new Date(apt.start_time), "HH:mm");
                                                                } catch (e) {
                                                                    return "";
                                                                }
                                                            })()}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {apt.patient_profiles?.profiles?.full_name || 'Desconocido'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {apt.doctor_profiles?.profiles?.full_name || 'Desconocido'}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium text-slate-700">
                                                    {(() => {
                                                        const roomName = apt.rooms?.name ||
                                                            (Array.isArray(apt.room_rentals) ? apt.room_rentals[0]?.rooms?.name : apt.room_rentals?.rooms?.name);

                                                        if (roomName) {
                                                            return (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Building2 className="h-3.5 w-3.5 text-primary/60" />
                                                                    {roomName}
                                                                </div>
                                                            );
                                                        }
                                                        if (apt.is_virtual) {
                                                            return (
                                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                                    <Video className="h-3.5 w-3.5" />
                                                                    Virtual
                                                                </div>
                                                            );
                                                        }
                                                        return <span className="text-slate-400 italic text-xs">No asignado</span>;
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 text-[10px]">Confirmada</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        {(() => {
                                                            const paymentSum = apt.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                                                            const rentalPrice = Array.isArray(apt.room_rentals) ? (apt.room_rentals[0]?.total_price || 0) : (apt.room_rentals?.total_price || 0);
                                                            const total = paymentSum + Number(rentalPrice);

                                                            return (
                                                                <>
                                                                    <Badge className={cn(
                                                                        "text-[10px] w-fit",
                                                                        total > 0 ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                                                    )}>
                                                                        {(paymentSum > 0 || (rentalPrice > 0 && (Array.isArray(apt.room_rentals) ? apt.room_rentals[0]?.status === 'confirmed' : apt.room_rentals?.status === 'confirmed'))) ? (
                                                                            <><CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Pagado</>
                                                                        ) : (
                                                                            <><Clock className="h-2.5 w-2.5 mr-1" /> Pendiente</>
                                                                        )}
                                                                    </Badge>
                                                                    <span className="text-[10px] font-bold text-slate-700">${total.toLocaleString()}</span>
                                                                    {total > 0 && Number(rentalPrice) > 0 && (
                                                                        <span className="text-[9px] text-muted-foreground">Incl. Alquiler</span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
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
        </div>
    );
};
