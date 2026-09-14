import React, { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client';

type Row = { id?: string; type: string; registration: string };
type SpecialFleet = { id: string; name: string; rows: Row[] };

function FleetTable({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const update = (i: number, key: 'type' | 'registration', value: string) => {
    const next = [...rows];
    next[i] = { ...next[i], [key]: value };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  return (
    <div className="flight-table-wrap">
      <table className="flight-table">
        <thead>
          <tr>
            <th>A/C Type</th>
            <th>Registration</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={r.id || i}>
                <td>
                  <input placeholder="e.g. A320" value={r.type} onChange={(e) => update(i, 'type', e.target.value)} />
                </td>
                <td>
                  <input placeholder="e.g. SU-BXX" value={r.registration} onChange={(e) => update(i, 'registration', e.target.value)} />
                </td>
                <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => remove(i)}>
                  &times;
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ color: '#94a3b8' }}>
                No aircraft yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function sortRows(rows: Row[]): Row[] {
  return rows
    .filter((r) => r.type.trim() !== '' || r.registration.trim() !== '')
    .sort((a, b) => a.type.localeCompare(b.type) || a.registration.localeCompare(b.registration));
}

export default function Fleet() {
  const [owned, setOwned] = useState<Row[]>([]);
  const [acmi, setAcmi] = useState<Row[]>([]);
  const [special, setSpecial] = useState<SpecialFleet[]>([]);
  const [newSpecialName, setNewSpecialName] = useState('');

  const load = () => {
    apiGet<{ owned: Row[]; acmi: Row[] }>('/reference/fleet').then((r) => {
      setOwned(r.owned);
      setAcmi(r.acmi);
    });
    apiGet<{ specialFleets: SpecialFleet[] }>('/reference/fleet/special').then((r) => setSpecial(r.specialFleets));
  };
  useEffect(load, []);

  const saveMain = async (kind: 'OWNED' | 'ACMI', rows: Row[]) => {
    const sorted = sortRows(rows);
    await apiPut('/reference/fleet', { kind, rows: sorted.map((r) => ({ type: r.type, registration: r.registration })) });
    if (kind === 'OWNED') setOwned(sorted);
    else setAcmi(sorted);
  };

  const addSpecial = async () => {
    const name = newSpecialName.trim();
    if (!name) return alert('Enter a name for the special aircraft table.');
    if (special.some((f) => f.name.toLowerCase() === name.toLowerCase())) return alert('A table with this name already exists.');
    const res = await apiPost<{ specialFleet: SpecialFleet }>('/reference/fleet/special', { name });
    setSpecial([...special, res.specialFleet]);
    setNewSpecialName('');
  };
  const removeSpecial = async (id: string, name: string) => {
    if (!confirm(`Delete the "${name}" special aircraft table? This can't be undone, and it will disappear from any application still referencing it.`)) return;
    await apiDelete(`/reference/fleet/special/${id}`);
    setSpecial(special.filter((f) => f.id !== id));
  };
  const updateSpecialRows = (id: string, rows: Row[]) => setSpecial(special.map((f) => (f.id === id ? { ...f, rows } : f)));
  const saveSpecial = async (id: string) => {
    const f = special.find((x) => x.id === id);
    if (!f) return;
    const sorted = sortRows(f.rows);
    await apiPut(`/reference/fleet/special/${id}`, { rows: sorted.map((r) => ({ type: r.type, registration: r.registration })) });
    setSpecial(special.map((x) => (x.id === id ? { ...x, rows: sorted } : x)));
  };

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card">
        <div className="section-label">
          Owned / operated fleet <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>— shown as fixed data on every application</span>
        </div>
        <FleetTable rows={owned} onChange={setOwned} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <button type="button" className="add-row-btn" style={{ marginBottom: 0 }} onClick={() => setOwned([...owned, { type: '', registration: '' }])}>
            + Add aircraft
          </button>
          <button type="button" className="primary-btn" style={{ width: 'auto', marginTop: 0, padding: '8px 16px' }} onClick={() => saveMain('OWNED', owned)}>
            Save &amp; sort A–Z
          </button>
        </div>

        <div className="divider">
          <div className="section-label">
            ACMI leased fleet <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>— shown on ACMI applications only</span>
          </div>
          <FleetTable rows={acmi} onChange={setAcmi} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <button type="button" className="add-row-btn" style={{ marginBottom: 0 }} onClick={() => setAcmi([...acmi, { type: '', registration: '' }])}>
              + Add aircraft
            </button>
            <button type="button" className="primary-btn" style={{ width: 'auto', marginTop: 0, padding: '8px 16px' }} onClick={() => saveMain('ACMI', acmi)}>
              Save &amp; sort A–Z
            </button>
          </div>
        </div>

        <div className="divider">
          <div className="section-label">
            Special Aircrafts{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>
              — custom named fleet lists (e.g. "Russia") that can be attached to any application via "+ Add Aircraft"
            </span>
          </div>
          <div>
            {special.length ? (
              special.map((f) => (
                <div className="special-fleet-block" key={f.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <b>{f.name}</b>
                    <button type="button" className="ecaa-note-btn" style={{ color: '#b91c1c', borderColor: '#fecaca' }} onClick={() => removeSpecial(f.id, f.name)}>
                      Delete table
                    </button>
                  </div>
                  <FleetTable rows={f.rows} onChange={(rows) => updateSpecialRows(f.id, rows)} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <button
                      type="button"
                      className="add-row-btn"
                      style={{ marginBottom: 0 }}
                      onClick={() => updateSpecialRows(f.id, [...f.rows, { type: '', registration: '' }])}
                    >
                      + Add aircraft
                    </button>
                    <button type="button" className="primary-btn" style={{ width: 'auto', marginTop: 0, padding: '8px 16px' }} onClick={() => saveSpecial(f.id)}>
                      Save &amp; sort A–Z
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No special aircraft tables yet</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              placeholder="Table name, e.g. Russia"
              value={newSpecialName}
              onChange={(e) => setNewSpecialName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSpecial()}
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 6, padding: '9px 10px', fontSize: 13, fontFamily: 'inherit' }}
            />
            <button type="button" className="add-row-btn" style={{ margin: 0 }} onClick={addSpecial}>
              + Add table
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
