'use client';

export interface UploadProgressEvent {
  progress:  number;
  state:     string;
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

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = 'aha_social_unsigned';

const MAX_SIZE_BYTES     = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg','image/png','image/gif','image/webp',
  'video/mp4','video/quicktime',
];

export async function uploadCreative(
  file: File,
  uid: string,
  postId: string,
  onProgress?: (event: UploadProgressEvent) => void
): Promise<UploadResult> {
  if (file.size > MAX_SIZE_BYTES) throw new Error(`Arquivo "${file.name}" excede 50 MB.`);
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error(`Tipo não suportado: ${file.type}`);

  const formData = new FormData();
  formData.append('file',           file);
  formData.append('upload_preset',  UPLOAD_PRESET);
  formData.append('folder',         `aha-social/${uid}/${postId}`);
  formData.append('public_id',      `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`);

  return new Promise((resolve, reject) => {
    const xhr          = new XMLHttpRequest();
    const resourceType = file.type.startsWith('video') ? 'video' : 'image';
    const url          = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress?.({ progress, state: 'running', bytesTransferred: e.loaded, totalBytes: e.total });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText) as { secure_url: string; public_id: string };
        resolve({ url: res.secure_url, path: res.public_id, name: file.name, type: file.type, size: file.size });
      } else {
        reject(new Error(`Upload falhou: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Erro de rede no upload.')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelado.')));
    xhr.open('POST', url);
    xhr.send(formData);
  });
}

export async function uploadAccountAvatar(
  file: File, uid: string, accountId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  const result = await uploadCreative(file, uid, `avatars/${accountId}`, (e) => onProgress?.(e.progress));
  return result.url;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024)                return `${bytes} B`;
  if (bytes < 1024 * 1024)        return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export async function deleteFile(_path: string): Promise<void> {
  console.warn('deleteFile: use server-side Cloudinary API');
}
