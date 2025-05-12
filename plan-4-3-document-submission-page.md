# Document Submission Page

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on implementing the document submission page, which allows users to submit URLs or upload documents for analysis. The page will handle validation, submission, and display progress and results.

## Requirements
- Create a user-friendly interface for document submission
- Implement both URL and file upload functionality
- Add validation for inputs
- Show submission progress and status
- Handle errors gracefully
- Provide feedback on submission success

## Tasks

### 4.3.1. Build URL/document submission form
- Create page layout with tabs for URL/document
- Implement URL input field
- Add file upload component
- Create form controls
- Implement responsive design

### 4.3.2. Create validation logic
- Implement URL validation
- Add file type and size validation
- Create error message display
- Implement field-level validation
- Add form-level validation

### 4.3.3. Implement submission handling
- Create submission handlers for URL and file
- Implement API integration
- Add loading state management
- Create retry mechanism
- Implement submission tracking

### 4.3.4. Add progress indicators
- Implement progress bar for upload
- Create job status polling
- Add step indicators
- Implement animated transitions
- Create cancel functionality

### 4.3.5. Create success and error handling
- Implement success message display
- Create error message components
- Add guidance for error resolution
- Implement result redirection
- Create retry functionality

### 4.3.6. Implement recent submissions list
- Create recent submissions section
- Implement local storage for history
- Add quick resubmit functionality
- Create clear history option
- Implement submission filtering

### 4.3.7. Add analysis options
- Create advanced options section
- Implement confidence threshold setting
- Add tactic filtering options
- Create option persistence
- Implement defaults management

### 4.3.8. Test submission workflow
- Test URL submission
- Verify file upload functionality
- Test validation rules
- Verify error handling
- Test progress indicators

## Implementation Guidance

The implementation should:
- Follow the design system established in previous steps
- Implement proper form validation and error handling
- Create a seamless user experience with appropriate feedback
- Support both URL and file upload methods
- Handle various edge cases gracefully

Start by creating the form layout, then implement the validation logic and submission handling. Next, add progress indicators and success/error handling. Finally, implement the recent submissions list and analysis options.

## Document Submission Page Component

Create the main page component:

