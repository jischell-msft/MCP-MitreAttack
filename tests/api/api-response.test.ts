import { sendSuccess, sendError, sendPaginatedSuccess } from '../../src/api/utils/api-response';

describe('API Response Utils', () => {
    let res: any;

    beforeEach(() => {
        // Mock Express response object
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should send a success response', () => {
        const data = { id: '123', name: 'Test' };

        sendSuccess(res, data);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data,
            meta: expect.objectContaining({
                timestamp: expect.any(String),
                version: expect.any(String)
            })
        });
    });

    it('should send a paginated success response', () => {
        const data = [{ id: '1' }, { id: '2' }];
        const page = 2;
        const limit = 10;
        const total = 25;

        sendPaginatedSuccess(res, data, page, limit, total);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            data,
            meta: expect.objectContaining({
                pagination: {
                    page,
                    limit,
                    total,
                    pages: 3
                },
                timestamp: expect.any(String),
                version: expect.any(String)
            })
        });
    });

    it('should send an error response', () => {
        const code = 'TEST_ERROR';
        const message = 'Test error message';

        sendError(res, code, message, null, 400);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code,
                message
            },
            meta: expect.objectContaining({
                timestamp: expect.any(String),
                version: expect.any(String)
            })
        });
    });

    it('should include error details when provided', () => {
        const details = { field: ['Invalid value'] };

        sendError(res, 'VALIDATION_ERROR', 'Validation failed', details, 400);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.objectContaining({
                details
            })
        }));
    });
});
