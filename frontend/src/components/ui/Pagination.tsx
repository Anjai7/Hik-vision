import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}) => {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="pagination-bar">
      <div>
        Showing <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{start}</span> to{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{end}</span> of{' '}
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{total}</span> entries
      </div>
      <div className="pagination-controls">
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 12px' }}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <span style={{ padding: '0 8px', fontSize: '13px' }}>
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          className="btn btn-secondary"
          style={{ padding: '6px 12px' }}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
