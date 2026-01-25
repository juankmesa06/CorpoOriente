import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Save } from 'lucide-react';
import { toast } from 'sonner';

export const AdminOrganizationConfig = () => {
    const [config, setConfig] = useState({
        name: 'Centro PsicoTerapeutico',
        address: 'Av. Principal 123, Ciudad',
        phone: '+57 300 123 4567',
        email: 'contacto@centropsicoterapeutico.com',
        website: 'www.centropsicoterapeutico.com'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        // In a real app, save to Supabase 'organization_settings' table
        toast.success('Configuración guardada correctamente');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Configuración de la Organización
                </CardTitle>
                <CardDescription>
                    Información general de la clínica visible para pacientes y reportes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre de la Clínica</Label>
                    <Input id="name" name="name" value={config.name} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Dirección Física</Label>
                    <Input id="address" name="address" value={config.address} onChange={handleChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono de Contacto</Label>
                        <Input id="phone" name="phone" value={config.phone} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" name="email" value={config.email} onChange={handleChange} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="website">Sitio Web</Label>
                    <Input id="website" name="website" value={config.website} onChange={handleChange} />
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} className="w-full md:w-auto">
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};
