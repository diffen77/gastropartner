import React, { useState, useMemo } from 'react';
import './SearchableTable.css';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface SearchableTableProps {
  columns: TableColumn[];
  data: any[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  onRowClick?: (row: any) => void;
}

type SortDirection = 'asc' | 'desc' | null;

export function SearchableTable({
  columns,
  data,
  searchPlaceholder = "Sök...",
  emptyMessage = "Inga resultat hittades",
  loading = false,
  onRowClick
}: SearchableTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Filter by search term
    if (searchTerm) {
      filtered = data.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Sort data
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal === bVal) return 0;
        
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection, columns]);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return '↕';
    if (sortDirection === 'asc') return '↑';
    if (sortDirection === 'desc') return '↓';
    return '↕';
  };

  if (loading) {
    return (
      <div className="searchable-table">
        <div className="searchable-table__search">
          <div className="search-input">
            <span className="search-input__icon">🔍</span>
            <input
              type="text"
              className="search-input__field"
              placeholder={searchPlaceholder}
              disabled
            />
          </div>
        </div>
        
        <div className="table-container">
          <div className="table-loading">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Laddar data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="searchable-table">
      <div className="searchable-table__search">
        <div className="search-input">
          <span className="search-input__icon">🔍</span>
          <input
            type="text"
            className="search-input__field"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        {filteredAndSortedData.length === 0 ? (
          <div className="table-empty">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead className="data-table__header">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`data-table__header-cell ${
                      column.sortable ? 'data-table__header-cell--sortable' : ''
                    }`}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="data-table__header-content">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="data-table__sort-icon">
                          {getSortIcon(column.key)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="data-table__body">
              {filteredAndSortedData.map((row, index) => (
                <tr
                  key={index}
                  className={`data-table__row ${
                    onRowClick ? 'data-table__row--clickable' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="data-table__cell">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}