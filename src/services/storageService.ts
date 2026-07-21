import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Uploads a file to Firebase Storage in the specified admin folder
 * @param file The file to upload
 * @param folder The folder name (logos, banners, shop)
 * @returns Promise with download URL and storage path
 */
export async function uploadAdminAsset(file: File, folder: 'logos' | 'banners' | 'shop'): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/\s+/g, '_')}`;
    const storagePath = `admin/${folder}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // 1. Upload to Storage
    const snapshot = await uploadBytes(storageRef, file);
    
    // 2. Get Download URL
    const url = await getDownloadURL(snapshot.ref);

    // 3. Record in Firestore (optional, beneficial for tracking)
    await addDoc(collection(db, 'admin_assets'), {
      url,
      path: storagePath,
      folder,
      fileName,
      uploadedAt: serverTimestamp(),
      size: file.size,
      mimeType: file.type
    });

    return { url, path: storagePath };
  } catch (error: any) {
    console.error('Upload failed:', error);
    if (error.code === 'storage/unauthorized') {
      throw new Error('Permission denied. Admin privileges required.');
    }
    if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('Connection timeout. Please check your internet.');
    }
    throw error;
  }
}
