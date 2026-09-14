import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api/client';

type Row = [string, string];

export default function DomesticAirports() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    apiGet<{ airports: Row[] }>('/reference/domestic-airports').then((r) => setRows(r.airports));
  }, []);

  const addRow = () => setRows([...rows, ['', '']]);
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
  const updateRow = (i: number, key: 'code' | 'name', value: string) => {
    const next = [...rows];
    next[i] = key === 'code' ? [value, next[i][1]] : [next[i][0], value];
    setRows(next);
  };
  const save = async () => {
    const cleaned = rows.filter((a) => a[0].trim() !== '');
    cleaned.sort((a, b) => a[0].localeCompare(b[0]));
    await apiPut('/reference/domestic-airports', { airports: cleaned });
    setRows(cleaned);
  };

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card">
        <div className="section-label">
          Domestic Airports{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>
            — used as the From / To dropdowns on Domestic Application; changes apply system-wide immediately
          </span>
        </div>
        <div className="flight-table-wrap">
          <table className="flight-table">
            <thead>
              <tr>
                <th>ICAO/IATA (e.g. HECA/CAI)</th>
                <th>Airport name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((a, i) => (
                  <tr key={i}>
                    <td>
                      <input value={a[0]} placeholder="e.g. HEBL/ELX" onChange={(e) => updateRow(i, 'code', e.target.value)} />
                    </td>
                    <td>
                      <input value={a[1]} placeholder="e.g. El Alamein" onChange={(e) => updateRow(i, 'name', e.target.value)} />
                    </td>
                    <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => removeRow(i)}>
                      &times;
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ color: '#94a3b8' }}>
                    No airports yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="add-row-btn" style={{ marginBottom: 0 }} onClick={addRow}>
            + Add airport
          </button>
          <button type="button" className="primary-btn" style={{ width: 'auto', marginTop: 0, padding: '8px 16px' }} onClick={save}>
            Save &amp; sort A–Z
          </button>
        </div>
      </div>
    </div>
  );
}
