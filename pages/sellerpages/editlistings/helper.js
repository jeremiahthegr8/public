// helpers.js
import { storage } from '../../../database/config.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js';

/**
 * Sanitize input to prevent basic XSS.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeInput(input) {
  return input.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>}
 */
export async function uploadFile(file, folder) {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB.');
  }
  const fileName = Date.now() + '_' + file.name;
  const storageRef = ref(storage, `${folder}/${fileName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Returns the current month/year in "MM/YYYY" format.
 * @returns {string}
 */
export function getListingMonth() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${month}/${year}`;
}
