import { apiRequest } from './client'

/**
 * Upload a single image file
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string, filename: string, size: number, content_type: string}>}
 */
export const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  return apiRequest('/uploads/images', {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
    headers: {}
  })
}

/**
 * Upload multiple image files
 * @param {File[]} files - Array of image files to upload
 * @returns {Promise<{results: Array, success_count: number, error_count: number}>}
 */
export const uploadImagesBatch = async (files) => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  
  return apiRequest('/uploads/images/batch', {
    method: 'POST',
    body: formData,
    headers: {}
  })
}

