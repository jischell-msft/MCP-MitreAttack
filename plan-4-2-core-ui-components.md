# Core UI Components

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on creating the core UI components that will be used throughout the frontend application. These reusable components will provide a consistent user experience and improve development efficiency.

## Requirements
- Create a library of reusable UI components
- Implement form controls with proper validation
- Build container and layout components
- Create data display components
- Implement navigation and feedback components

## Tasks

### 4.2.1. Create button and form control components
- Implement Button component with variants
- Create Input and TextArea components
- Implement Select and MultiSelect components
- Build Checkbox and Radio components
- Create FileUpload component
- Implement form validation

### 4.2.2. Implement card and container components
- Create Card component with variants
- Build Panel and Paper components
- Implement Grid and Flex layout components
- Create Divider component
- Build Box component for spacing

### 4.2.3. Create table and list components
- Implement Table component with sorting
- Create List and ListItem components
- Build DataGrid with pagination
- Implement expandable sections
- Create TreeView component

### 4.2.4. Implement navigation components
- Create Navbar component
- Build Sidebar with collapsible sections
- Implement Tabs component
- Create Breadcrumbs component
- Build Pagination controls

### 4.2.5. Create loading and error state components
- Implement LoadingSpinner component
- Create Skeleton loaders
- Build ErrorMessage component
- Implement EmptyState component
- Create LoadingOverlay

### 4.2.6. Implement modal and dialog components
- Create Modal component
- Build Dialog with actions
- Implement Drawer component
- Create Popover and Tooltip
- Build ConfirmDialog component

### 4.2.7. Add notification components
- Create Toast notification system
- Implement Alert component
- Build Badge component
- Create ProgressBar and Stepper
- Implement StatusIndicator

### 4.2.8. Create documentation for component library
- Implement Storybook setup
- Create component documentation
- Build usage examples
- Document component props
- Create accessibility guidelines

## Implementation Guidance

The implementation should:
- Follow a consistent design system
- Use TypeScript interfaces for component props
- Implement proper accessibility (ARIA attributes, keyboard navigation)
- Create responsive components that work on different screen sizes
- Include comprehensive test coverage

Start by creating the button and form components, then move on to containers and layout. Next, implement data display components, and finally add navigation, modals, and notifications.

## Button Component

Create a versatile Button component:

```typescript
// components/ui/Button/Button.tsx
import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...rest
}) => {
  const classNames = [
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classNames}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className={styles.spinner} />}
      {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
      <span className={styles.content}>{children}</span>
      {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
    </button>
  );
};
```

## Form Components

Create form components with validation support:

```typescript
// components/ui/Input/Input.tsx
import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.scss';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  id,
  ...rest
}, ref) => {
  const uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  const containerClasses = [
    styles.container,
    fullWidth ? styles.fullWidth : '',
    error ? styles.error : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label htmlFor={uniqueId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrapper}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          id={uniqueId}
          ref={ref}
          className={styles.input}
          aria-invalid={!!error}
          aria-describedby={
            error 
              ? `${uniqueId}-error` 
              : helperText 
                ? `${uniqueId}-helper` 
                : undefined
          }
          {...rest}
        />
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
      </div>
      {error && (
        <p id={`${uniqueId}-error`} className={styles.errorText}>
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${uniqueId}-helper`} className={styles.helperText}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
```

## File Upload Component

Create a specialized file upload component for document analysis:

```typescript
// components/ui/FileUpload/FileUpload.tsx
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
```

## Table Component

Create a flexible table component:

```typescript
// components/ui/Table/Table.tsx
import React, { useState, ReactNode } from 'react';
import styles from './Table.module.scss';

export interface TableColumn<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  width?: string;
  className?: string;
  sortable?: boolean;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  onSort?: (column: keyof T, direction: 'asc' | 'desc') => void;
  loading?: boolean;
  keyExtractor: (row: T) => string;
}

