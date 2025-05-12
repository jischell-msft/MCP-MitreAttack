import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '../Button/Button';
import styles from './FileUpload.module.scss';

export interface FileUploadProps {
    onFileSelected: (file: File) => void;
    accept?: string;
    maxSize?: number; // in bytes
    label?: string;
    error?: string;
    supportedFormats?: string[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
    onFileSelected,
    accept = 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
    maxSize = 50 * 1024 * 1024, // 50MB default
    label = 'Upload a document',
    error,
    supportedFormats = ['PDF', 'DOCX', 'TXT', 'HTML', 'MD', 'RTF'],
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const validateFile = (file: File): boolean => {
        // Check file size
        if (file.size > maxSize) {
            setFileError(`File is too large. Maximum size is ${formatBytes(maxSize)}.`);
            return false;
        }

        // Check file type
        const acceptedTypes = accept.split(',');
        if (!acceptedTypes.includes(file.type)) {
            setFileError(`Unsupported file type. Please upload ${supportedFormats.join(', ')}.`);
            return false;
        }

        setFileError(null);
        return true;
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
                onFileSelected(file);
            }
        }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (validateFile(file)) {
                setSelectedFile(file);
                onFileSelected(file);
            }
        }
    };

    const handleButtonClick = () => {
        inputRef.current?.click();
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className={styles.container}>
            <div
                className={`${styles.dropzone} ${dragActive ? styles.active : ''} ${fileError || error ? styles.error : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className={styles.input}
                    accept={accept}
                    onChange={handleChange}
                />

                <div className={styles.content}>
                    <div className={styles.icon}>
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                        </svg>
                    </div>

                    {selectedFile ? (
                        <div className={styles.fileInfo}>
                            <p className={styles.fileName}>{selectedFile.name}</p>
                            <p className={styles.fileSize}>{formatBytes(selectedFile.size)}</p>
                        </div>
                    ) : (
                        <>
                            <p className={styles.title}>{label}</p>
                            <p className={styles.description}>
                                Drag and drop a file here, or click to select a file
                            </p>
                            <p className={styles.formats}>
                                Supported formats: {supportedFormats.join(', ')}
                            </p>
                            <p className={styles.maxSize}>
                                Maximum size: {formatBytes(maxSize)}
                            </p>
                        </>
                    )}

                    <Button
                        variant="primary"
                        onClick={handleButtonClick}
                        className={styles.button}
                    >
                        {selectedFile ? 'Change File' : 'Select File'}
                    </Button>
                </div>
            </div>

            {(fileError || error) && (
                <p className={styles.errorText}>{fileError || error}</p>
            )}
        </div>
    );
};
