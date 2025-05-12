/**
 * Validates if a string is a properly formatted URL
 */
export const isValidUrl = (url: string): boolean => {
    try {
        // Try to create a URL object
        const parsedUrl = new URL(url);

        // Check if the protocol is http or https
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (error) {
        return false;
    }
};

/**
 * Validates a file based on type and size
 */
export const validateFile = (
    file: File,
    maxSize: number = 50 * 1024 * 1024, // 50MB default
    allowedTypes: string[] = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/html',
        'text/markdown',
        'application/rtf',
    ]
): { valid: boolean; message?: string } => {
    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            message: `File too large. Maximum size is ${formatBytes(maxSize)}`,
        };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            message: 'Unsupported file type. Please upload a PDF, DOCX, TXT, HTML, MD, or RTF file.',
        };
    }

    return { valid: true };
};

/**
 * Formats a byte size into a human-readable format
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