```typescript
// features/analysis/AnalysisPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card/Card';
import { Tabs, Tab } from '../../components/ui/Tabs/Tabs';
import { UrlSubmissionForm } from './UrlSubmissionForm';
import { FileUploadForm } from './FileUploadForm';
import { RecentSubmissions } from './RecentSubmissions';
import { useAnalysisOptions } from '../../hooks/useAnalysisOptions';
import { useAppContext } from '../../context/AppContext';
import { AnalysisService } from '../../services/api/analysis-service';
import styles from './AnalysisPage.module.scss';

export const AnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const { options, updateOptions } = useAnalysisOptions();
  const { dispatch } = useAppContext();
  const navigate = useNavigate();

  const handleTabChange = (tab: 'url' | 'file') => {
    setActiveTab(tab);
  };

  const handleUrlSubmit = async (url: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await AnalysisService.submitUrl(url, options);
      
      setSubmissionId(response.data.jobId);
      addToRecentSubmissions({ type: 'url', url, timestamp: new Date() });
      
      // Poll for job status and navigate to result when complete
      pollJobStatus(response.data.jobId);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: 'URL submitted successfully',
          autoClose: true
        }
      });
    } catch (error) {
      console.error('URL submission error:', error);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: error.message || 'Failed to submit URL',
          autoClose: true
        }
      });
      
      setIsSubmitting(false);
    }
  };

  const handleFileSubmit = async (file: File) => {
    setIsSubmitting(true);
    
    try {
      const response = await AnalysisService.submitDocument(file, options);
      
      setSubmissionId(response.data.jobId);
      addToRecentSubmissions({ type: 'file', filename: file.name, timestamp: new Date() });
      
      // Poll for job status and navigate to result when complete
      pollJobStatus(response.data.jobId);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: 'Document submitted successfully',
          autoClose: true
        }
      });
    } catch (error) {
      console.error('File submission error:', error);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: error.message || 'Failed to submit document',
          autoClose: true
        }
      });
      
      setIsSubmitting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await AnalysisService.getJobStatus(jobId);
        
        if (status.data.status === 'completed') {
          clearInterval(interval);
          navigate(`/reports/${status.data.reportId}`);
        } else if (status.data.status === 'failed') {
          clearInterval(interval);
          setIsSubmitting(false);
          
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              type: 'error',
              message: status.data.error?.message || 'Analysis failed',
              autoClose: true
            }
          });
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(interval);
        setIsSubmitting(false);
      }
    }, 2000); // Poll every 2 seconds
    
    // Clear interval on component unmount
    return () => clearInterval(interval);
  };

  const addToRecentSubmissions = (submission: any) => {
    // Implementation for adding to recent submissions
    // (Will be implemented in RecentSubmissions component)
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Document Analysis</h1>
      
      <div className={styles.content}>
        <div className={styles.formContainer}>
          <Card>
            <Tabs
              activeTab={activeTab}
              onChange={handleTabChange}
            >
              <Tab id="url" label="URL">
                <UrlSubmissionForm 
                  onSubmit={handleUrlSubmit}
                  isSubmitting={isSubmitting}
                  options={options}
                  onOptionsChange={updateOptions}
                />
              </Tab>
              <Tab id="file" label="Upload Document">
                <FileUploadForm 
                  onSubmit={handleFileSubmit}
                  isSubmitting={isSubmitting}
                  options={options}
                  onOptionsChange={updateOptions}
                />
              </Tab>
            </Tabs>
          </Card>
        </div>
        
        <div className={styles.recentContainer}>
          <RecentSubmissions />
        </div>
      </div>
    </div>
  );
};
```

## URL Submission Form

Implement the URL submission form:

```typescript
// features/analysis/UrlSubmissionForm.tsx
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { AnalysisOptions } from './AnalysisOptions';
import { isValidUrl } from '../../utils/validation';
import styles from './UrlSubmissionForm.module.scss';

interface UrlSubmissionFormProps {
  onSubmit: (url: string) => void;
  isSubmitting: boolean;
  options: any;
  onOptionsChange: (options: any) => void;
}

export const UrlSubmissionForm: React.FC<UrlSubmissionFormProps> = ({
  onSubmit,
  isSubmitting,
  options,
  onOptionsChange,
}) => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    // Clear previous error when user starts typing again
    if (urlError) {
      setUrlError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL
    if (!url.trim()) {
      setUrlError('URL is required');
      return;
    }
    
    if (!isValidUrl(url)) {
      setUrlError('Please enter a valid URL');
      return;
    }
    
    onSubmit(url);
  };

  const toggleOptions = () => {
    setShowOptions(!showOptions);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputContainer}>
        <Input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter URL to analyze (e.g., https://example.com/document.pdf)"
          label="Document URL"
          error={urlError}
          fullWidth
          disabled={isSubmitting}
          leftIcon={<span>🔗</span>}
          required
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
          disabled={isSubmitting}
          fullWidth
        >
          {isSubmitting ? 'Analyzing...' : 'Analyze URL'}
        </Button>
      </div>
    </form>
  );
};
```

## File Upload Form

Create the file upload form:

```typescript
// features/analysis/FileUploadForm.tsx
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
```

## Analysis Options

Create the options component:

