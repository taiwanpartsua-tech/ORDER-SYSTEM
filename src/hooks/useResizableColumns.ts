import { useState, useCallback, useEffect, useRef } from 'react';
import { saveColumnWidths, loadColumnWidths, ColumnWidths } from '../utils/columnWidths';

export function useResizableColumns(tableKey: string, defaultWidths: ColumnWidths = {}) {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    const saved = loadColumnWidths(tableKey);
    return { ...defaultWidths, ...saved };
  });

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  useEffect(() => {
    saveColumnWidths(tableKey, columnWidths);
  }, [columnWidths, tableKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent, columnKey: string, currentWidth: number) => {
    e.preventDefault();
    setResizingColumn(columnKey);
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;

    const diff = e.clientX - startXRef.current;
    const newWidth = Math.max(50, startWidthRef.current + diff);

    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn]: newWidth
    }));
  }, [resizingColumn]);

  const handleMouseUp = useCallback(() => {
    setResizingColumn(null);
  }, []);

  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizingColumn, handleMouseMove, handleMouseUp]);

  const getColumnWidth = (columnKey: string, defaultWidth: number = 150) => {
    return columnWidths[columnKey] || defaultWidth;
  };

  const resetWidths = () => {
    setColumnWidths(defaultWidths);
  };

  return {
    columnWidths,
    resizingColumn,
    handleMouseDown,
    getColumnWidth,
    resetWidths
  };
}
