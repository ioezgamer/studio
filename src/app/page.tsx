'use client';

import * as React from 'react';
import { History, Wrench, LogOut } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceForm } from '@/components/maintenance-form';
import { MaintenanceHistory } from '@/components/maintenance-history';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Home() {
  const { user, userRole, loading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("history");

  const canEdit = userRole === 'admin' || userRole === 'editor';

  React.useEffect(() => {
    // Corregido: Solo redirigir si la carga ha terminado y no hay usuario.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Si el usuario puede editar, la pestaña por defecto es el registro.
  // Si no, es el historial.
  React.useEffect(() => {
    if(canEdit) {
      setActiveTab("dashboard");
    } else {
      setActiveTab("history");
    }
  }, [canEdit]);


  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }
  
  const tabs = [
    canEdit && { value: "dashboard", label: "Registro", icon: Wrench },
    { value: "history", label: "Historial", icon: History },
  ].filter(Boolean) as { value: string; label: string; icon: React.ElementType }[];


  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="w-full flex justify-between items-center mb-8 pb-4 border-b">
          <div>
            <div className="inline-flex items-center gap-3">
              <Wrench className="h-10 w-10 text-primary" />
              <h1 className="text-5xl font-bold text-primary font-headline">
                TechCare iOez
              </h1>
            </div>
            <p className="text-muted-foreground text-lg mt-1">
              Registro de Mantenimiento de Equipos iOez
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user.email && (
              <div className="text-right hidden sm:block">
                <p className="font-semibold">{user.email}</p>
                <p className="text-sm text-muted-foreground capitalize">{userRole}</p>
              </div>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cerrar Sesión</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}>
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {canEdit && (
              <TabsContent value="dashboard">
                <MaintenanceForm />
              </TabsContent>
            )}
          <TabsContent value="history">
            <MaintenanceHistory />
          </TabsContent>
        </Tabs>
        
        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>Creado por la iA, impulsado por iOez</p>
        </footer>
      </div>
    </main>
  );
}
