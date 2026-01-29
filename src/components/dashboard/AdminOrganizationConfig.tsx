import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Building,
    Save,
    MapPin,
    Phone,
    Mail,
    Globe,
    Upload,
    Palette,
    Clock,
    DollarSign,
    Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminOrganizationConfig = () => {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({
        name: 'Centro Psicoterapéutico de Oriente',
        description: 'Centro integral de salud mental y bienestar emocional. ¡Cuidamos de ti y los tuyos!',
        address: 'Calle 48 #62b 106, Rionegro, Antioquia',
        phone: '+57 321 786 10 80',
        email: 'Hola@cpo.co',
        website: 'https://centropsicoterapeuticodeoriente.com',
        timezone: 'America/Bogota',
        currency: 'COP',
        brandColor: '#0ea5e9',
        logoUrl: '/logo.png'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Configuración de la organización actualizada correctamente');
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
                {/* General Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Building className="h-5 w-5 text-primary" />
                            Información Corporativa
                        </CardTitle>
                        <CardDescription>
                            Detalles principales de la institución visibles en reportes y portal de pacientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Clínica / Organización</Label>
                            <Input
                                id="name"
                                name="name"
                                value={config.name}
                                onChange={handleChange}
                                className="text-lg font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción Corta / Slogan</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={config.description}
                                onChange={handleChange}
                                rows={2}
                                className="resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website" className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                Sitio Web Oficial
                            </Label>
                            <Input
                                id="website"
                                name="website"
                                value={config.website}
                                onChange={handleChange}
                                placeholder="https://..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <MapPin className="h-5 w-5 text-primary" />
                            Contacto y Ubicación
                        </CardTitle>
                        <CardDescription>
                            Estos datos aparecerán en los encabezados de facturas y recetas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="address">Dirección Física Completa</Label>
                            <Input
                                id="address"
                                name="address"
                                value={config.address}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    Teléfono Principal
                                </Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={config.phone}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    Correo Electrónico
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    value={config.email}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column - Preferences & Branding */}
            <div className="space-y-6">
                {/* Branding Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Palette className="h-5 w-5 text-primary" />
                            Identidad Visual
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-4 p-4 border-2 border-dashed rounded-lg bg-gray-50/50">
                            <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                                <AvatarImage src={config.logoUrl} />
                                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                    Logo
                                </AvatarFallback>
                            </Avatar>
                            <div className="text-center space-y-2">
                                <Button variant="outline" size="sm" className="w-full">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Subir Logo
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    PNG, JPG o SVG (Max. 2MB)
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="brandColor">Color de Marca (HEX)</Label>
                            <div className="flex gap-2">
                                <div
                                    className="w-10 h-10 rounded border shadow-sm"
                                    style={{ backgroundColor: config.brandColor }}
                                />
                                <Input
                                    id="brandColor"
                                    name="brandColor"
                                    value={config.brandColor}
                                    onChange={handleChange}
                                    className="font-mono uppercase"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Regional Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="h-5 w-5 text-primary" />
                            Configuración Regional
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="timezone">Zona Horaria</Label>
                            <Input
                                id="timezone"
                                name="timezone"
                                value={config.timezone}
                                onChange={handleChange}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency" className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                Moneda Base
                            </Label>
                            <Input
                                id="currency"
                                name="currency"
                                value={config.currency}
                                onChange={handleChange}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                        <Button onClick={handleSave} className="w-full shadow-lg hover:scale-[1.02] transition-all" size="lg" disabled={loading}>
                            {loading ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar Configuración
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};
