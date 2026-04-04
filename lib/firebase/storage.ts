'use client';

import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './config';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

const MAX_SIZE_BYTES      = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES  = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
];

export interface UploadProgressEvent {
  progress:  number; // 0-100
  state:     UploadTaskSnapshot['state'];
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadResult {
  url:  string;
  path: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Valida e faz upload de um criativo para o Firebase Storage.
 * Atualiza o documento do post/agendamento automaticamente.
 */
export function uploadCreative(
  file: File,
  uid: string,
  postId: string,
  onProgress?: (event: UploadProgressEvent) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    // Validações
    if (file.size > MAX_SIZE_BYTES) {
      reject(new Error(`Arquivo "${file.name}" excede o limite de 50 MB.`));
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      reject(new Error(`Tipo de arquivo não suportado: ${file.type}. Use PNG, JPG, GIF, WEBP ou MP4.`));
      return;
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path          = `users/${uid}/creatives/${postId}/${Date.now()}_${sanitizedName}`;
    const fileRef       = storageRef(storage, path);
    const task          = uploadBytesResumable(fileRef, file, { contentType: file.type });

    task.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.({
          progress,
          state:            snapshot.state,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes:       snapshot.totalBytes,
        });
      },
      (error) => {
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);

        // Persist to Firestore
        try {
          await updateDoc(doc(db, `users/${uid}/posts/${postId}`), {
            creatives: arrayUnion({
              url,
              name:       file.name,
              type:       file.type,
              size:       file.size,
              uploadedAt: serverTimestamp(),
            }),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // Non-fatal: post might not exist yet (wizard step 2 before saving)
        }

        resolve({
          url,
          path,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }
    );
  });
}

/**
 * Upload de avatar / imagem de perfil de conta.
 */
export function uploadAccountAvatar(
  file: File,
  uid: string,
  accountId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      reject(new Error('Formato de avatar inválido. Use JPG, PNG ou WEBP.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Avatar deve ter no máximo 5 MB.'));
      return;
    }

    const path    = `users/${uid}/avatars/${accountId}_${Date.now()}`;
    const fileRef = storageRef(storage, path);
    const task    = uploadBytesResumable(fileRef, file);

    task.on(
      'state_changed',
      (snapshot) => {
        onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Remove um arquivo do Storage pelo path.
 */
export async function deleteFile(path: string): Promise<void> {
  const fileRef = storageRef(storage, path);
  await deleteObject(fileRef);
}

/**
 * Formata tamanho de arquivo para exibição.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
