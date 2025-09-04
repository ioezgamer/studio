// lib/firebase-admin.ts
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config();

let adminDb: admin.firestore.Firestore | null = null;

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.error("ERROR CRÍTICO: La variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON no está configurada.");
  console.error("Asegúrate de tener un archivo .env.local con el contenido de tu clave de servicio JSON.");
} else {
  try {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);

    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK inicializado correctamente.");
    }
    
    adminDb = getFirestore();

  } catch (error) {
    console.error("Error al parsear o inicializar Firebase Admin SDK:", error);
    // Opcional: podrías querer que la app falle ruidosamente aquí si la conexión es crítica.
    // throw new Error("No se pudo inicializar Firebase Admin SDK. Revisa las credenciales.");
  }
}

export { adminDb };
