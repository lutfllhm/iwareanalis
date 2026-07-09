'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { Download, ChevronLeft, ChevronRight, Search, Calendar, FileSpreadsheet } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortKey?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  totalRows: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  
  // Date filter support
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
  
  // Additional controls
  extraHeaderControls?: React.ReactNode;
  exportFileName?: string;
  showExportButtons?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading,
  totalRows,
  page,
  limit,
  onPageChange,
  onLimitChange,
  searchTerm,
  onSearchChange,
  sortBy,
  sortOrder,
  onSort,
  startDate,
  endDate,
  onDateRangeChange,
  extraHeaderControls,
  exportFileName = 'data_export',
  showExportButtons = true,
}: DataTableProps<T>) {

  const handleSortClick = (colKey: string) => {
    if (!onSort) return;
    const isAsc = sortBy === colKey && sortOrder === 'asc';
    onSort(colKey, isAsc ? 'desc' : 'asc');
  };

  // Excel (.xlsx) Download
  const handleExportExcel = () => {
    if (data.length === 0) return;
    
    // Flatten rows for spreadsheet readability
    const exportData = data.map((row) => {
      const item: Record<string, any> = {};
      columns.forEach((col) => {
        if (typeof col.accessor === 'function') {
          // If accessor is a render function, try to extract value or skip
          item[col.header] = row[col.sortKey || ''] || '';
        } else {
          item[col.header] = row[col.accessor as string];
        }
      });
      return item;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${exportFileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // CSV Download
  const handleExportCSV = () => {
    if (data.length === 0) return;
    
    const exportData = data.map((row) => {
      const item: Record<string, any> = {};
      columns.forEach((col) => {
        if (typeof col.accessor === 'function') {
          item[col.header] = row[col.sortKey || ''] || '';
        } else {
          item[col.header] = row[col.accessor as string];
        }
      });
      return item;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportFileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalRows / limit);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
      
      {/* 1. FILTER & EXPORT HEADER TOOLBAR */}
      <div className="p-5 border-b border-border flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-muted/20">
        
        {/* Global Search & Date Range */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          {/* Global search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Cari data..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-150 text-foreground"
            />
          </div>

          {/* Optional Date Range picker inputs */}
          {onDateRangeChange && (
            <div className="flex items-center space-x-2 bg-card border border-input rounded-xl px-3 py-2">
              <Calendar className="text-muted-foreground flex-shrink-0" size={16} />
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => onDateRangeChange(e.target.value, endDate || '')}
                className="bg-transparent text-xs text-foreground focus:outline-none w-28"
              />
              <span className="text-muted-foreground text-xs">s/d</span>
              <input
                type="date"
                value={endDate || ''}
                onChange={(e) => onDateRangeChange(startDate || '', e.target.value)}
                className="bg-transparent text-xs text-foreground focus:outline-none w-28"
              />
            </div>
          )}
        </div>

        {/* Buttons / Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {extraHeaderControls}

          {showExportButtons && (
            <div className="flex items-center bg-secondary rounded-xl p-1 border border-border">
              <button
                onClick={handleExportExcel}
                disabled={data.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-card hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent transition-all duration-150"
                title="Ekspor ke Excel"
              >
                <FileSpreadsheet size={14} className="text-emerald-500" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={data.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-card hover:shadow-sm disabled:opacity-50 disabled:hover:bg-transparent transition-all duration-150"
                title="Ekspor ke CSV"
              >
                <Download size={14} className="text-primary" />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. TABLE BODY */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`p-4 font-bold text-muted-foreground text-xs uppercase tracking-wider select-none ${
                    col.sortKey && onSort ? 'cursor-pointer hover:text-foreground' : ''
                  }`}
                  onClick={() => col.sortKey && handleSortClick(col.sortKey)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.header}</span>
                    {col.sortKey && onSort && sortBy === col.sortKey && (
                      <span className="text-[10px] text-primary">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              // Loading skeletons
              Array.from({ length: limit }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                  Tidak ada data yang ditemukan.
                </td>
              </tr>
            ) : (
              // Data rendering
              data.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                  {columns.map((col, cIdx) => {
                    let cellVal: React.ReactNode;
                    if (typeof col.accessor === 'function') {
                      cellVal = col.accessor(row);
                    } else {
                      cellVal = row[col.accessor as string] as React.ReactNode;
                    }

                    return (
                      <td key={cIdx} className="p-4 text-foreground font-medium">
                        {col.render ? col.render(row) : cellVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. PAGINATION FOOTER TOOLBAR */}
      <div className="p-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Pagination Limits */}
        <div className="flex items-center space-x-2.5">
          <span className="text-xs text-muted-foreground">Tampilkan</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
            className="px-2 py-1.5 rounded-lg border border-input bg-card text-xs text-foreground focus:outline-none"
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
          </select>
          <span className="text-xs text-muted-foreground">
            dari {totalRows} total data
          </span>
        </div>

        {/* Next/Previous triggers */}
        <div className="flex items-center space-x-1 justify-end">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1 || loading}
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="px-3.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-bold">
            {page} / {totalPages || 1}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0 || loading}
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