```typescript
// features/analysis/AnalysisOptions.tsx
import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Checkbox } from '../../components/ui/Checkbox/Checkbox';
import styles from './AnalysisOptions.module.scss';

interface AnalysisOptionsProps {
  options: {
    minConfidence: number;
    includeTactics: string[];
    maxResults: number;
    useAzureOpenAI: boolean;
  };
  onChange: (options: any) => void;
  disabled?: boolean;
}

export const AnalysisOptions: React.FC<AnalysisOptionsProps> = ({
  options,
  onChange,
  disabled = false,
}) => {
  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange({
      ...options,
      minConfidence: isNaN(value) ? 0 : Math.min(100, Math.max(0, value)),
    });
  };

  const handleMaxResultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onChange({
      ...options,
      maxResults: isNaN(value) ? 10 : Math.max(1, value),
    });
  };

  const handleTacticsChange = (selectedTactics: string[]) => {
    onChange({
      ...options,
      includeTactics: selectedTactics,
    });
  };

  const handleAzureOpenAIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...options,
      useAzureOpenAI: e.target.checked,
    });
  };

  const tacticsOptions = [
    { value: 'reconnaissance', label: 'Reconnaissance' },
    { value: 'resource-development', label: 'Resource Development' },
    { value: 'initial-access', label: 'Initial Access' },
    { value: 'execution', label: 'Execution' },
    { value: 'persistence', label: 'Persistence' },
    { value: 'privilege-escalation', label: 'Privilege Escalation' },
    { value: 'defense-evasion', label: 'Defense Evasion' },
    { value: 'credential-access', label: 'Credential Access' },
    { value: 'discovery', label: 'Discovery' },
    { value: 'lateral-movement', label: 'Lateral Movement' },
    { value: 'collection', label: 'Collection' },
    { value: 'command-and-control', label: 'Command and Control' },
    { value: 'exfiltration', label: 'Exfiltration' },
    { value: 'impact', label: 'Impact' },
  ];

  return (
    <Card className={styles.optionsCard} elevation={0} bordered>
      <h4 className={styles.optionsTitle}>Analysis Options</h4>
      
      <div className={styles.optionsGrid}>
        <div className={styles.optionItem}>
          <Input
            type="number"
            label="Minimum Confidence (%)"
            value={options.minConfidence}
            onChange={handleConfidenceChange}
            min={0}
            max={100}
            disabled={disabled}
            helperText="Techniques with confidence below this value will be filtered out"
          />
        </div>
        
        <div className={styles.optionItem}>
          <Input
            type="number"
            label="Maximum Results"
            value={options.maxResults}
            onChange={handleMaxResultsChange}
            min={1}
            disabled={disabled}
            helperText="Maximum number of techniques to include in results"
          />
        </div>
        
        <div className={styles.optionItem}>
          <Select
            label="Include Tactics"
            options={tacticsOptions}
            value={options.includeTactics}
            onChange={handleTacticsChange}
            disabled={disabled}
            multiple
            helperText="Filter results to specific tactics (optional)"
          />
        </div>
        
        <div className={styles.optionItem}>
          <Checkbox
            label="Use Azure OpenAI"
            checked={options.useAzureOpenAI}
            onChange={handleAzureOpenAIChange}
            disabled={disabled}
            helperText="Enable enhanced analysis using Azure OpenAI"
          />
        </div>
      </div>
    </Card>
  );
};
```

## Recent Submissions

Implement the recent submissions component:

