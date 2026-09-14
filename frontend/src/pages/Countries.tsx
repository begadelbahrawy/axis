import React, { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../api/client';

type Row = [string, string];

export default function Countries() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => apiGet<{ countries: Row[] }>('/reference/countries').then((r) => setRows(r.countries));
  useEffect(() => {
    load();
  }, []);

  const addRow = () => {
    const next = [...rows];
    const otherIdx = next.findIndex((c) => c[0] === 'Other');
    const insertAt = otherIdx === -1 ? next.length : otherIdx;
    next.splice(insertAt, 0, ['', '']);
    setRows(next);
  };
  const removeRow = (i: number) => {
    if (rows[i][0] === 'Other') return;
    setRows(rows.filter((_, idx) => idx !== i));
  };
  const updateRow = (i: number, key: 'en' | 'ar', value: string) => {
    if (rows[i][0] === 'Other') return;
    const next = [...rows];
    next[i] = key === 'en' ? [value, next[i][1]] : [next[i][0], value];
    setRows(next);
  };
  const save = async () => {
    const other = rows.find((c) => c[0] === 'Other');
    const rest = rows.filter((c) => c[0] !== 'Other' && c[0].trim() !== '');
    rest.sort((a, b) => a[0].localeCompare(b[0]));
    const sorted = other ? [...rest, other] : rest;
    await apiPut('/reference/countries', { countries: sorted });
    setRows(sorted);
  };

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card">
        <div className="section-label">
          Countries <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>— used across every application; changes apply system-wide immediately</span>
        </div>
        <div className="flight-table-wrap">
          <table className="flight-table">
            <thead>
              <tr>
                <th>English name</th>
                <th>Arabic name (inserted into the letter)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const isOther = c[0] === 'Other';
                return (
                  <tr key={i}>
                    <td>
                      <input value={c[0]} disabled={isOther} placeholder="e.g. Spain" onChange={(e) => updateRow(i, 'en', e.target.value)} />
                    </td>
                    <td>
                      <input value={c[1]} disabled={isOther} placeholder="e.g. إسبانيا" dir="rtl" onChange={(e) => updateRow(i, 'ar', e.target.value)} />
                    </td>
                    <td style={{ cursor: isOther ? 'default' : 'pointer', color: isOther ? '#cbd5e1' : '#dc2626' }} onClick={() => removeRow(i)}>
                      {isOther ? '' : '×'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <button type="button" className="add-row-btn" style={{ marginBottom: 0 }} onClick={addRow}>
            + Add country
          </button>
          <button type="button" className="primary-btn" style={{ width: 'auto', marginTop: 0, padding: '8px 16px' }} onClick={save}>
            Save &amp; sort A–Z
          </button>
        </div>
        <div className="note">"Other" always stays last and lets staff type a custom country by hand — it can't be removed or edited.</div>
      </div>
    </div>
  );
}
