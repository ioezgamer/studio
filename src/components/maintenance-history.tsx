"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MoreHorizontal, Pencil, Trash2, Loader2, Wrench, User, FileKey, Cpu, Eye, ListChecks, StickyNote, FileDown, Image as ImageIcon, File as FileIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import {
  deleteMaintenanceRecord,
  updateMaintenanceRecord,
  getMaintenanceRecords,
  getCollection
} from "@/app/actions";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "./ui/separator";
import { PrintableReport } from "./printable-report";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";


// Types
type MaintenanceRecord = {
  id: string;
  equipment: string;
  assetNumber: string;
  user: string;
  technician: string;
  date: Date;
  tasks: { description: string }[];
  status: string;
  notes?: string;
};

type EditingRecord = Omit<MaintenanceRecord, 'date'> & {
  date: string; // La fecha se maneja como string en el formulario de edición
};

type CollectionItem = { id: string; name: string };

const statusList = ["Completado", "Pendiente", "En Progreso"];

export function MaintenanceHistory() {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [records, setRecords] = React.useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingRecord, setEditingRecord] = React.useState<EditingRecord | null>(null);
  const [viewingRecord, setViewingRecord] = React.useState<MaintenanceRecord | null>(null);
  
  const [equipmentList, setEquipmentList] = React.useState<CollectionItem[]>([]);
  const [assetNumberList, setAssetNumberList] = React.useState<CollectionItem[]>([]);
  const [userList, setUserList] = React.useState<CollectionItem[]>([]);
  const [technicianList, setTechnicianList] = React.useState<CollectionItem[]>([]);

  const [isPrinting, setIsPrinting] = React.useState(false);
  const [recordToPrint, setRecordToPrint] = React.useState<MaintenanceRecord | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'editor';
  const canDelete = userRole === 'admin';

  const detailsContentRef = React.useRef<HTMLDivElement>(null);
  const printableRef = React.useRef<HTMLDivElement>(null);

  const fetchHistory = React.useCallback(async () => {
    setLoading(true);
    const result = await getMaintenanceRecords();
    if (result.success && result.data) {
      // Convertir las fechas de string ISO a objetos Date
      const formattedRecords = result.data.map(record => ({
        ...record,
        date: parseISO(record.date),
      }));
      setRecords(formattedRecords);
    } else {
      toast({
        variant: "destructive",
        title: "Error al Cargar Historial",
        description: result.error,
      });
    }
    setLoading(false);
  }, [toast]);

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
      fetchHistory();
      fetchCollections();
    }
  }, [user, fetchHistory, fetchCollections]);
  

  const handleDelete = async (id: string) => {
    if (!user) return;
    const result = await deleteMaintenanceRecord(id, user.uid);
    if (result.success) {
      toast({
        title: "Registro Eliminado",
        description: `El registro ha sido eliminado exitosamente.`,
      });
      fetchHistory(); // Refrescar la lista
    } else {
      toast({
        title: "Error al Eliminar",
        description: result.error,
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (record: MaintenanceRecord) => {
    setEditingRecord({
      ...record,
      date: format(record.date, "yyyy-MM-dd"),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !user) return;
    
    const { id, ...dataToUpdate } = editingRecord;

    const result = await updateMaintenanceRecord(id, dataToUpdate, user.uid);
    if (result.success) {
      toast({
        title: "Registro Actualizado",
        description: `El registro ha sido actualizado exitosamente.`,
        className: "bg-accent text-accent-foreground"
      });
      setEditingRecord(null);
      fetchHistory(); // Refrescar la lista
    } else {
       toast({
        title: "Error al Actualizar",
        description: result.error,
        variant: "destructive",
      });
    }
  }

  const handleEditChange = (field: keyof EditingRecord, value: any) => {
    if (editingRecord) {
      setEditingRecord(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleExportToExcel = () => {
    const dataToExport = records.map(record => ({
      'Equipo': record.equipment,
      'N° Activo': record.assetNumber,
      'Usuario': record.user,
      'Técnico': record.technician,
      'Fecha': format(record.date, 'dd/MM/yyyy'),
      'Estado': record.status,
      'Tareas Realizadas': record.tasks.map(t => t.description).join('; '),
      'Notas': record.notes || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial de Mantenimiento");
    XLSX.writeFile(workbook, "HistorialMantenimiento.xlsx");
  };

  const handleExportDetails = async (exportType: 'pdf' | 'image') => {
    if (!viewingRecord) return;
  
    const fileName = `Detalle_Mantenimiento_${viewingRecord.assetNumber || 'ID'}_${format(viewingRecord.date, 'yyyyMMdd')}`;
  
    if (exportType === 'image') {
      if (!detailsContentRef.current) return;
      const canvas = await html2canvas(detailsContentRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${fileName}.png`;
      link.click();
    } else { // PDF export
      setRecordToPrint(viewingRecord);
      setIsPrinting(true);
  
      // We need to wait for the next render cycle for the printableRef to be attached
      setTimeout(async () => {
        const printableElement = printableRef.current;
        if (!printableElement) {
          console.error("Printable element not found.");
          setIsPrinting(false);
          setRecordToPrint(null);
          return;
        }
  
        const canvas = await html2canvas(printableElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
  
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth;
        const imgHeight = imgWidth / ratio;

        // Check if the image height is greater than the PDF height
        let height = imgHeight;
        if(height > pdfHeight) {
          height = pdfHeight;
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, height);
        pdf.save(`${fileName}.pdf`);
  
        // Cleanup
        setIsPrinting(false);
        setRecordToPrint(null);
      }, 100);
    }
  };


  return (
    <>
      <Card className="w-full shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-headline">Historial de Mantenimiento</CardTitle>
              <CardDescription>Consulta, edita o elimina registros de mantenimiento pasados.</CardDescription>
            </div>
            <Button onClick={handleExportToExcel} variant="outline" size="sm" disabled={records.length === 0 || isPrinting}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead>N° Activo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <div className="flex justify-center items-center p-4">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando registros...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                   <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No hay registros de mantenimiento.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.equipment}</TableCell>
                      <TableCell>{record.assetNumber}</TableCell>
                      <TableCell>{record.user}</TableCell>
                      <TableCell>{record.technician}</TableCell>
                      <TableCell>{record.date ? format(record.date, "PPP", { locale: es }) : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          record.status === "Completado" ? "default" : 
                          record.status === "Pendiente" ? "destructive" : "secondary"
                        } className={
                          record.status === "Completado" ? "bg-green-500" : ""
                        }>{record.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewingRecord(record)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver Detalles
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(record)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(record.id)} className="text-red-600 focus:text-red-500 focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={(isOpen) => !isOpen && setEditingRecord(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Registro de Mantenimiento</DialogTitle>
              <DialogDescription>
                Modifique los detalles del registro. Haga clic en guardar cuando haya terminado.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="equipment" className="text-right flex items-center justify-end gap-2"><Cpu className="h-4 w-4"/>Equipo</Label>
                <Select
                  value={editingRecord.equipment}
                  onValueChange={(value) => handleEditChange('equipment', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar equipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentList.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assetNumber" className="text-right flex items-center justify-end gap-2"><FileKey className="h-4 w-4"/>N° Activo</Label>
                <Select
                  value={editingRecord.assetNumber}
                  onValueChange={(value) => handleEditChange('assetNumber', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar N°..." />
                  </SelectTrigger>
                  <SelectContent>
                    {assetNumberList.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user" className="text-right flex items-center justify-end gap-2"><User className="h-4 w-4"/>Usuario</Label>
                 <Select
                  value={editingRecord.user}
                  onValueChange={(value) => handleEditChange('user', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userList.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="technician" className="text-right flex items-center justify-end gap-2"><Wrench className="h-4 w-4"/>Técnico</Label>
                 <Select
                  value={editingRecord.technician}
                  onValueChange={(value) => handleEditChange('technician', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar técnico..." />
                  </SelectTrigger>
                  <SelectContent>
                    {technicianList.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !editingRecord.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editingRecord.date ? format(parseISO(editingRecord.date), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={parseISO(editingRecord.date)}
                      onSelect={(date) => date && handleEditChange('date', format(date, 'yyyy-MM-dd'))}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">Estado</Label>
                 <Select
                  value={editingRecord.status}
                  onValueChange={(value) => handleEditChange('status', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar estado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancelar</Button>
              </DialogClose>
              <Button type="submit" onClick={handleSaveEdit}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {viewingRecord && (
        <Dialog open={!!viewingRecord} onOpenChange={(isOpen) => !isOpen && setViewingRecord(null)}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detalles del Mantenimiento</DialogTitle>
                    <DialogDescription>
                        Registro del {format(viewingRecord.date, "d 'de' MMMM 'de' yyyy", { locale: es })}.
                    </DialogDescription>
                </DialogHeader>
                <div ref={detailsContentRef} className="bg-background p-6">
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Equipo</p>
                                    <p>{viewingRecord.equipment}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <FileKey className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">N° de Activo</p>
                                    <p>{viewingRecord.assetNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Usuario del Equipo</p>
                                    <p>{viewingRecord.user}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="font-semibold">Mantenimiento por</p>
                                    <p>{viewingRecord.technician}</p>
                                </div>
                            </div>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" />Tareas Realizadas</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                                {viewingRecord.tasks.map((task, index) => (
                                    <li key={index}>{task.description}</li>
                                ))}
                            </ul>
                        </div>
                        {viewingRecord.notes && (
                            <>
                              <Separator />
                              <div>
                                  <h4 className="font-semibold mb-2 flex items-center gap-2"><StickyNote className="h-4 w-4 text-muted-foreground" />Notas Adicionales</h4>
                                  <p className="text-sm bg-secondary/50 p-3 rounded-md">{viewingRecord.notes}</p>
                              </div>
                            </>
                        )}
                    </div>
                </div>
                <DialogFooter className="sm:justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleExportDetails('image')} disabled={isPrinting}><ImageIcon className="mr-2 h-4 w-4" />Exportar como Imagen</Button>
                      <Button variant="outline" onClick={() => handleExportDetails('pdf')} disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileIcon className="mr-2 h-4 w-4" />}
                        Exportar como PDF
                      </Button>
                    </div>
                    <DialogClose asChild>
                        <Button type="button">Cerrar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
      
      {isPrinting && recordToPrint && (
        <div className="fixed top-0 left-0" style={{ zIndex: -100, opacity: 0 }}>
          <div ref={printableRef}>
            <PrintableReport record={recordToPrint} />
          </div>
        </div>
      )}

    </>
  );
}