```typescript
// features/analysis/RecentSubmissions.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import styles from './RecentSubmissions.module.scss';

interface Submission {
  id: string;
  type: 'url' | 'file';
  url?: string;
  filename?: string;
  timestamp: Date;
  reportId?: string;
  status: 'completed' | 'failed' | 'processing' | 'pending';
}

export const RecentSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load recent submissions from local storage
    const loadSubmissions = () => {
      const stored = localStorage.getItem('recentSubmissions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert string timestamps back to Date objects
          const submissions = parsed.map((sub: any) => ({
            ...sub,
            timestamp: new Date(sub.timestamp)
          }));
          setSubmissions(submissions);
        } catch (error) {
          console.error('Error loading recent submissions:', error);
          // If there's an error, clear the corrupted data
          localStorage.removeItem('recentSubmissions');
        }
      }
    };

    loadSubmissions();
  }, []);

  const saveSubmissions = (subs: Submission[]) => {
    try {
      localStorage.setItem('recentSubmissions', JSON.stringify(subs));
    } catch (error) {
      console.error('Error saving recent submissions:', error);
    }
  };

  const addSubmission = (submission: Submission) => {
    const updatedSubmissions = [
      submission,
      ...submissions.filter(sub => 
        !(sub.type === submission.type && 
          (sub.url === submission.url || sub.filename === submission.filename))
      )
    ].slice(0, 10); // Keep only the 10 most recent

    setSubmissions(updatedSubmissions);
    saveSubmissions(updatedSubmissions);
  };

  const clearSubmissions = () => {
    setSubmissions([]);
    localStorage.removeItem('recentSubmissions');
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/reports/${reportId}`);
  };

  const handleResubmit = (submission: Submission) => {
    // Implement resubmission logic
    // This would typically call back to the parent component
  };

  if (submissions.length === 0) {
    return (
      <Card className={styles.container}>
        <EmptyState
          title="No Recent Submissions"
          description="Your recent document submissions will appear here"
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24">
              <path d="M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.5 2.54l2.52 1.53c.56-1.24.88-2.62.88-4.07 0-5.18-3.95-9.45-8.9-9.95zM12 19c-3.87 0-7-3.13-7-7 0-3.53 2.61-6.43 6-6.92V2.05c-4.95.5-8.9 4.77-8.9 9.95 0 5.52 4.47 10 9.9 10 3.03 0 5.8-1.38 7.66-3.55l-2.52-1.53C16.12 18.24 14.18 19 12 19z" />
            </svg>
          }
        />
      </Card>
    );
  }

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Submissions</h3>
        <Button
          variant="text"
          size="small"
          onClick={clearSubmissions}
        >
          Clear History
        </Button>
      </div>

      <div className={styles.list}>
        {submissions.map((submission) => (
          <div key={submission.id} className={styles.item}>
            <div className={styles.icon}>
              {submission.type === 'url' ? (
                <span className={styles.urlIcon}>🔗</span>
              ) : (
                <span className={styles.fileIcon}>📄</span>
              )}
            </div>
            
            <div className={styles.details}>
              <div className={styles.name}>
                {submission.type === 'url' 
                  ? submission.url 
                  : submission.filename}
              </div>
              
              <div className={styles.meta}>
                <span className={styles.time}>
                  {formatDistanceToNow(submission.timestamp, { addSuffix: true })}
                </span>
                
                <span className={`${styles.status} ${styles[submission.status]}`}>
                  {submission.status}
                </span>
              </div>
            </div>
            
            <div className={styles.actions}>
              {submission.reportId && submission.status === 'completed' ? (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleViewReport(submission.reportId!)}
                >
                  View
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleResubmit(submission)}
                  disabled={submission.status === 'processing'}
                >
                  Resubmit
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

## Progress Indicators

Create a job status indicator:

```typescript
// features/analysis/JobStatusIndicator.tsx
import React, { useEffect, useState } from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar/ProgressBar';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import styles from './JobStatusIndicator.module.scss';

interface JobStatusIndicatorProps {
  jobId: string;
  onCancel?: () => void;
  onComplete?: (reportId: string) => void;
  autoRefresh?: boolean;
}

export const JobStatusIndicator: React.FC<JobStatusIndicatorProps> = ({
  jobId,
  onCancel,
  onComplete,
  autoRefresh = true,
}) => {
  const [status, setStatus] = useState<any>({
    status: 'pending',
    progress: 0,
    currentStep: null,
    elapsedTimeMs: 0,
    reportId: null,
    error: null
  });
  const [intervalId, setIntervalId] = useState<number | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchStatus();
    
    // Set up interval for polling if autoRefresh is enabled
    if (autoRefresh) {
      const id = window.setInterval(fetchStatus, 2000);
      setIntervalId(id);
      
      // Clean up on unmount
      return () => {
        window.clearInterval(id);
      };
    }
  }, [jobId, autoRefresh]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/analyze/${jobId}`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        
        // Check if job is completed or failed
        if (data.data.status === 'completed' || data.data.status === 'failed') {
          // Stop polling
          if (intervalId) {
            window.clearInterval(intervalId);
            setIntervalId(null);
          }
          
          // Call onComplete callback if job completed successfully
          if (data.data.status === 'completed' && data.data.reportId && onComplete) {
            onComplete(data.data.reportId);
          }
        }
      } else {
        // Handle API error
        console.error('Error fetching job status:', data.error);
        if (intervalId) {
          window.clearInterval(intervalId);
          setIntervalId(null);
        }
      }
    } catch (error) {
      console.error('Error fetching job status:', error);
    }
  };

  const handleCancel = () => {
    // Stop polling
    if (intervalId) {
      window.clearInterval(intervalId);
      setIntervalId(null);
    }
    
    // Call onCancel callback
    if (onCancel) {
      onCancel();
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'pending':
        return 'Waiting to start...';
      case 'running':
        return status.currentStep 
          ? `Processing: ${formatStepName(status.currentStep)}` 
          : 'Processing...';
      case 'completed':
        return 'Analysis completed successfully!';
      case 'failed':
        return `Analysis failed: ${status.error?.message || 'Unknown error'}`;
      default:
        return 'Unknown status';
    }
  };

  const formatStepName = (step: string) => {
    // Convert camelCase or kebab-case to readable text
    return step
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/-/g, ' ') // Replace hyphens with spaces
      .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  };

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Analysis Status</h3>
        <div className={styles.jobId}>Job ID: {jobId}</div>
      </div>
      
      <div className={styles.status}>
        <div className={styles.statusText}>{getStatusText()}</div>
        
        <ProgressBar 
          progress={status.progress} 
          status={status.status}
        />
        
        <div className={styles.details}>
          <div className={styles.elapsed}>
            Time elapsed: {formatElapsedTime(status.elapsedTimeMs)}
          </div>
          
          {status.status === 'failed' && status.error && (
            <div className={styles.error}>
              {status.error.message}
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.actions}>
        {status.status === 'pending' || status.status === 'running' ? (
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
        ) : status.status === 'completed' && status.reportId ? (
          <Button
            variant="primary"
            onClick={() => onComplete?.(status.reportId)}
          >
            View Report
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => fetchStatus()}
          >
            Refresh Status
          </Button>
        )}
      </div>
    </Card>
  );
};
```

## Analysis Options Hook

Create a custom hook for managing analysis options:

```typescript
// hooks/useAnalysisOptions.ts
import { useState, useEffect } from 'react';

