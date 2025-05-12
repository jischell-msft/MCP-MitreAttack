import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal/Modal';
import { Button } from '../../components/ui/Button/Button';
import { Radio } from '../../components/ui/Radio/Radio';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { ReportsService } from '../../services/api/reports-service';
import styles from './ExportReportModal.module.scss';

interface ExportReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportId: string;
}

type ExportFormat = 'json' | 'csv' | 'html' | 'pdf';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
    isOpen,
    onClose,
    reportId,
}) => {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFormatChange = (format: ExportFormat) => {
        setSelectedFormat(format);
    };

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);

        try {
            const blob = await ReportsService.exportReport(reportId, selectedFormat);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${reportId}.${selectedFormat}`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Close modal
            onClose();
        } catch (error) {
            console.error('Export error:', error);
            setError(error.message || 'Failed to export report');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export Report"
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isExporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleExport}
                        loading={isExporting}
                        disabled={isExporting}
                    >
                        Export
                    </Button>
                </>
            }
        >
            <div className={styles.container}>
                {isExporting ? (
                    <div className={styles.loading}>
                        <LoadingSpinner size="medium" label="Exporting report..." />
                    </div>
                ) : (
                    <>
                        <div className={styles.formatOptions}>
                            <div className={styles.title}>Select Format:</div>

                            <div className={styles.options}>
                                <div className={styles.option}>
                                    <Radio
                                        id="format-pdf"
                                        name="format"
                                        value="pdf"
                                        checked={selectedFormat === 'pdf'}
                                        onChange={() => handleFormatChange('pdf')}
                                        label="PDF"
                                    />
                                    <div className={styles.description}>
                                        PDF document with formatted report
                                    </div>
                                </div>

                                <div className={styles.option}>
                                    <Radio
                                        id="format-html"
                                        name="format"
                                        value="html"
                                        checked={selectedFormat === 'html'}
                                        onChange={() => handleFormatChange('html')}
                                        label="HTML"
                                    />
                                    <div className={styles.description}>
                                        HTML document for web viewing
                                    </div>
                                </div>

                                <div className={styles.option}>
                                    <Radio
                                        id="format-csv"
                                        name="format"
                                        value="csv"
                                        checked={selectedFormat === 'csv'}
                                        onChange={() => handleFormatChange('csv')}
                                        label="CSV"
                                    />
                                    <div className={styles.description}>
                                        CSV spreadsheet with technique matches
                                    </div>
                                </div>

                                <div className={styles.option}>
                                    <Radio
                                        id="format-json"
                                        name="format"
                                        value="json"
                                        checked={selectedFormat === 'json'}
                                        onChange={() => handleFormatChange('json')}
                                        label="JSON"
                                    />
                                    <div className={styles.description}>
                                        Raw JSON data for programmatic use
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};
