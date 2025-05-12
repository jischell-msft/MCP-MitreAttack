import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { startWorkflowAsync, getWorkflowStatus, isValidUuid } from '../../workflow/workflow.service';
import { logger } from '../../utils/logger';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    dest: path.join(process.cwd(), 'uploads'),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    }
});

// Configure rate limiter for document upload
const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.'
        }
    }
});

// URL Submission endpoint
router.post('/', async (req, res, next) => {
    try {
        // Check if request has a file (document upload)
        if (req.is('multipart/form-data')) {
            return next(); // Pass to document upload handler
        }

        // Validate request for URL submission
        const schema = z.object({
            url: z.string().url(),
            options: z.object({
                minConfidence: z.number().min(0).max(100).optional(),
                includeTactics: z.array(z.string()).optional(),
                maxResults: z.number().positive().optional()
            }).optional()
        });

        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: result.error.format()
                }
            });
        }

        const { url, options } = result.data;

        // Create a unique job ID
        const jobId = uuidv4();

        // Start workflow asynchronously
        startWorkflowAsync('document-analysis', {
            url,
            options
        }, jobId);

        // Return job ID for status checking
        return res.status(202).json({
            success: true,
            data: {
                jobId,
                status: 'submitted',
                message: 'Analysis job submitted successfully',
                statusUrl: `/api/analyze/${jobId}`
            }
        });
    } catch (error) {
        next(error);
    }
});

// Document upload endpoint (reuses the same path as URL submission)
router.post('/', uploadRateLimiter, upload.single('document'), async (req, res, next) => {
    try {
        // Check if request has a file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_DOCUMENT',
                    message: 'No document uploaded'
                }
            });
        }

        // Validate file
        const validationResult = validateUploadedFile(req.file);
        if (!validationResult.valid) {
            // Remove invalid file
            const uploadDir = path.join(process.cwd(), 'uploads');
            const normalizedPath = path.resolve(req.file.path);
            if (!normalizedPath.startsWith(uploadDir)) {
                return res.status(400).json({
                    success: false,
                    error: {
                       code: 'INVALID_DOCUMENT_PATH',
                       message: 'The uploaded document path is invalid'
                   }
               });
            }
            await fs.promises.unlink(normalizedPath);

            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_DOCUMENT',
                    message: validationResult.message
                }
            });
        }

        // Parse options if provided
        let options = {};
        if (req.body.options) {
            try {
                options = JSON.parse(req.body.options);
            } catch (e) {
                // If we can't parse options, use empty object
                logger.warn('Failed to parse analysis options', { error: e.message });
            }
        }

        // Create a unique job ID
        const jobId = uuidv4();

        // Start workflow asynchronously
        startWorkflowAsync('document-analysis', {
            documentPath: req.file.path,
            documentName: req.file.originalname,
            options
        }, jobId);

        // Return job ID for status checking
        return res.status(202).json({
            success: true,
            data: {
                jobId,
                status: 'submitted',
                message: 'Document analysis job submitted successfully',
                statusUrl: `/api/analyze/${jobId}`
            }
        });
    } catch (error) {
        // Clean up file on error
        if (req.file?.path) {
            try {
                const uploadDir = path.join(process.cwd(), 'uploads');
                const normalizedPath = path.resolve(req.file.path);
                if (normalizedPath.startsWith(uploadDir)) {
                    await fs.promises.unlink(normalizedPath);
                } else {
                    logger.error('Attempted to delete a file outside the upload directory', {
                        path: req.file.path,
                        normalizedPath,
                        uploadDir
                    });
                }
            } catch (unlinkError) {
                logger.error('Failed to delete uploaded file after error', {
                    path: req.file.path,
                    originalError: error.message,
                    unlinkError: unlinkError.message
                });
            }
        }

        next(error);
    }
});

// Job status endpoint
router.get('/:jobId', async (req, res, next) => {
    try {
        const { jobId } = req.params;

        // Validate job ID format
        if (!isValidUuid(jobId)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_JOB_ID',
                    message: 'Invalid job ID format'
                }
            });
        }

        // Get workflow status
        const workflowStatus = await getWorkflowStatus(jobId);

        if (!workflowStatus) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'JOB_NOT_FOUND',
                    message: 'Analysis job not found'
                }
            });
        }

        // Map workflow status to API response
        const response = mapWorkflowStatusToResponse(workflowStatus);

        return res.status(200).json({
            success: true,
            data: response
        });
    } catch (error) {
        next(error);
    }
});

function mapWorkflowStatusToResponse(workflowStatus: any): any {
    // Calculate progress percentage based on completed tasks
    const totalTasks = 4; // prepare-document, get-mitre-data, evaluate-document, generate-report
    let completedTasks = 0;

    if (workflowStatus.status === 'completed') {
        completedTasks = totalTasks;
    } else if (workflowStatus.status === 'running') {
        // Count completed tasks
        const taskMap: Record<string, boolean> = {
            'prepare-document': false,
            'get-mitre-data': false,
            'evaluate-document': false,
            'generate-report': false
        };

        // Mark current task as in progress
        if (workflowStatus.currentTask) {
            taskMap[workflowStatus.currentTask] = true;
        }

        // Mark completed tasks
        Object.keys(workflowStatus.results || {}).forEach(task => {
            if (taskMap[task] !== undefined) {
                taskMap[task] = true;
            }
        });

        // Count completed tasks
        completedTasks = Object.values(taskMap).filter(Boolean).length;
    }

    const progress = Math.floor((completedTasks / totalTasks) * 100);

    // Build response
    const response: any = {
        jobId: workflowStatus.workflowId,
        status: workflowStatus.status,
        progress,
        currentStep: workflowStatus.currentTask || null,
        startTime: workflowStatus.startTime,
        elapsedTimeMs: Date.now() - new Date(workflowStatus.startTime).getTime()
    };

    // Add report ID if available
    if (workflowStatus.status === 'completed' &&
        workflowStatus.results &&
        workflowStatus.results['generate-report']) {
        response.reportId = workflowStatus.results['generate-report'].reportId;
        response.reportUrl = `/api/reports/${response.reportId}`;
    }

    // Add error information if failed
    if (workflowStatus.status === 'failed') {
        response.error = {
            message: workflowStatus.metadata?.failureReason || 'Unknown error',
            code: workflowStatus.metadata?.errorCode || 'UNKNOWN_ERROR'
        };
    }

    return response;
}

function validateUploadedFile(file: Express.Multer.File): { valid: boolean; message?: string } {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        return {
            valid: false,
            message: `File too large. Maximum size is ${formatBytes(maxSize)}`
        };
    }

    // Check file type
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/html',
        'text/markdown',
        'application/rtf'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            message: 'Unsupported file type. Allowed types: PDF, DOCX, TXT, HTML, Markdown, RTF'
        };
    }

    return { valid: true };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function for URL submission handling
function handleUrlSubmission(req: Request, res: Response, next: NextFunction) {
    // Remove the 'multipart/form-data' header so the URL handler works
    delete req.headers['content-type'];
    return router.handle(req, res, next);
}

export default router;
