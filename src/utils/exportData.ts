export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
): void {
  if (data.length === 0) {
    alert('Немає даних для експорту');
    return;
  }

  const keys = Object.keys(data[0]) as (keyof T)[];

  const headerRow = headers
    ? keys.map(key => headers[key] || String(key)).join(',')
    : keys.join(',');

  const csvContent = [
    headerRow,
    ...data.map(row =>
      keys
        .map(key => {
          const value = row[key];
          if (value === null || value === undefined) return '';

          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    )
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportAllOrdersByCategories<T extends Record<string, any>>(
  data: T[],
  filename: string,
  categoryKey: keyof T,
  headers?: Record<string, string>
): void {
  if (data.length === 0) {
    alert('Немає даних для експорту');
    return;
  }

  const keys = Object.keys(data[0]);
  const headerRow = headers
    ? keys.map(key => headers[key] || key).join(',')
    : keys.join(',');

  const categories = new Map<string, T[]>();
  data.forEach(row => {
    const category = String(row[categoryKey] || 'Без категорії');
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(row);
  });

  const csvSections = Array.from(categories.entries()).map(([category, items]) => {
    const sectionHeader = `\n--- ${category} (${items.length}) ---\n`;
    const csvRows = items.map(row =>
      keys
        .map(key => {
          const value = row[key];
          if (value === null || value === undefined) return '';

          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    );

    return sectionHeader + headerRow + '\n' + csvRows.join('\n');
  });

  const csvContent = csvSections.join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
