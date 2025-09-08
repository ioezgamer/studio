
'use server';

import {
  generateMaintenanceTasks,
  type GenerateMaintenanceTasksInput,
} from '@/ai/flows/generate-maintenance-tasks';
import {
  classifyMaintenanceTaskRelevance,
  type ClassifyMaintenanceTaskRelevanceInput,
} from '@/ai/flows/classify-maintenance-task-relevance';

import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// --- FUNCIONES DE IA ---
export async function suggestTasksAction(
  input: GenerateMaintenanceTasksInput
) {
  try {
    const result = await generateMaintenanceTasks(input);
    return result.tasks;
  } catch (error) {
    console.error('Error suggesting tasks:', error);
    return [];
  }
}

export async function checkTaskRelevanceAction(
  input: ClassifyMaintenanceTaskRelevanceInput
) {
  try {
    const result = await classifyMaintenanceTaskRelevance(input);
    return result;
  } catch (error) {
    console.error('Error checking task relevance:', error);
    return {
      isRelevant: false,
      relevanceExplanation: 'Could not check relevance due to an error.',
    };
  }
}

// --- FUNCIONES DE AYUDA ---
const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error && error.message) return error.message;
    return "Ocurrió un error inesperado.";
};

// --- FUNCIÓN DE ROL ---
export async function getUserRole(uid: string): Promise<'admin' | 'editor' | 'viewer'> {
    if (!uid) {
        console.warn("getUserRole: No se proporcionó UID. Se devuelve 'viewer'.");
        return 'viewer';
    }

    if (!adminDb) {
      throw new Error("Firebase Admin SDK no está inicializado. Revisa la configuración del servidor.");
    }

    try {
        const userDocRef = adminDb.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const role = userData?.role;
            if (role === 'admin' || role === 'editor' || role === 'viewer') {
                console.log(`getUserRole: Rol encontrado '${role}' para UID: ${uid}`);
                return role;
            } else {
                console.warn(`getUserRole: UID ${uid} tiene un rol inválido '${role}'. Se asigna 'viewer'.`);
                return 'viewer';
            }
        } else {
            console.warn(`getUserRole: No se encontró documento de usuario para UID: ${uid}. Se asigna 'viewer'.`);
            return 'viewer';
        }
    } catch (error) {
        console.error(`Error al obtener el rol para UID ${uid}:`, getErrorMessage(error));
        throw new Error(`Falló la obtención del rol del usuario. Podría ser un problema de configuración del servidor.`);
    }
}


// --- ACCIÓN PARA CREAR DOCUMENTO DE USUARIO ---
export async function createUserDocument(uid: string, email: string) {
  if (!adminDb) {
    return { success: false, error: "Firebase Admin SDK no inicializado." };
  }
  if (!uid || !email) {
    return { success: false, error: "UID o email inválidos." };
  }
  try {
    const userDocRef = adminDb.collection('users').doc(uid);
    await userDocRef.set({
      email: email,
      role: 'viewer' // Rol por defecto para nuevos usuarios
    });
    console.log(`Successfully created user document for UID: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error("Error creating user document with Admin SDK: ", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

// --- ACCIONES CRUD ---
export async function addMaintenanceRecord(record: any, uid: string) {
  if (!adminDb) {
    return { success: false, error: "Firebase Admin SDK no inicializado." };
  }
  try {
    const userRole = await getUserRole(uid);
    if (userRole !== 'admin' && userRole !== 'editor') {
      throw new Error("Permiso denegado. No tienes autorización para realizar esta acción.");
    }
    
    const { date, ...restOfRecord } = record;
    const cleanRecord = {
      ...restOfRecord,
      date: Timestamp.fromDate(new Date(date)),
      createdAt: Timestamp.now(),
      createdBy: uid,
    };

    await adminDb.collection('maintenance').add(cleanRecord);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error adding document with Admin SDK: ", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateMaintenanceRecord(id: string, record: any, uid: string) {
    if (!adminDb) {
      return { success: false, error: "Firebase Admin SDK no inicializado." };
    }
    try {
        const userRole = await getUserRole(uid);
        if (userRole !== 'admin' && userRole !== 'editor') {
          throw new Error("Permiso denegado. No tienes autorización para realizar esta acción.");
        }

        if (!id) throw new Error("ID de documento inválido.");
        const recordRef = adminDb.collection('maintenance').doc(id);
        
        const { date, ...dataToUpdate } = record;

        if (date) {
            dataToUpdate.date = Timestamp.fromDate(new Date(date));
        }

        await recordRef.update(dataToUpdate);
        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating document with Admin SDK: ", error);
        return { success: false, error: getErrorMessage(error) };
    }
}

export async function deleteMaintenanceRecord(id: string, uid: string) {
  if (!adminDb) {
    return { success: false, error: "Firebase Admin SDK no inicializado." };
  }
  try {
    const userRole = await getUserRole(uid);
    if (userRole !== 'admin') {
      throw new Error("Permiso denegado. No tienes autorización para realizar esta acción.");
    }
    await adminDb.collection('maintenance').doc(id).delete();
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting document with Admin SDK: ", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function addCollectionItem(collectionName: string, name: string, uid: string) {
  if (!adminDb) {
    return { success: false, error: "Firebase Admin SDK no inicializado." };
  }
  try {
    const userRole = await getUserRole(uid);
    if (userRole !== 'admin' && userRole !== 'editor') {
      throw new Error("Permiso denegado. No tienes autorización para realizar esta acción.");
    }
    const allowedCollections = ['equipment', 'appUsers', 'technicians', 'assetNumbers'];
    if (!allowedCollections.includes(collectionName)) {
      throw new Error(`La colección "${collectionName}" no está permitida.`);
    }
    await adminDb.collection(collectionName).add({ name });
    return { success: true, error: null };
  } catch (error) {
    console.error("Error adding item to collection with Admin SDK: ", error);
    return { success: false, error: getErrorMessage(error) };
  }
}


// --- NUEVAS ACCIONES DE LECTURA ---
export async function getMaintenanceRecords() {
  if (!adminDb) {
    return { success: false, error: "Firebase Admin SDK no inicializado." };
  }
  try {
    const snapshot = await adminDb.collection('maintenance').orderBy('createdAt', 'desc').get();
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      // Convertir Timestamps de Firestore a formatos serializables (string ISO)
      const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString();

      return {
        id: doc.id,
        ...data,
        date: date,
        createdAt: createdAt,
      };
    });
    return { success: true, data: records };
  } catch (error) {
    console.error("Error fetching maintenance records with Admin SDK:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getCollection(collectionName: string) {
  if (!adminDb) {
    return { success: false, error: "Firebase Admin SDK no inicializado." };
  }
  try {
    const allowedCollections = ['equipment', 'appUsers', 'technicians', 'assetNumbers'];
    if (!allowedCollections.includes(collectionName)) {
      throw new Error(`La colección "${collectionName}" no está permitida.`);
    }
    const snapshot = await adminDb.collection(collectionName).orderBy('name', 'asc').get();
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));
    return { success: true, data: items };
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} with Admin SDK:`, error);
    return { success: false, error: getErrorMessage(error) };
  }
}
