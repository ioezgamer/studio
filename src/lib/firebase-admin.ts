// lib/firebase-admin.ts
import admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config();

let adminDb: admin.firestore.Firestore | null = null;

// La única forma segura: usar variables de entorno.
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountJson) {
  console.error("ERROR CRÍTICO: La variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON no está configurada.");
  console.error("Por favor, crea un archivo .env.local y añade la variable con el contenido de tu clave de servicio JSON.");
} else {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

    if (serviceAccount && serviceAccount.project_id) {
      if (!getApps().length) {
        try {
          initializeApp({
            credential: cert(serviceAccount),
          });
          console.log("Firebase Admin SDK initialized successfully.");
        } catch (error: any) {
          console.error("Error initializing Firebase Admin SDK:", error.message);
        }
      }
      
      if (getApps().length > 0) {
        adminDb = getFirestore();
      }
    } else {
      console.error("Error: El contenido de FIREBASE_SERVICE_ACCOUNT_JSON es inválido o no contiene un 'project_id'.");
    }
  } catch (e) {
    console.error("Error al parsear el JSON de FIREBASE_SERVICE_ACCOUNT_JSON. Asegúrate de que es un JSON válido.", e);
  }
}

export { adminDb };
