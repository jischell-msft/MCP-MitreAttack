# Report Viewing Pages

## Context
We're building a Multi-agent Coordination Platform (MCP) server that evaluates documents against the MITRE ATT&CK framework. This step focuses on implementing the report viewing pages, which allow users to view a list of all analysis reports and detailed information about individual reports. These pages will include filtering, sorting, and visualization components.

## Requirements
- Create a page for listing all analysis reports
- Implement filtering and sorting capabilities
- Build detailed report view with technique matches
- Add visualization for report data
- Support export functionality
- Implement intuitive navigation between related views

## Tasks

### 4.4.1. Create report listing page layout
- Implement page container
- Create filter and search controls
- Build report table/list display
- Add pagination controls
- Implement empty state handling

### 4.4.2. Implement report table with pagination
- Create sortable table component
- Implement pagination logic
- Add row-level actions
- Create column configuration
- Implement loading states

### 4.4.3. Add filtering and sorting controls
- Create filter form
- Implement date range selector
- Add search functionality
- Create tag filtering
- Implement sorting options

### 4.4.4. Create detailed report view layout
- Implement report header with metadata
- Create summary section
- Build technique matches display
- Add source document information
- Create navigation breadcrumbs

### 4.4.5. Implement technique match display
- Create expandable match cards
- Implement confidence score visualization
- Add context highlighting
- Create match filtering
- Implement MITRE reference links

### 4.4.6. Add report export functionality
- Create export button
- Implement format selection
- Add download handling
- Create export previews
- Implement export status feedback

### 4.4.7. Create summary visualization components
- Implement tactics coverage heatmap
- Create technique confidence chart
- Build key findings display
- Add summary statistics
- Implement timeline visualization

### 4.4.8. Test report viewing workflow
- Verify pagination
- Test filter functionality
- Verify detailed view displays
- Test export functionality
- Validate visualizations

## Implementation Guidance

The implementation should:
- Follow the design system established in previous steps
- Use React Query for data fetching and caching
- Implement proper loading and error states
- Create responsive layouts for different screen sizes
- Ensure accessibility for all interactive elements

Start by creating the report listing page, then implement the table with pagination. Add filtering and sorting, create the detailed report view, and implement the technique match display. Finally, add export functionality and summary visualizations.

## Report List Page

Create the main report listing page:

