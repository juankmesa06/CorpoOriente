import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Building2, Plus, Edit, Trash2, Video, Users, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Room {
    id: string;
    name: string;
    description: string | null;
    room_type: 'consultation' | 'event_hall' | 'virtual';
    capacity: number;
    is_active: boolean;
    photos: string[] | null;
}

export const RoomManagement = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [uploading, setUploading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        room_type: 'consultation' as Room['room_type'],
        capacity: 2,
        is_active: true,
        photos: [] as string[]
    });

    const loadRooms = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .order('room_type', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            toast.error('Error al cargar espacios: ' + error.message);
        } else {
            setRooms(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadRooms();
    }, []);

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
            photos: formData.photos
        };

        if (editingRoom) {
            // Update
            const { error } = await supabase
                .from('rooms')
                .update(roomData)
                .eq('id', editingRoom.id);

            if (error) {
                toast.error('Error al actualizar: ' + error.message);
            } else {
                toast.success('Espacio actualizado correctamente');
                setIsDialogOpen(false);
                resetForm();
                loadRooms();
            }
        } else {
            // Create
            const { error } = await supabase
                .from('rooms')
                .insert([roomData]);

            if (error) {
                toast.error('Error al crear: ' + error.message);
            } else {
                toast.success('Espacio creado correctamente');
                setIsDialogOpen(false);
                resetForm();
                loadRooms();
            }
        }
    };

    const handleEdit = (room: Room) => {
        setEditingRoom(room);
        setFormData({
            name: room.name,
            description: room.description || '',
            room_type: room.room_type,
            capacity: room.capacity,
            is_active: room.is_active,
            photos: room.photos || []
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (roomId: string) => {
        if (!confirm('¿Estás seguro de eliminar este espacio?')) return;

        const { error } = await supabase
            .from('rooms')
            .delete()
            .eq('id', roomId);

        if (error) {
            toast.error('Error al eliminar: ' + error.message);
        } else {
            toast.success('Espacio eliminado');
            loadRooms();
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            room_type: 'consultation',
            capacity: 2,
            is_active: true,
            photos: []
        });
        setEditingRoom(null);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('room-photos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('room-photos')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                photos: [...prev.photos, data.publicUrl]
            }));

            toast.success('Foto subida correctamente');
        } catch (error: any) {
            toast.error('Error al subir foto: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (photoUrl: string) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter(p => p !== photoUrl)
        }));
    };

    const getRoomTypeLabel = (type: Room['room_type']) => {
        const labels = {
            consultation: 'Consultorio',
            event_hall: 'Salón de Eventos',
            virtual: 'Virtual'
        };
        return labels[type];
    };

    const getRoomTypeIcon = (type: Room['room_type']) => {
        if (type === 'virtual') return <Video className="h-4 w-4" />;
        if (type === 'event_hall') return <Users className="h-4 w-4" />;
        return <Building2 className="h-4 w-4" />;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Gestión de Espacios
                        </CardTitle>
                        <CardDescription>Administra consultorios, salones y espacios virtuales</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Espacio
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
                                    <div className="grid grid-cols-3 gap-4 mb-2">
                                        {formData.photos.map((photo, index) => (
                                            <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border">
                                                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removePhoto(photo)}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg aspect-video cursor-pointer hover:bg-muted/50 transition-colors">
                                            {uploading ? (
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            ) : (
                                                <>
                                                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                                                    <span className="text-xs text-muted-foreground">Subir foto</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t pt-4">
                                    <Label htmlFor="is_active">Estado Activo</Label>
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
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-center text-muted-foreground py-8">Cargando espacios...</p>
                ) : rooms.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No hay espacios registrados</p>
                ) : (
                    <div className="space-y-2">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        {room.photos && room.photos.length > 0 ? (
                                            <img src={room.photos[0]} alt={room.name} className="h-10 w-10 object-cover rounded" />
                                        ) : (
                                            getRoomTypeIcon(room.room_type)
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{room.name}</p>
                                            <Badge variant={room.is_active ? 'default' : 'secondary'}>
                                                {room.is_active ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                            <Badge variant="outline">{getRoomTypeLabel(room.room_type)}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {room.description || 'Sin descripción'} • Capacidad: {room.capacity}
                                            {room.photos && room.photos.length > 0 && ` • ${room.photos.length} fotos`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(room)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(room.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
