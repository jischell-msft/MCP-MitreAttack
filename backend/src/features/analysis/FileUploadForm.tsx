import React, { useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { FileUpload } from '../../components/ui/FileUpload/FileUpload';
import { AnalysisOptions } from './AnalysisOptions';
import styles from './FileUploadForm.module.scss';

interface FileUploadFormProps {
    onSubmit: (file: File) => void;
    isSubmitting: boolean;
    options: any;
    onOptionsChange: (options: any) => void;
}

export const FileUploadForm: React.FC<FileUploadFormProps> = ({
    onSubmit,
    isSubmitting,
    options,
    onOptionsChange,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [showOptions, setShowOptions] = useState(false);

    const handleFileSelected = (selectedFile: File) => {
        setFile(selectedFile);
        setFileError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!file) {
            setFileError('Please select a file to upload');
            return;
        }

        onSubmit(file);
    };

    const toggleOptions = () => {
        setShowOptions(!showOptions);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.uploadContainer}>
                <FileUpload
                    onFileSelected={handleFileSelected}
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html,text/markdown,application/rtf"
                    maxSize={50 * 1024 * 1024} // 50MB
                    error={fileError}
                    supportedFormats={['PDF', 'DOCX', 'TXT', 'HTML', 'MD', 'RTF']}
                    label={file ? undefined : 'Upload Document for Analysis'}
                />
            </div>

            <div className={styles.optionsContainer}>
                <Button
                    type="button"
                    variant="text"
                    onClick={toggleOptions}
                    className={styles.optionsToggle}
                >
                    {showOptions ? 'Hide Options' : 'Show Options'}
                </Button>

                {showOptions && (
                    <AnalysisOptions
                        options={options}
                        onChange={onOptionsChange}
                        disabled={isSubmitting}
                    />
                )}
            </div>

            <div className={styles.actions}>
                <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting || !file}
                    fullWidth
                >
                    {isSubmitting ? 'Analyzing...' : 'Analyze Document'}
                </Button>
            </div>
        </form>
    );
};