```typescript
// features/reports/ReportsListPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card/Card';
import { Table, TableColumn } from '../../components/ui/Table/Table';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { Button } from '../../components/ui/Button/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { ReportFilters } from './ReportFilters';
import { ReportsService } from '../../services/api/reports-service';
import { formatDistanceToNow } from 'date-fns';
import { ReportSummary, ReportFilters as FilterParams } from '../../types/reports';
import styles from './ReportsListPage.module.scss';

export const ReportsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterParams>({
    page: 1,
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });

  // Fetch reports with React Query
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => ReportsService.getReports(filters),
    keepPreviousData: true, // Keep old data while fetching new data
  });

  const handleRowClick = (report: ReportSummary) => {
    navigate(`/reports/${report.id}`);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleFilterChange = (newFilters: Partial<FilterParams>) => {
    // Reset to page 1 when filters change
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Table column definitions
  const columns: TableColumn<ReportSummary>[] = [
    {
      header: 'Source',
      accessor: (row) => {
        if (row.url) {
          return (
            <div className={styles.sourceCell}>
              <span className={styles.urlIcon}>🔗</span>
              <span className={styles.sourceText}>{row.url}</span>
            </div>
          );
        } else if (row.filename) {
          return (
            <div className={styles.sourceCell}>
              <span className={styles.fileIcon}>📄</span>
              <span className={styles.sourceText}>{row.filename}</span>
            </div>
          );
        }
        return 'Unknown source';
      },
      width: '40%',
      className: styles.sourceColumn,
    },
    {
      header: 'Date',
      accessor: (row) => formatDistanceToNow(new Date(row.timestamp), { addSuffix: true }),
      width: '15%',
      sortable: true,
      className: styles.dateColumn,
    },
    {
      header: 'Techniques',
      accessor: (row) => (
        <div className={styles.matchCountCell}>
          <span className={styles.matchCount}>{row.matchCount}</span>
          <span className={styles.highConfidenceCount}>
            ({row.highConfidenceCount} high confidence)
          </span>
        </div>
      ),
      width: '20%',
      sortable: true,
      className: styles.matchCountColumn,
    },
    {
      header: 'Top Techniques',
      accessor: (row) => (
        <div className={styles.topTechniquesCell}>
          {row.topTechniques.map((technique, index) => (
            <span key={technique.id} className={styles.techniqueBadge}>
              {technique.id}
            </span>
          ))}
        </div>
      ),
      width: '20%',
      className: styles.topTechniquesColumn,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className={styles.actionsCell}>
          <Button
            variant="outline"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/reports/${row.id}`);
            }}
          >
            View
          </Button>
        </div>
      ),
      width: '5%',
      className: styles.actionsColumn,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.basicFilters}>
        <div className={styles.searchContainer}>
          <Input
            placeholder="Search by URL or filename"
            value={localFilters.url || ''}
            onChange={(e) => handleChange('url', e.target.value)}
            leftIcon={<span>🔍</span>}
          />
        </div>
        
        <div className={styles.sortContainer}>
          <Select
            options={sortOptions}
            value={localFilters.sortBy}
            onChange={(value) => handleChange('sortBy', value)}
            placeholder="Sort by"
            label="Sort by"
          />
        </div>
        
        <div className={styles.sortOrderContainer}>
          <Select
            options={sortOrderOptions}
            value={localFilters.sortOrder}
            onChange={(value) => handleChange('sortOrder', value)}
            placeholder="Order"
            label="Order"
          />
        </div>
        
        <div className={styles.actionsContainer}>
          <Button
            variant="outline"
            onClick={toggleExpand}
          >
            {expanded ? 'Hide Filters' : 'More Filters'}
          </Button>
          
          <Button
            variant="primary"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className={styles.advancedFilters}>
          <div className={styles.dateRangeContainer}>
            <DateRangePicker
              startDate={localFilters.dateFrom}
              endDate={localFilters.dateTo}
              onDatesChange={({ startDate, endDate }) => {
                handleChange('dateFrom', startDate);
                handleChange('dateTo', endDate);
              }}
              label="Date Range"
            />
          </div>
          
          <div className={styles.minMatchesContainer}>
            <Input
              type="number"
              label="Minimum Techniques"
              value={localFilters.minMatches || ''}
              onChange={(e) => handleChange('minMatches', parseInt(e.target.value) || undefined)}
              min={0}
            />
          </div>
          
          <div className={styles.tacticsContainer}>
            <Select
              options={tacticsOptions}
              value={localFilters.tactics || []}
              onChange={(value) => handleChange('tactics', value)}
              placeholder="Select Tactics"
              label="Tactics"
              multiple
            />
          </div>
          
          <div className={styles.resetContainer}>
            <Button
              variant="text"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
