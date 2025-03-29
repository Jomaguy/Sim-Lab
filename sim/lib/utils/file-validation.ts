import { createLogger } from '../logs/console-logger'

const logger = createLogger('FileValidation')

// File type definitions
export const ACCEPTED_FILE_TYPES = {
  // Images
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  // Documents
  documents: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  // Data
  data: ['application/json', 'text/csv'],
  // Spreadsheets
  spreadsheets: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  // Code
  code: ['text/javascript', 'application/javascript', 'text/typescript', 'text/x-python', 'text/html', 'text/css']
}

// Combine all accepted file types
export const ALL_ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_FILE_TYPES.images,
  ...ACCEPTED_FILE_TYPES.documents,
  ...ACCEPTED_FILE_TYPES.data,
  ...ACCEPTED_FILE_TYPES.spreadsheets,
  ...ACCEPTED_FILE_TYPES.code
]

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB max file size
export const MAX_TOTAL_SIZE = 20 * 1024 * 1024 // 20MB max total size for all attachments

// File type validation
export function isValidFileType(file: File): boolean {
  return ALL_ACCEPTED_FILE_TYPES.includes(file.type)
}

// File size validation
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE
}

// File category determination
export function getFileCategory(file: File): 'image' | 'document' | 'data' | 'spreadsheet' | 'code' | 'unknown' {
  const { type } = file
  
  if (ACCEPTED_FILE_TYPES.images.includes(type)) return 'image'
  if (ACCEPTED_FILE_TYPES.documents.includes(type)) return 'document'
  if (ACCEPTED_FILE_TYPES.data.includes(type)) return 'data'
  if (ACCEPTED_FILE_TYPES.spreadsheets.includes(type)) return 'spreadsheet'
  if (ACCEPTED_FILE_TYPES.code.includes(type)) return 'code'
  
  return 'unknown'
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase()
}

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// Extract text content from file (basic implementation)
export const extractTextContent = async (file: File): Promise<string | null> => {
  try {
    // For text-based files, we can read them directly
    if (file.type.startsWith('text/') || 
        file.type === 'application/json' || 
        file.type.includes('javascript') || 
        file.type.includes('typescript')) {
      const text = await file.text()
      return text
    }
    
    // For other types, a more specialized parser would be needed
    // This is a placeholder - full implementation would require dedicated parsers
    return null
  } catch (error) {
    logger.error('Error extracting text content:', { error })
    return null
  }
}

// Validate a batch of files
export const validateFiles = (files: File[]): { 
  valid: File[],
  invalid: Array<{file: File, reason: string}>,
  totalSize: number 
} => {
  const result = {
    valid: [] as File[],
    invalid: [] as Array<{file: File, reason: string}>,
    totalSize: 0
  }

  for (const file of files) {
    // Check file type
    if (!isValidFileType(file)) {
      result.invalid.push({
        file,
        reason: `File type "${file.type}" is not supported`
      })
      continue
    }

    // Check individual file size
    if (!isValidFileSize(file)) {
      result.invalid.push({
        file,
        reason: `File exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      })
      continue
    }

    // Add to valid files and update total size
    result.valid.push(file)
    result.totalSize += file.size
  }

  // Check total size limit
  if (result.totalSize > MAX_TOTAL_SIZE) {
    // Move files from valid to invalid until we're under the limit
    while (result.totalSize > MAX_TOTAL_SIZE && result.valid.length > 0) {
      const fileToRemove = result.valid.pop()!
      result.totalSize -= fileToRemove.size
      result.invalid.push({
        file: fileToRemove,
        reason: `Total attachment size exceeds ${MAX_TOTAL_SIZE / (1024 * 1024)}MB limit`
      })
    }
  }

  return result
} 