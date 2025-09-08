"use client";

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wrench, ListChecks, StickyNote, Calendar, User, FileKey, Cpu } from 'lucide-react';

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

interface PrintableReportProps {
  record: MaintenanceRecord;
}

export function PrintableReport({ record }: PrintableReportProps) {
  return (
    <div className="bg-white text-black p-8 font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
      <header className="flex justify-between items-center pb-4 border-b-2 border-gray-200">
        <div className="inline-flex items-center gap-3">
          <Wrench className="h-10 w-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-blue-600">
            TechCare iOez
          </h1>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-gray-700">Reporte de Servicio de Mantenimiento</h2>
          <p className="text-sm text-gray-500">ID de Registro: {record.id}</p>
        </div>
      </header>

      <main className="mt-8">
        <section className="mb-6">
          <h3 className="text-xl font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-800">Información General</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div className="flex items-start gap-2">
              <Cpu className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-600">Equipo:</p>
                <p className="text-gray-800">{record.equipment}</p>
              </div>
            </div>
             <div className="flex items-start gap-2">
              <FileKey className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-600">N° de Activo/Serie:</p>
                <p className="text-gray-800">{record.assetNumber}</p>
              </div>
            </div>
             <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-600">Usuario del Equipo:</p>
                <p className="text-gray-800">{record.user}</p>
              </div>
            </div>
             <div className="flex items-start gap-2">
              <Wrench className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-600">Realizado por:</p>
                <p className="text-gray-800">{record.technician}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-gray-600">Fecha de Mantenimiento:</p>
                <p className="text-gray-800">{format(record.date, "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
                <div className={`h-4 w-4 mt-0.5 rounded-full ${record.status === 'Completado' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <div>
                <p className="font-bold text-gray-600">Estado:</p>
                <p className="text-gray-800">{record.status}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6">
          <h3 className="text-xl font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-800 flex items-center gap-2"><ListChecks />Tareas Realizadas</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-800 pl-4">
            {record.tasks.map((task, index) => (
              <li key={index}>{task.description}</li>
            ))}
          </ul>
        </section>

        {record.notes && (
          <section>
            <h3 className="text-xl font-semibold border-b border-gray-300 pb-2 mb-4 text-gray-800 flex items-center gap-2"><StickyNote />Notas Adicionales</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{record.notes}</p>
          </section>
        )}
      </main>

      <footer className="mt-12 pt-4 border-t-2 border-gray-200 text-center text-xs text-gray-500">
        <p>Este es un reporte generado automáticamente por TechCare iOez.</p>
        <p>Generado el: {format(new Date(), "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })}</p>
      </footer>
    </div>
  );
}
