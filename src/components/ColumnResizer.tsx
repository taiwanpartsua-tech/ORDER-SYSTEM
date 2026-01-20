import React from 'react';

interface ColumnResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing?: boolean;
}

export function ColumnResizer({ onMouseDown, isResizing }: ColumnResizerProps) {
  return (
    <div
      className={`absolute top-0 right-0 w-1 h-full cursor-col-resize group hover:bg-blue-500 ${
        isResizing ? 'bg-blue-500' : ''
      }`}
      onMouseDown={onMouseDown}
      style={{ zIndex: 10 }}
    >
      <div className="absolute top-0 right-0 w-3 h-full -mr-1" />
    </div>
  );
}
