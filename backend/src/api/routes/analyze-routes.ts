import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSuccess, sendError } from '../utils/api-response';
import { ValidationError, NotFoundError } from '../errors/api-error';
import { logger } from '../../utils/logger';
import { generateUUID } from '../../utils';

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename
        const uniqueName = `${generateUUID()}_${file.originalname}`;
        cb(null, uniqueName);
    }
});

// Configure file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only certain file types
    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ValidationError(`Unsupported file type: ${file.mimetype}`));
    }
};

// Configure upload middleware
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    }
});

// Create router
export const analyzeRouter = Router();

// URL submission endpoint
analyzeRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Check if this is a file upload or URL submission
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            // Handle file upload using multer
            return upload.single('document')(req, res, (err) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return sendError(res, 'FILE_TOO_LARGE', 'File size exceeds the 50MB limit');
                        }
                        return sendError(res, 'UPLOAD_ERROR', err.message);
                    }
                    return next(err);
                }

                // Process uploaded file
                return handleDocumentUpload(req, res, next);
            });
        } else {
            // Handle URL submission
            return handleUrlSubmission(req, res, next);
        }
    } catch (error) {
        next(error);
    }
});

// Analysis status endpoint
analyzeRouter.get('/:jobId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { jobId } = req.params;

        // Validate job ID
        if (!jobId || typeof jobId !== 'string') {
            throw new ValidationError('Invalid job ID');
        }

        // TODO: Implement workflow status lookup
        // For now, return a mock response
        const mockStatus = getMockJobStatus(jobId);

        if (!mockStatus) {
            throw new NotFoundError('Analysis job', jobId);
        }

        return sendSuccess(res, mockStatus);
    } catch (error) {
        next(error);
    }
});

/**
 * Handle URL submission
 */
async function handleUrlSubmission(req: Request, res: Response, next: NextFunction) {
    try {
        // Define request schema
        const schema = z.object({
            url: z.string().url(),
            options: z.object({
                minConfidence: z.number().min(0).max(100).optional(),
                includeTactics: z.array(z.string()).optional(),
                maxResults: z.number().int().positive().optional()
            }).optional()
        });

        // Validate request
        const result = schema.safeParse(req.body);
        if (!result.success) {
            throw new ValidationError('Invalid request data', result.error.format());
        }

        const { url, options } = result.data;
        logger.info(`Received URL analysis request for: ${url}`);

        // TODO: Implement workflow orchestration
        // For now, return a mock job ID
        const jobId = generateUUID();

        return sendSuccess(
            res,
            {
                jobId,
                status: 'submitted',
                message: 'Analysis job submitted successfully',
                statusUrl: `/api/analyze/${jobId}`
            },
            {},
            202 // Accepted
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Handle document upload
 */
async function handleDocumentUpload(req: Request, res: Response, next: NextFunction) {
    try {
        // Check if file was uploaded
        if (!req.file) {
            throw new ValidationError('No file uploaded');
        }

        // Parse options
        let options = {};
        if (req.body.options) {
            try {
                options = JSON.parse(req.body.options);
            } catch (error) {
                throw new ValidationError('Invalid options format');
            }
        }

        logger.info(`Received document upload: ${req.file.originalname} (${req.file.size} bytes)`);

        // TODO: Implement document processing workflow
        // For now, return a mock job ID
        const jobId = generateUUID();

        return sendSuccess(
            res,
            {
                jobId,
                status: 'submitted',
                message: 'Document uploaded and analysis job submitted successfully',
                statusUrl: `/api/analyze/${jobId}`,
                filename: req.file.originalname,
                size: req.file.size
            },
            {},
            202 // Accepted
        );
    } catch (error) {
        // Clean up uploaded file in case of error
        if (req.file?.path) {
            try {
                const uploadDir = path.resolve('uploads'); // Define the safe root directory for uploads
                const resolvedPath = path.resolve(req.file.path); // Normalize the file path
                if (resolvedPath.startsWith(uploadDir)) { // Ensure the path is within the upload directory
                    fs.unlinkSync(resolvedPath);
                } else {
                    logger.error(`Attempted to delete a file outside the upload directory: ${resolvedPath}`);
                }
            } catch (e) {
                logger.error(`Failed to clean up uploaded file: ${e}`);
            }
        }
        next(error);
    }
}

/**
 * Get mock job status (for demo purposes)
 */
function getMockJobStatus(jobId: string): any {
    // Generate a deterministic status based on job ID
    const hash = jobId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const statusOptions = ['pending', 'running', 'completed', 'failed'];
    const status = statusOptions[hash % statusOptions.length];

    let progress = 0;
    let currentStep = null;
    let reportId = null;
    let error = null;

    // Simulate different states
    if (status === 'running') {
        progress = (hash % 90) + 10; // 10-99
        const steps = ['prepare-document', 'get-mitre-data', 'evaluate-document', 'generate-report'];
        const stepIndex = Math.floor((progress / 100) * steps.length);
        currentStep = steps[stepIndex];
    } else if (status === 'completed') {
        progress = 100;
        reportId = `report-${jobId.substring(0, 8)}`;
    } else if (status === 'failed') {
        progress = (hash % 90) + 10; // 10-99
        error = {
            code: 'PROCESSING_ERROR',
            message: 'Failed to process document'
        };
    }

    return {
        jobId,
        status,
        progress,
        currentStep,
        startTime: new Date(Date.now() - (hash * 1000)).toISOString(),
        elapsedTimeMs: hash * 1000,
        ...(reportId && {
            reportId,
            reportUrl: `/api/reports/${reportId}`
        }),
        ...(error && { error })
    };
}