interface AnalysisOptions {
  minConfidence: number;
  includeTactics: string[];
  maxResults: number;
  useAzureOpenAI: boolean;
}

const defaultOptions: AnalysisOptions = {
  minConfidence: 65,
  includeTactics: [],
  maxResults: 20,
  useAzureOpenAI: true,
};

export const useAnalysisOptions = () => {
  const [options, setOptions] = useState<AnalysisOptions>(() => {
    // Try to load saved options from localStorage
    const savedOptions = localStorage.getItem('analysisOptions');
    if (savedOptions) {
      try {
        return { ...defaultOptions, ...JSON.parse(savedOptions) };
      } catch (error) {
        console.error('Error parsing saved options:', error);
        return defaultOptions;
      }
    }
    return defaultOptions;
  });

  // Save options to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('analysisOptions', JSON.stringify(options));
    } catch (error) {
      console.error('Error saving options:', error);
    }
  }, [options]);

  const updateOptions = (newOptions: Partial<AnalysisOptions>) => {
    setOptions(prevOptions => ({
      ...prevOptions,
      ...newOptions,
    }));
  };

  const resetOptions = () => {
    setOptions(defaultOptions);
  };

  return {
    options,
    updateOptions,
    resetOptions,
  };
};
```

## Validation Utilities

Create validation functions:

```typescript
// utils/validation.ts
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
```
