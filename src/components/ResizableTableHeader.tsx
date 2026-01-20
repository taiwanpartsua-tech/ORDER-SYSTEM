import React from 'react';
import { ColumnResizer } from './ColumnResizer';

interface ResizableTableHeaderProps {
  columnKey: string;
  width?: number;
  minWidth?: number;
  className?: string;
  children: React.ReactNode;
  onResize?: (columnKey: string, e: React.MouseEvent) => void;
  isResizing?: boolean;
}

export function ResizableTableHeader({
  columnKey,
  width,
  minWidth = 50,
  className = '',
  children,
  onResize,
  isResizing
}: ResizableTableHeaderProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (onResize) {
      onResize(columnKey, e);
    }
  };

  const style: React.CSSProperties = {
    position: 'relative',
    minWidth: `${minWidth}px`,
    ...(width ? { width: `${width}px`, maxWidth: `${width}px` } : {})
  };

  return (
    <th className={className} style={style}>
      <div className="relative">
        {children}
        <ColumnResizer onMouseDown={handleMouseDown} isResizing={isResizing} />
      </div>
    </th>
  );
}
