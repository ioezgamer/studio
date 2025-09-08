'use client';

import * as React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getMaintenanceRecords } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Wrench, Users, HardDrive } from 'lucide-react';

// --- Types ---
type MaintenanceRecord = {
  id: string;
  equipment: string;
  technician: string;
  date: string; // Fecha en formato ISO string
};

type MonthlyData = {
  name: string;
  total: number;
};

type EquipmentData = {
  name: string;
  value: number;
};

// --- Helper Functions ---
const processChartData = (records: MaintenanceRecord[]) => {
  // Procesamiento para el gráfico de barras (mantenimientos por mes)
  const monthlyCounts = records.reduce((acc, record) => {
    const month = format(parseISO(record.date), 'MMM yyyy', { locale: es });
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const monthlyData: MonthlyData[] = Object.keys(monthlyCounts).map(month => ({
    name: month.charAt(0).toUpperCase() + month.slice(1),
    total: monthlyCounts[month],
  }));

  // Procesamiento para el gráfico de pastel (mantenimientos por equipo)
  const equipmentCounts = records.reduce((acc, record) => {
    acc[record.equipment] = (acc[record.equipment] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const equipmentData: EquipmentData[] = Object.keys(equipmentCounts).map(equipment => ({
    name: equipment,
    value: equipmentCounts[equipment],
  }));

  return { monthlyData, equipmentData };
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

export function Dashboard() {
  const { toast } = useToast();
  const [records, setRecords] = React.useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const { monthlyData, equipmentData } = React.useMemo(() => processChartData(records), [records]);
  const totalRecords = records.length;
  const uniqueEquipment = new Set(records.map(r => r.equipment)).size;
  const uniqueTechnicians = new Set(records.map(r => r.technician)).size;
  
  React.useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const result = await getMaintenanceRecords();
      if (result.success && result.data) {
        setRecords(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al Cargar Datos',
          description: result.error,
        });
      }
      setLoading(false);
    };
    fetchRecords();
  }, [toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando datos del dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground">Registros de mantenimiento totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipos Únicos</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEquipment}</div>
            <p className="text-xs text-muted-foreground">Tipos de equipos con mantenimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTechnicians}</div>
             <p className="text-xs text-muted-foreground">Técnicos que han realizado trabajos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actividad de Mantenimiento Mensual</CardTitle>
            <CardDescription>Número de mantenimientos completados por mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Mantenimientos" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Equipo</CardTitle>
            <CardDescription>Porcentaje de mantenimientos por tipo de equipo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={equipmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {equipmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
