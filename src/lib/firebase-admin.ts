// lib/firebase-admin.ts
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb: admin.firestore.Firestore | null = null;

// Lee el contenido del JSON de la variable de entorno
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountJson) {
  // Lanza un error claro si la variable de entorno no está configurada.
  throw new Error('La variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY no está configurada. Revisa tu archivo .env.local.');
}

try {
  // Reemplaza los escapes de nueva línea literales por caracteres de nueva línea reales.
  // Esto es crucial para que JSON.parse() maneje correctamente la clave privada.
  const correctedJsonString = serviceAccountJson.replace(/\\n/g, '\n');
  const serviceAccount: ServiceAccount = JSON.parse(correctedJsonString);

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin SDK inicializado correctamente.");
  }
  
  adminDb = getFirestore();

} catch (error) {
  console.error("Error al parsear o inicializar Firebase Admin SDK:", error);
  // Lanza un error si el JSON es inválido para detener la ejecución
  throw new Error("No se pudo inicializar Firebase Admin SDK. El contenido de la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY podría ser inválido.");
}

export { adminDb };
