export type ColumnWidths = {
  [columnKey: string]: number;
};

export function saveColumnWidths(tableKey: string, widths: ColumnWidths) {
  try {
    const key = `columnWidths_${tableKey}`;
    localStorage.setItem(key, JSON.stringify(widths));
  } catch (error) {
    console.error('Failed to save column widths:', error);
  }
}

export function loadColumnWidths(tableKey: string): ColumnWidths {
  try {
    const key = `columnWidths_${tableKey}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load column widths:', error);
    return {};
  }
}

export function resetColumnWidths(tableKey: string) {
  try {
    const key = `columnWidths_${tableKey}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to reset column widths:', error);
  }
}
