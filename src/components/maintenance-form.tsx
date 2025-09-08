"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, CalendarIcon, CheckCircle, Cpu, FileKey, Loader2, Plus, Sparkles, Trash2, User, Wrench } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import {
  checkTaskRelevanceAction,
  suggestTasksAction,
  addMaintenanceRecord,
  addCollectionItem,
  getCollection
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  equipment: z.string({ required_error: "Debe seleccionar un equipo." }).min(1),
  assetNumber: z.string({ required_error: "Debe seleccionar un número de serie." }).min(1),
  user: z.string({ required_error: "Debe seleccionar un usuario." }).min(1),
  technician: z.string({ required_error: "Debe seleccionar un técnico." }).min(1),
  date: z.date({ required_error: "Debe seleccionar una fecha." }),
  notes: z.string().optional(),
  status: z.enum(["Completado", "Pendiente", "En Progreso"]),
});

type Relevance = { isRelevant: boolean; relevanceExplanation: string };
type Task = {
  description: string;
  relevance?: Relevance;
};

type TaskState = {
  id: number;
  description: string;
  status: "checking" | "checked";
  relevance?: Relevance;
};

type CollectionItem = { id: string; name: string };

function AddItemDialog({ collectionName, onAddItemSuccess }: { collectionName: string; onAddItemSuccess: () => void }) {
  const [itemNames, setItemNames] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAddItems = async () => {
    if (!itemNames.trim() || !user) return;

    const names = itemNames.split(/,|\n/).map(name => name.trim()).filter(name => name.length > 0);
    
    if (names.length === 0) return;

    const promises = names.map(name => addCollectionItem(collectionName, name, user.uid));
    
    try {
      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        toast({
          variant: "destructive",
          title: "Error de Permiso",
          description: "No tienes permiso para agregar nuevos elementos.",
        });
      } else {
        toast({
          title: "Elementos Agregados",
          description: `${names.length} elemento(s) han sido agregados.`,
          className: "bg-accent text-accent-foreground"
        });
        setItemNames("");
        setIsOpen(false);
        onAddItemSuccess(); // Llama al callback para refrescar la lista
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un error inesperado al agregar elementos.",
      });
    }
  };
  
  const getCollectionDisplayName = () => {
    switch (collectionName) {
      case 'equipment': return 'Equipos';
      case 'appUsers': return 'Usuarios';
      case 'technicians': return 'Técnicos';
      case 'assetNumbers': return 'N° de Serie/Activo';
      default: return collectionName;
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 ml-2 flex-shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Nuevos {getCollectionDisplayName()}</DialogTitle>
          <DialogDescription>
            Ingrese uno o más nombres separados por comas o en líneas nuevas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombres
            </Label>
            <Textarea
              id="name"
              value={itemNames}
              onChange={(e) => setItemNames(e.target.value)}
              className="col-span-3"
              placeholder="Ej: Item 1, Item 2\no\nItem 1\nItem 2\nItem 3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleAddItems}>Agregar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceForm() {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [isSuggesting, startSuggesting] = React.useTransition();
  const [tasks, setTasks] = React.useState<TaskState[]>([]);
  const [newTask, setNewTask] = React.useState("");
  const [suggestedTasks, setSuggestedTasks] = React.useState<string[]>([]);
  const [nextMaintenanceDate, setNextMaintenanceDate] = React.useState<Date>();

  const [equipmentList, setEquipmentList] = React.useState<CollectionItem[]>([]);
  const [assetNumberList, setAssetNumberList] = React.useState<CollectionItem[]>([]);
  const [userList, setUserList] = React.useState<CollectionItem[]>([]);
  const [technicianList, setTechnicianList] = React.useState<CollectionItem[]>([]);
  
  const canEdit = userRole === 'admin' || userRole === 'editor';

  const fetchCollections = React.useCallback(async () => {
    const collectionsToFetch = [
      { name: 'equipment', setter: setEquipmentList },
      { name: 'assetNumbers', setter: setAssetNumberList },
      { name: 'appUsers', setter: setUserList },
      { name: 'technicians', setter: setTechnicianList },
    ];

    for (const { name, setter } of collectionsToFetch) {
      const result = await getCollection(name);
      if (result.success && result.data) {
        setter(result.data);
      } else {
        toast({
          variant: "destructive",
          title: `Error al cargar ${name}`,
          description: result.error,
        });
      }
    }
  }, [toast]);


  React.useEffect(() => {
    if (user) {
      fetchCollections();
    }
  }, [user, fetchCollections]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { date: new Date(), notes: "", status: "Completado" },
  });

  const equipmentType = form.watch("equipment");

  React.useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.date) {
        setNextMaintenanceDate(addMonths(value.date, 4));
      }
    });
    const initialDate = form.getValues("date");
    if(initialDate) {
        setNextMaintenanceDate(addMonths(initialDate, 4));
    }
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSuggestTasks = React.useCallback(async () => {
    if (!equipmentType) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor, seleccione un tipo de equipo primero.",
      });
      return;
    }
    startSuggesting(async () => {
      const suggestions = await suggestTasksAction({ equipmentType });
      setSuggestedTasks(suggestions);
    });
  }, [equipmentType, toast]);

  const addTask = React.useCallback(
    async (description: string) => {
      if (!description.trim()) return;
      if (!equipmentType) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Por favor, seleccione un tipo de equipo antes de agregar una tarea.",
        });
        return;
      }
      
      const newId = Date.now();
      const newTask: TaskState = { id: newId, description, status: "checking" };
      setTasks((prev) => [...prev, newTask]);
      
      const relevance = await checkTaskRelevanceAction({ equipmentType, taskDescription: description });
      
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newId ? { ...t, status: "checked", relevance } : t
        )
      );
    },
    [equipmentType, toast]
  );

  const handleAddTask = () => {
    addTask(newTask);
    setNewTask("");
  };

  const handleAddSuggestedTask = (description: string) => {
    addTask(description);
    setSuggestedTasks(prev => prev.filter(t => t !== description));
  };
  
  const removeTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para guardar." });
        return;
    }
     if (tasks.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay tareas",
        description: "Debes agregar al menos una tarea realizada antes de guardar.",
      });
      return;
    }

    const tasksToSave: Task[] = tasks.map(({ id, status, ...rest }) => rest);

    const recordData = {
      ...values,
      tasks: tasksToSave,
    };

    const result = await addMaintenanceRecord(recordData, user.uid);

    if (result.success) {
      toast({
        title: "Registro Guardado",
        description: "La información de mantenimiento ha sido guardada exitosamente.",
        className: "bg-accent text-accent-foreground"
      });
      form.reset({
        equipment: undefined,
        assetNumber: undefined,
        user: undefined,
        technician: undefined,
        notes: "", 
        status: "Completado", 
        date: new Date() 
      });
      setTasks([]);
    } else {
      toast({
        variant: "destructive",
        title: "Error al Guardar",
        description: result.error || "No se pudo guardar el registro. Verifica tus permisos.",
      });
    }
  }

  return (
    <TooltipProvider>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Nuevo Registro de Mantenimiento</CardTitle>
          <CardDescription>Complete los detalles a continuación para registrar una nueva entrada de mantenimiento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <FormField control={form.control} name="equipment" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo</FormLabel>
                    <div className="flex items-center">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar equipo..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{equipmentList.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {canEdit && <AddItemDialog collectionName="equipment" onAddItemSuccess={fetchCollections} />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                 <FormField control={form.control} name="assetNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° de Serie/Activo</FormLabel>
                    <div className="flex items-center">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar N°..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{assetNumberList.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {canEdit && <AddItemDialog collectionName="assetNumbers" onAddItemSuccess={fetchCollections} />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="user" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario del Equipo</FormLabel>
                     <div className="flex items-center">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Seleccionar usuario..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>{userList.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                        {canEdit && <AddItemDialog collectionName="appUsers" onAddItemSuccess={fetchCollections} />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="technician" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mantenimiento por</FormLabel>
                    <div className="flex items-center">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar técnico..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>{technicianList.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {canEdit && <AddItemDialog collectionName="technicians" onAddItemSuccess={fetchCollections} />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Mantenimiento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccionar estado..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>{["Completado", "Pendiente", "En Progreso"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <div className="lg:col-span-3 p-4 bg-secondary/50 rounded-lg flex items-center justify-between">
                  <p className="font-medium">Próximo Mantenimiento:</p>
                  <p className="font-bold text-primary">{nextMaintenanceDate ? format(nextMaintenanceDate, "PPP", { locale: es }) : "N/A"}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tareas Realizadas</h3>
                <div className="flex gap-2">
                  <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Ej: Limpieza de ventiladores" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())} />
                  <Button type="button" onClick={handleAddTask}><Plus className="mr-2 h-4 w-4" />Agregar Tarea</Button>
                  <Button type="button" variant="outline" onClick={handleSuggestTasks} disabled={isSuggesting || !equipmentType}>
                    {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Sugerir
                  </Button>
                </div>
                {suggestedTasks.length > 0 && (
                  <div className="p-3 bg-secondary/50 rounded-lg space-y-2">
                    <p className="text-sm font-medium">Sugerencias para {equipmentType}:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTasks.map((task, i) => <Button type="button" key={i} size="sm" variant="secondary" onClick={() => handleAddSuggestedTask(task)}>{task}</Button>)}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md">
                      <div className="w-6 text-center">
                        {task.status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {task.status === 'checked' && task.relevance && (
                          <Tooltip>
                            <TooltipTrigger>
                              {task.relevance.isRelevant ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-yellow-500" />}
                            </TooltipTrigger>
                            <TooltipContent><p>{task.relevance.relevanceExplanation}</p></TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="flex-1">{task.description}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTask(task.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No se han agregado tareas.</p>}
                </div>
              </div>
              <Separator />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Adicionales</FormLabel>
                  <FormControl><Textarea placeholder="Comentarios adicionales sobre el mantenimiento..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <CardFooter className="p-0 pt-4">
                 <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                   {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Guardar Mantenimiento
                 </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
