// helpers.js - Extended with additional utility functions for the seller listing page
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
 * Returns the current month/year in "mm/yyyy" format.
 * @returns {string}
 */
export function getListingMonth() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${month}/${year}`;
}

/**
 * Format a number as currency
 * @param {number|string} value - The price to format
 * @returns {string} Formatted price
 */
export function formatCurrency(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Get a human-readable time difference from now
 * @param {Date} date - The date to compare
 * @returns {string} Human readable time difference
 */
export function getTimeDifference(date) {
  const now = new Date();
  const diff = now - date;

  // Convert to seconds/minutes/hours/days
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);

  if (months > 0) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  } else if (days > 0) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Truncate text to a specific length and add ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Get color for sales trend (positive, negative, neutral)
 * @param {number} value - Value to determine trend color
 * @returns {string} CSS color value
 */
export function getTrendColor(value) {
  if (value > 0) return '#38a169'; // Green for positive
  if (value < 0) return '#e53e3e'; // Red for negative
  return '#718096'; // Gray for neutral
}

/**
 * Format date to a readable format
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  if (!date) return '';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