```

## Report Detail Page

Create the detailed report view:

```typescript
// features/reports/ReportDetailPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Tabs, Tab } from '../../components/ui/Tabs/Tabs';
import { ReportSummaryView } from './ReportSummaryView';
import { TechniqueMatchesList } from './TechniqueMatchesList';
import { TacticsHeatmap } from './TacticsHeatmap';
import { ExportReportModal } from './ExportReportModal';
import { ReportsService } from '../../services/api/reports-service';
import { formatDate } from '../../utils/date-utils';
import styles from './ReportDetailPage.module.scss';

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'summary' | 'techniques' | 'heatmap'>('summary');
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Fetch report details with React Query
  const { 
    data: report, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => id ? ReportsService.getReportById(id) : Promise.reject('No report ID provided'),
    enabled: !!id,
  });

  const handleExport = () => {
    setExportModalOpen(true);
  };

  const handleDelete = async () => {
    if (!id || !window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await ReportsService.deleteReport(id);
      navigate('/reports');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report: ' + (error.message || 'Unknown error'));
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" label="Loading report..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.errorContainer}>
        <Card>
          <EmptyState
            title="Error Loading Report"
            description={error.message || 'An error occurred while loading the report'}
            action={
              <div className={styles.errorActions}>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/reports')}
                >
                  Back to Reports
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={styles.errorContainer}>
        <Card>
          <EmptyState
            title="Report Not Found"
            description="The requested report could not be found"
            action={
              <Button 
                variant="primary"
                onClick={() => navigate('/reports')}
              >
                Back to Reports
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.breadcrumbs}>
          <Link to="/reports" className={styles.breadcrumbLink}>Reports</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>Report Details</span>
        </div>
        
        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className={styles.deleteButton}
          >
            Delete
          </Button>
        </div>
      </div>
      
      <Card className={styles.reportHeader}>
        <div className={styles.sourceInfo}>
          <h1 className={styles.title}>
            {report.source.url ? (
              <div className={styles.urlSource}>
                <span className={styles.urlIcon}>🔗</span>
                <span className={styles.sourceText}>{report.source.url}</span>
              </div>
            ) : report.source.filename ? (
              <div className={styles.fileSource}>
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.sourceText}>{report.source.filename}</span>
              </div>
            ) : (
              'Unknown Source'
            )}
          </h1>
          
          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Analyzed:</span>
              <span className={styles.metadataValue}>{formatDate(report.timestamp)}</span>
            </div>
            
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>MITRE ATT&CK Version:</span>
              <span className={styles.metadataValue}>{report.mitreDatabaseVersion}</span>
            </div>
            
            <div className={styles.metadataItem}>
              <span className={styles.metadataLabel}>Techniques Detected:</span>
              <span className={styles.metadataValue}>
                {report.summary.matchCount} 
                <span className={styles.highConfidenceText}>
                  ({report.summary.highConfidenceCount} high confidence)
                </span>
              </span>
            </div>
          </div>
        </div>
      </Card>
      
      <Card className={styles.contentCard}>
        <Tabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        >
          <Tab id="summary" label="Summary">
            <ReportSummaryView summary={report.summary} />
          </Tab>
          
          <Tab id="techniques" label="Technique Matches">
            <TechniqueMatchesList matches={report.detailedMatches} />
          </Tab>
          
          <Tab id="heatmap" label="Tactics Heatmap">
            <TacticsHeatmap 
              tacticsBreakdown={report.summary.tacticsBreakdown} 
              techniques={report.detailedMatches}
            />
          </Tab>
        </Tabs>
      </Card>
      
      <ExportReportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        reportId={id!}
      />
    </div>
  );
};
```

## Technique Matches List

Create the component for displaying technique matches:

```typescript
// features/reports/TechniqueMatchesList.tsx
import React, { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { TechniqueMatchCard } from './TechniqueMatchCard';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import styles from './TechniqueMatchesList.module.scss';

interface TechniqueMatch {
  techniqueId: string;
  techniqueName: string;
  confidenceScore: number;
  matchedText: string;
  context: string;
  textPosition?: {
    startChar: number;
    endChar: number;
  };
}

interface TechniqueMatchesListProps {
  matches: TechniqueMatch[];
}

export const TechniqueMatchesList: React.FC<TechniqueMatchesListProps> = ({ matches }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'id'>('confidence');
  
  // Filter and sort matches
  const filteredMatches = matches
    .filter((match) => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          match.techniqueId.toLowerCase().includes(searchLower) ||
          match.techniqueName.toLowerCase().includes(searchLower) ||
          match.matchedText.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    })
    .filter((match) => {
      // Apply confidence filter
      if (confidenceFilter === 'high') {
        return match.confidenceScore >= 85;
      } else if (confidenceFilter === 'medium') {
        return match.confidenceScore >= 60 && match.confidenceScore < 85;
      } else if (confidenceFilter === 'low') {
        return match.confidenceScore < 60;
      }
      
      return true; // 'all'
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortBy === 'confidence') {
        return b.confidenceScore - a.confidenceScore;
      } else {
        return a.techniqueId.localeCompare(b.techniqueId);
      }
    });

  const confidenceOptions = [
    { value: 'all', label: 'All Confidences' },
    { value: 'high', label: 'High Confidence (85+)' },
    { value: 'medium', label: 'Medium Confidence (60-84)' },
    { value: 'low', label: 'Low Confidence (<60)' },
  ];

  const sortOptions = [
    { value: 'confidence', label: 'Sort by Confidence' },
    { value: 'id', label: 'Sort by Technique ID' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search techniques"
            leftIcon={<span>🔍</span>}
          />
        </div>
        
        <div className={styles.filterContainer}>
          <Select
            options={confidenceOptions}
            value={confidenceFilter}
            onChange={(value) => setConfidenceFilter(value)}
            placeholder="Filter by confidence"
          />
        </div>
        
        <div className={styles.sortContainer}>
          <Select
            options={sortOptions}
            value={sortBy}
            onChange={(value) => setSortBy(value as 'confidence' | 'id')}
            placeholder="Sort by"
          />
        </div>
      </div>
      
      <div className={styles.matchesList}>
        {filteredMatches.length === 0 ? (
          <EmptyState
            title="No Matching Techniques"
            description={
              searchTerm || confidenceFilter !== 'all'
                ? "No techniques match your current filters"
                : "No techniques were detected in this document"
            }
          />
        ) : (
          filteredMatches.map((match) => (
            <TechniqueMatchCard
              key={`${match.techniqueId}-${match.textPosition?.startChar || Math.random()}`}
              match={match}
            />
          ))
        )}
      </div>
    </div>
  );
};
```

## Technique Match Card

Create the card for displaying individual technique matches:

```typescript
// features/reports/TechniqueMatchCard.tsx
import React, { useState } from 'react';
import { Card } from '../../components/ui/Card/Card';
import { Button } from '../../components/ui/Button/Button';
import styles from './TechniqueMatchCard.module.scss';

