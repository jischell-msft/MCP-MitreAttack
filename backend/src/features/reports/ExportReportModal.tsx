import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal/Modal';
import { Button } from '../../components/ui/Button/Button';
import { Radio, RadioGroup } from '../../components/ui/Radio/Radio'; // Assuming RadioGroup for better a11y
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { ReportsService } from '../../services/api/reports-service'; // API service
import styles from './ExportReportModal.module.scss';

interface ExportReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportId: string;
}

type ExportFormat = 'json' | 'csv' | 'html' | 'pdf';

interface FormatOption {
    id: ExportFormat;
    label: string;
    description: string;
}

const EXPORT_FORMAT_OPTIONS: FormatOption[] = [
    { id: 'pdf', label: 'PDF', description: 'Formatted PDF document, ideal for sharing and printing.' },
    { id: 'html', label: 'HTML', description: 'Interactive HTML document for web browser viewing.' },
    { id: 'json', label: 'JSON', description: 'Raw JSON data, suitable for programmatic use and integrations.' },
    { id: 'csv', label: 'CSV', description: 'Comma-separated values, best for spreadsheet analysis of technique matches.' },
];

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
        setError(null); // Clear previous errors on format change
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
            a.download = `report-${reportId}-${new Date().toISOString().split('T')[0]}.${selectedFormat}`; // Add date to filename
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            onClose(); // Close modal on successful export
        } catch (err: any) { // Catch any type for error
            console.error('Export error:', err);
            setError(err.message || 'An unexpected error occurred during export. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    // Reset state when modal is closed/reopened
    React.useEffect(() => {
        if (isOpen) {
            setSelectedFormat('pdf');
            setIsExporting(false);
            setError(null);
        }
    }, [isOpen]);


    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Export Report"
            ariaLabelledBy="export-report-title"
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
                        disabled={isExporting || !selectedFormat} // Disable if no format selected (though one is default)
                    >
                        {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
                    </Button>
                </>
            }
        >
            <div className={styles.container}>
                {isExporting ? (
                    <div className={styles.loadingState}>
                        <LoadingSpinner size="medium" />
                        <p className={styles.loadingText}>Preparing your {selectedFormat.toUpperCase()} report for download...</p>
                    </div>
                ) : (
                    <>
                        <RadioGroup
                            label="Select Export Format:"
                            name="exportFormat"
                            selectedValue={selectedFormat}
                            onChange={(value) => handleFormatChange(value as ExportFormat)}
                            className={styles.formatOptionsGroup}
                        >
                            {EXPORT_FORMAT_OPTIONS.map(option => (
                                <Radio
                                    key={option.id}
                                    id={`format-${option.id}`}
                                    value={option.id}
                                    label={option.label}
                                    className={styles.radioOption}
                                >
                                    <p className={styles.optionDescription}>{option.description}</p>
                                </Radio>
                            ))}
                        </RadioGroup>

                        {error && (
                            <div className={styles.errorMessage} role="alert">
                                <strong>Error:</strong> {error}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
};
