import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Plus, PenTool } from 'lucide-react';
import { toast } from 'sonner';

interface DoctorTask {
    id: string;
    title: string;
    priority: 'urgent' | 'normal' | 'low';
    is_completed: boolean;
    patient_name?: string;
}

interface DoctorTasksProps {
    className?: string;
}

export const DoctorTasks = ({ className }: DoctorTasksProps) => {
    const [tasks, setTasks] = useState<DoctorTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState<'urgent' | 'normal' | 'low'>('normal');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: doctorProfile } = await supabase
                .from('doctor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (doctorProfile) {
                const { data, error } = await supabase
                    .from('doctor_tasks' as any)
                    .select('*')
                    .eq('doctor_id', doctorProfile.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTasks(data || []);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const addTask = async () => {
        if (!newTask.trim()) return;
        setIsAdding(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: doctorProfile } = await supabase
                .from('doctor_profiles')
                .select('id')
                .eq('user_id', user!.id)
                .single();

            if (!doctorProfile) throw new Error('No doctor profile found');

            const { data, error } = await supabase
                .from('doctor_tasks' as any)
                .insert([{
                    doctor_id: doctorProfile.id,
                    title: newTask,
                    priority: newPriority,
                    is_completed: false
                }])
                .select()
                .single();

            if (error) throw error;

            setTasks([data, ...tasks]);
            setNewTask('');
            setNewPriority('normal');
            toast.success('Tarea agregada');
        } catch (error) {
            console.error('Error adding task:', error);
            toast.error('Error al agregar tarea');
        } finally {
            setIsAdding(false);
        }
    };

    const toggleTask = async (id: string, currentStatus: boolean) => {
        try {
            // Optimistic update
            setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));

            const { error } = await supabase
                .from('doctor_tasks' as any)
                .update({ is_completed: !currentStatus })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling task:', error);
            toast.error('Error al actualizar tarea');
            fetchTasks(); // Revert
        }
    };

    const deleteTask = async (id: string) => {
        try {
            setTasks(tasks.filter(t => t.id !== id));

            const { error } = await supabase
                .from('doctor_tasks' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Tarea eliminada');
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Error al eliminar tarea');
            fetchTasks(); // Revert
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500';
            case 'low': return 'bg-green-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <Card className={`bg-white border-primary/20 shadow-sm h-full ${className || ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl text-secondary flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Tareas Pendientes
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add Task Form */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Nueva tarea..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTask()}
                        className="h-9"
                    />
                    <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                        <SelectTrigger className="w-[100px] h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="urgent">Urgente</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Baja</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addTask} disabled={isAdding || !newTask.trim()} className="h-9 w-9 p-0">
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Task List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">No hay tareas pendientes</p>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="group flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                                <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`} />
                                <Checkbox
                                    checked={task.is_completed}
                                    onCheckedChange={() => toggleTask(task.id, task.is_completed)}
                                />
                                <span className={`text-sm flex-1 ${task.is_completed ? 'line-through text-muted-foreground' : 'text-gray-700 font-medium'}`}>
                                    {task.title}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                    onClick={() => deleteTask(task.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
