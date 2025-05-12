/**
 * Service for interacting with the analysis API endpoints
 */
export class AnalysisService {
    /**
     * Submits a URL for analysis
     */
    static async submitUrl(url: string, options: any) {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                options,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit URL for analysis');
        }

        return await response.json();
    }

    /**
     * Submits a document file for analysis
     */
    static async submitDocument(file: File, options: any) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('options', JSON.stringify(options));

        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit document for analysis');
        }

        return await response.json();
    }

    /**
     * Gets the status of an analysis job
     */
    static async getJobStatus(jobId: string) {
        const response = await fetch(`/api/analyze/${jobId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to get job status');
        }

        return await response.json();
    }

    /**
     * Cancels an analysis job
     */
    static async cancelJob(jobId: string) {
        const response = await fetch(`/api/analyze/${jobId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to cancel job');
        }

        return await response.json();
    }
}
