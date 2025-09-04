// lib/firebase-admin.ts
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

let adminDb: admin.firestore.Firestore | null = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('Las variables de entorno de Firebase (PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL) no están configuradas. Revisa tu archivo .env.local.');
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    privateKey,
    clientEmail,
  };

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK inicializado correctamente.");
  }
  
  adminDb = getFirestore();

} catch (error) {
  console.error("Error al inicializar Firebase Admin SDK:", error);
  // Lanza un error si la configuración es inválida para detener la ejecución
  throw new Error("No se pudo inicializar Firebase Admin SDK. Verifica que las variables de entorno de Firebase estén correctas en tu archivo .env.local.");
}

export { adminDb };
