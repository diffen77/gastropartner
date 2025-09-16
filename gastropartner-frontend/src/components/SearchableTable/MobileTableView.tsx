import React from 'react';
import { TableColumn } from '../SearchableTable';
import './MobileTableView.css';

interface MobileTableViewProps {
  columns: TableColumn[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage: string;
}

export function MobileTableView({
  columns,
  data,
  onRowClick,
  emptyMessage
}: MobileTableViewProps) {
  if (data.length === 0) {
    return (
      <div className="mobile-table-empty">
        <div className="empty-state-icon">📋</div>
        <div className="empty-state-message">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="mobile-table-view">
      {data.map((row, index) => (
        <div
          key={index}
          className={`mobile-card ${onRowClick ? 'mobile-card--clickable' : ''}`}
          onClick={() => onRowClick?.(row)}
          role={onRowClick ? 'button' : undefined}
          tabIndex={onRowClick ? 0 : undefined}
          onKeyPress={(e) => {
            if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRowClick(row);
            }
          }}
        >
          {columns.map((column) => {
            const value = row[column.key];
            const renderedValue = column.render ? column.render(value, row) : value;

            // Skip rendering if value is null/undefined and no custom render
            if (!column.render && (value === null || value === undefined)) {
              return null;
            }

            return (
              <div key={column.key} className="mobile-card-field">
                <div className="field-label" aria-label={column.label}>
                  {column.label}
                </div>
                <div className="field-value">
                  {renderedValue}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}