export function Table<T>({
  data,
  columns,
  emptyMessage = 'No data available',
  className,
  onRowClick,
  onSort,
  loading = false,
  keyExtractor,
}: TableProps<T>): JSX.Element {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable || typeof column.accessor !== 'string') return;

    const accessor = column.accessor as keyof T;
    
    if (sortColumn === accessor) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      onSort?.(accessor, newDirection);
    } else {
      setSortColumn(accessor);
      setSortDirection('asc');
      onSort?.(accessor, 'asc');
    }
  };

  const renderCell = (row: T, column: TableColumn<T>): ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    
    return row[column.accessor] as ReactNode;
  };

  const containerClasses = [
    styles.container,
    loading ? styles.loading : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {loading && <div className={styles.loadingOverlay}>Loading...</div>}
      
      <table className={styles.table}>
        <thead className={styles.header}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`${styles.headerCell} ${column.className || ''} ${column.sortable ? styles.sortable : ''}`}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column)}
              >
                <div className={styles.headerContent}>
                  {column.header}
                  
                  {column.sortable && typeof column.accessor === 'string' && sortColumn === column.accessor && (
                    <span className={styles.sortIcon}>
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody className={styles.body}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyMessage}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={`${styles.row} ${onRowClick ? styles.clickable : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`${styles.cell} ${column.className || ''}`}
                  >
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

## Modal Component

Create a reusable modal component:

```typescript
// components/ui/Modal/Modal.tsx
import React, { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../Button/Button';
import styles from './Modal.module.scss';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '500px',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, closeOnEscape]);

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={`${styles.modal} ${className || ''}`}
        ref={modalRef}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        <div className={styles.header}>
          {title && (
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
          )}
          <Button
            variant="text"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </Button>
        </div>
        
        <div className={styles.content}>
          {children}
        </div>
        
        {footer && (
          <div className={styles.footer}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
```

## Notification Component

Create a notification system:

```typescript
// components/ui/Notifications/Notifications.tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Notifications.module.scss';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  autoClose?: boolean;
  duration?: number;
}

interface NotificationsProps {
  notifications: Notification[];
  dispatch: React.Dispatch<any>;
}

export const Notifications: React.FC<NotificationsProps> = ({
  notifications,
  dispatch,
}) => {
  useEffect(() => {
    // Auto-close notifications
    notifications.forEach((notification) => {
      if (notification.autoClose !== false) {
        const timer = setTimeout(() => {
          dispatch({
            type: 'REMOVE_NOTIFICATION',
            payload: notification.id,
          });
        }, notification.duration || 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, dispatch]);

  const handleClose = (id: string) => {
    dispatch({
      type: 'REMOVE_NOTIFICATION',
      payload: id,
    });
  };

  if (notifications.length === 0) return null;

  return createPortal(
    <div className={styles.container}>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${styles.notification} ${styles[notification.type]}`}
          role="alert"
        >
          <div className={styles.icon}>
            {getIconForType(notification.type)}
          </div>
          <div className={styles.message}>{notification.message}</div>
          <button
            className={styles.closeButton}
            onClick={() => handleClose(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
          {notification.autoClose !== false && (
            <div
              className={styles.progressBar}
              style={{
                animationDuration: `${notification.duration || 5000}ms`,
              }}
            />
          )}
        </div>
      ))}
    </div>,
    document.body
  );
};

function getIconForType(type: Notification['type']): JSX.Element {
  switch (type) {
    case 'info':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      );
    case 'success':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      );
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
        </svg>
      );
    case 'error':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
  }
}
```

## Layout Components

Create flexible layout components:

```typescript
// components/ui/Layout/Grid.tsx
import React, { ReactNode } from 'react';
import styles from './Grid.module.scss';

type GridAlign = 'start' | 'center' | 'end' | 'stretch';
type GridJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
type GridSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type GridDirection = 'row' | 'column';

export interface GridProps {
  children: ReactNode;
  container?: boolean;
  item?: boolean;
  xs?: number | 'auto'; // 1-12, auto
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
  spacing?: GridSpacing;
  align?: GridAlign;
  justify?: GridJustify;
  direction?: GridDirection;
  wrap?: boolean;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  container = false,
  item = false,
  xs,
  sm,
  md,
  lg,
  xl,
  spacing = 'md',
  align,
  justify,
  direction = 'row',
  wrap = true,
  className,
  ...rest
}) => {
  const classNames = [
    container ? styles.container : '',
    item ? styles.item : '',
    spacing !== 'none' && container ? styles[`spacing-${spacing}`] : '',
    align && container ? styles[`align-${align}`] : '',
    justify && container ? styles[`justify-${justify}`] : '',
    direction !== 'row' && container ? styles[`direction-${direction}`] : '',
    !wrap && container ? styles.nowrap : '',
    xs !== undefined ? styles[`xs-${xs}`] : '',
    sm !== undefined ? styles[`sm-${sm}`] : '',
    md !== undefined ? styles[`md-${md}`] : '',
    lg !== undefined ? styles[`lg-${lg}`] : '',
    xl !== undefined ? styles[`xl-${xl}`] : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
};

// components/ui/Layout/Flex.tsx
import React, { ReactNode } from 'react';
import styles from './Flex.module.scss';

type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type FlexJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type FlexGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface FlexProps {
  children: ReactNode;
  direction?: FlexDirection;
  align?: FlexAlign;
  justify?: FlexJustify;
  wrap?: FlexWrap;
  gap?: FlexGap;
  grow?: number;
  shrink?: number;
  basis?: string;
  className?: string;
}

export const Flex: React.FC<FlexProps> = ({
  children,
  direction = 'row',
  align,
  justify,
  wrap = 'nowrap',
  gap = 'none',
  grow,
  shrink,
  basis,
  className,
  ...rest
}) => {
  const classNames = [
    styles.flex,
    styles[`direction-${direction}`],
    align ? styles[`align-${align}`] : '',
    justify ? styles[`justify-${justify}`] : '',
    wrap !== 'nowrap' ? styles[`wrap-${wrap}`] : '',
    gap !== 'none' ? styles[`gap-${gap}`] : '',
    className || '',
  ].filter(Boolean).join(' ');

  const style = {
    flexGrow: grow,
    flexShrink: shrink,
    flexBasis: basis,
  };

  return (
    <div className={classNames} style={style} {...rest}>
      {children}
    </div>
  );
};
```

## Card Component

Create a versatile card component:

```typescript
// components/ui/Card/Card.tsx
import React, { ReactNode } from 'react';
import styles from './Card.module.scss';

export interface CardProps {
  children: ReactNode;
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  headerActions?: ReactNode;
  footer?: ReactNode;
  className?: string;
  elevation?: 0 | 1 | 2 | 3;
  onClick?: () => void;
  hoverable?: boolean;
  bordered?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  footer,
  className,
  elevation = 1,
  onClick,
  hoverable = false,
  bordered = false,
  padding = 'md',
}) => {
  const classNames = [
    styles.card,
    styles[`elevation-${elevation}`],
    hoverable ? styles.hoverable : '',
    bordered ? styles.bordered : '',
    onClick ? styles.clickable : '',
    className || '',
  ].filter(Boolean).join(' ');

  const contentClasses = [
    styles.content,
    styles[`padding-${padding}`],
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} onClick={onClick}>
      {(title || subtitle || headerActions) && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {title && (
              <h3 className={styles.title}>
                {title}
              </h3>
            )}
            {subtitle && (
              <div className={styles.subtitle}>
                {subtitle}
              </div>
            )}
          </div>
          {headerActions && (
            <div className={styles.headerActions}>
              {headerActions}
            </div>
          )}
        </div>
      )}
      
      <div className={contentClasses}>
        {children}
      </div>
      
      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};
```

## Loading Components

Create loading and empty state components:

```typescript
// components/ui/LoadingSpinner/LoadingSpinner.tsx
import React from 'react';
import styles from './LoadingSpinner.module.scss';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  label?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  label,
  className,
}) => {
  const spinnerClasses = [
    styles.spinner,
    styles[`size-${size}`],
    styles[`color-${color}`],
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.container}>
      <div className={spinnerClasses} role="status">
        <span className={styles.visuallyHidden}>Loading...</span>
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
};

// components/ui/EmptyState/EmptyState.tsx
import React, { ReactNode } from 'react';
import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string | ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  const classNames = [
    styles.container,
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {icon && <div className={styles.icon}>{icon}</div>}
      
      {title && <h3 className={styles.title}>{title}</h3>}
      
      {description && (
        <div className={styles.description}>
          {description}
        </div>
      )}
      
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
```

## Component Library Documentation

Set up Storybook for component documentation:

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;

// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'text', 'danger'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    children: 'Text Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    children: 'Large Button',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
    children: 'Full Width Button',
  },
};

export const WithIcons: Story = {
  args: {
    children: 'Button with Icons',
    leftIcon: <span>🔍</span>,
    rightIcon: <span>→</span>,
  },
};
```