interface TechniqueMatch {
  techniqueId: string;
  techniqueName: string;
  confidenceScore: number;
  matchedText: string;
  context: string;
  textPosition?: {
    startChar: number;
    endChar: number;
  };
}

interface TechniqueMatchCardProps {
  match: TechniqueMatch;
}

export const TechniqueMatchCard: React.FC<TechniqueMatchCardProps> = ({ match }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 85) return '#34a853'; // High confidence (green)
    if (score >= 60) return '#fbbc04'; // Medium confidence (yellow)
    return '#ea4335'; // Low confidence (red)
  };

  // Format context with highlighted match text
  const formatContext = (context: string, matchedText: string): React.ReactNode => {
    if (!context.includes(matchedText)) {
      return <span>{context}</span>;
    }

    const parts = context.split(matchedText);
    return (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className={styles.highlightedText}>{matchedText}</span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  return (
    <Card
      className={`${styles.card} ${expanded ? styles.expanded : ''}`}
      elevation={1}
    >
      <div className={styles.header} onClick={toggleExpanded}>
        <div className={styles.techniqueInfo}>
          <div className={styles.techniqueId}>
            <a 
              href={`https://attack.mitre.org/techniques/${match.techniqueId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {match.techniqueId}
            </a>
          </div>
          <div className={styles.techniqueName}>{match.techniqueName}</div>
        </div>
        
        <div className={styles.confidenceScore}>
          <div 
            className={styles.confidenceBar} 
            style={{ 
              width: `${match.confidenceScore}%`,
              backgroundColor: getConfidenceColor(match.confidenceScore)
            }}
          />
          <div className={styles.confidenceText}>{match.confidenceScore}% Confidence</div>
        </div>
      </div>
      
      {expanded && (
        <div className={styles.content}>
          <div className={styles.sectionTitle}>Matched Text:</div>
          <div className={styles.matchedText}>{match.matchedText}</div>
          
          <div className={styles.sectionTitle}>Context:</div>
          <div className={styles.context}>
            {formatContext(match.context, match.matchedText)}
          </div>
          
          <div className={styles.actions}>
            <Button
              variant="outline"
              size="small"
              onClick={() => window.open(`https://attack.mitre.org/techniques/${match.techniqueId}`, '_blank')}
            >
              View on MITRE ATT&CK
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
```

## Tactics Heatmap

Create a visualization of tactics coverage:

```typescript
// features/reports/TacticsHeatmap.tsx
import React from 'react';
import { Card } from '../../components/ui/Card/Card';
import styles from './TacticsHeatmap.module.scss';

interface TacticsHeatmapProps {
  tacticsBreakdown: Record<string, number>;
  techniques: any[];
}

export const TacticsHeatmap: React.FC<TacticsHeatmapProps> = ({ 
  tacticsBreakdown,
  techniques
}) => {
  // Define the tactics in the MITRE ATT&CK kill chain order
  const tacticsOrder = [
    { id: 'reconnaissance', name: 'Reconnaissance' },
    { id: 'resource-development', name: 'Resource Development' },
    { id: 'initial-access', name: 'Initial Access' },
    { id: 'execution', name: 'Execution' },
    { id: 'persistence', name: 'Persistence' },
    { id: 'privilege-escalation', name: 'Privilege Escalation' },
    { id: 'defense-evasion', name: 'Defense Evasion' },
    { id: 'credential-access', name: 'Credential Access' },
    { id: 'discovery', name: 'Discovery' },
    { id: 'lateral-movement', name: 'Lateral Movement' },
    { id: 'collection', name: 'Collection' },
    { id: 'command-and-control', name: 'Command and Control' },
    { id: 'exfiltration', name: 'Exfiltration' },
    { id: 'impact', name: 'Impact' },
  ];

  // Find the maximum count for scaling
  const maxCount = Math.max(...Object.values(tacticsBreakdown), 1);

  // Get techniques for a specific tactic
  const getTechniquesForTactic = (tacticId: string) => {
    return techniques.filter(technique => {
      // In a real implementation, we would need to map techniques to tactics
      // Here we're assuming the mapping exists in the data
      return technique.tactics?.includes(tacticId);
    });
  };

  // Calculate heat color based on count
  const getHeatColor = (count: number) => {
    if (count === 0) return 'var(--color-background)';
    
    const intensity = Math.min(count / maxCount, 1);
    return `rgba(234, 67, 53, ${intensity * 0.8 + 0.2})`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.description}>
        <p>
          This heatmap shows the distribution of detected techniques across the MITRE ATT&CK tactics.
          Darker colors indicate more techniques detected in that tactic category.
        </p>
      </div>
      
      <div className={styles.heatmap}>
        {tacticsOrder.map(tactic => {
          const count = tacticsBreakdown[tactic.id] || 0;
          const techniques = getTechniquesForTactic(tactic.id);
          
          return (
            <Card
              key={tactic.id}
              className={styles.tacticCard}
              style={{ backgroundColor: getHeatColor(count) }}
              onClick={() => {}}
            >
              <div className={styles.tacticHeader}>
                <div className={styles.tacticName}>{tactic.name}</div>
                <div className={styles.tacticCount}>{count}</div>
              </div>
              
              {count > 0 && (
                <div className={styles.techniques}>
                  {techniques.slice(0, 3).map((technique) => (
                    <div key={technique.techniqueId} className={styles.technique}>
                      <span className={styles.techniqueId}>{technique.techniqueId}</span>
                      <span className={styles.techniqueConfidence}>
                        {technique.confidenceScore}%
                      </span>
                    </div>
                  ))}
                  {techniques.length > 3 && (
                    <div className={styles.moreTechniques}>
                      +{techniques.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Legend:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div 
              className={styles.legendColor} 
              style={{ backgroundColor: 'rgba(234, 67, 53, 0.2)' }}
            ></div>
            <div className={styles.legendLabel}>Low</div>
          </div>
          <div className={styles.legendItem}>
            <div 
              className={styles.legendColor} 
              style={{ backgroundColor: 'rgba(234, 67, 53, 0.5)' }}
            ></div>
            <div className={styles.legendLabel}>Medium</div>
          </div>
          <div className={styles.legendItem}>
            <div 
              className={styles.legendColor} 
              style={{ backgroundColor: 'rgba(234, 67, 53, 0.8)' }}
            ></div>
            <div className={styles.legendLabel}>High</div>
          </div>
          <div className={styles.legendItem}>
            <div 
              className={styles.legendColor} 
              style={{ backgroundColor: 'rgba(234, 67, 53, 1)' }}
            ></div>
            <div className={styles.legendLabel}>Maximum</div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Export Report Modal

Create an export modal component:

```typescript
// features/reports/ExportReportModal.tsx
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
```

## Report Filters Component

Create the filtering component:

```typescript
// features/reports/ReportFilters.tsx
import React, { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import { DateRangePicker } from '../../components/ui/DateRangePicker/DateRangePicker';
import { Select } from '../../components/ui/Select/Select';
import { ReportFilters as FilterParams } from '../../types/reports';
import styles from './ReportFilters.module.scss';

interface ReportFiltersProps {
  filters: FilterParams;
  onChange: (filters: Partial<FilterParams>) => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterParams>(filters);

  const handleChange = (name: keyof FilterParams, value: any) => {
    setLocalFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    onChange(localFilters);
  };

  const handleResetFilters = () => {
    const resetFilters = {
      page: 1,
      limit: filters.limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
      url: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      minMatches: undefined,
      techniques: undefined,
      tactics: undefined,
    };
    
    setLocalFilters(resetFilters);
    onChange(resetFilters);
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const sortOptions = [
    { value: 'timestamp', label: 'Date' },
    { value: 'url', label: 'Source' },
    { value: 'matchCount', label: 'Number of Techniques' },
  ];

  const sortOrderOptions = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

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
    <div className={styles.container}>
      <div className={styles.basicFilters}>
        <div className={styles.searchContainer}>
          <Input
            placeholder="Search by URL or filename"
            value={localFilters.url || ''}
            onChange={(e) => handleChange('url', e.target.value)}
            leftIcon={<span>🔍</span>}
          />
        </div>
        
        <div className={styles.sortContainer}>
          <Select
            options={sortOptions}
            value={localFilters.sortBy}
            onChange={(value) => handleChange('sortBy', value)}
            placeholder="Sort by"
            label="Sort by"
          />
        </div>
        
        <div className={styles.sortOrderContainer}>
          <Select
            options={sortOrderOptions}
            value={localFilters.sortOrder}
            onChange={(value) => handleChange('sortOrder', value)}
            placeholder="Order"
            label="Order"
          />
        </div>
        
        <div className={styles.actionsContainer}>
          <Button
            variant="outline"
            onClick={toggleExpand}
          >
            {expanded ? 'Hide Filters' : 'More Filters'}
          </Button>
          
          <Button
            variant="primary"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className={styles.advancedFilters}>
          <div className={styles.dateRangeContainer}>
            <DateRangePicker
              startDate={localFilters.dateFrom}
              endDate={localFilters.dateTo}
              onDatesChange={({ startDate, endDate }) => {
                handleChange('dateFrom', startDate);
                handleChange('dateTo', endDate);
              }}
              label="Date Range"
            />
          </div>
          
          <div className={styles.minMatchesContainer}>
            <Input
              type="number"
              label="Minimum Techniques"
              value={localFilters.minMatches || ''}
              onChange={(e) => handleChange('minMatches', parseInt(e.target.value) || undefined)}
              min={0}
            />
          </div>
          
          <div className={styles.tacticsContainer}>
            <Select
              options={tacticsOptions}
              value={localFilters.tactics || []}
              onChange={(value) => handleChange('tactics', value)}
              placeholder="Select Tactics"
              label="Tactics"
              multiple
            />
          </div>
          
          <div className={styles.resetContainer}>
            <Button
              variant="text"
              onClick={handleResetFilters}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
```
