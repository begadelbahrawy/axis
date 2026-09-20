import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, ApiError } from '../api/client';
import { FORM_TYPES, DAY_OPTIONS, REMARKS_TYPES, SEASONS, ACTIONS } from '../types';
import type { Application, FormTypeConfig } from '../types';
import { useReferenceData, groupFleetRows } from '../hooks/useReferenceData';
import { AC_TYPE_PAX, emptyTravelProgramData } from '../lib/travel';

function emptyWideRow() {
  return { remarksDep: 'PAX', remarksArr: 'PAX', days: [] as string[], fromDep: '', toDep: '', flightNoDep: '', etdDep: '', etaDep: '', fromArr: '', toArr: '', flightNoArr: '', etdArr: '', etaArr: '', periodFrom: '', periodTo: '' };
}
function emptySimpleRow() {
  return { flightNoOut: '', etdOut: '', etaOut: '', fromOut: '', toOut: '', flightNoRet: '', etdRet: '', etaRet: '', fromRet: '', toRet: '', periodFrom: '', periodTo: '', days: [] as string[], remarksOut: 'PAX', remarksRet: 'PAX' };
}
function emptyMeta() {
  return { countryEn: '', countryOther: '', seasonEn: '', lessorName: '', actionEn: '', isAdditional: false, year: String(new Date().getFullYear()), startDate: '', endDate: '' };
}

function DayChecks({ days, onToggle }: { days: string[]; onToggle: (day: string, checked: boolean) => void }) {
  return (
    <div className="day-checks">
      {DAY_OPTIONS.map((d) => (
        <label key={d}>
          <input type="checkbox" value={d} checked={days.includes(d)} onChange={(e) => onToggle(d, e.target.checked)} /> {d}
        </label>
      ))}
    </div>
  );
}

function applyDayToggle(days: string[], day: string, checked: boolean): string[] {
  if (day === 'DAILY') return checked ? ['DAILY'] : [];
  let next = days.filter((d) => d !== 'DAILY');
  if (checked) {
    if (!next.includes(day)) next = [...next, day];
  } else {
    next = next.filter((d) => d !== day);
  }
  return next;
}

function AirportField({ cfg, airports, placeholder, value, onChange }: { cfg: FormTypeConfig; airports: [string, string][]; placeholder: string; value: string; onChange: (v: string) => void }) {
  if (cfg.domesticAirports) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {airports.map(([code]) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    );
  }
  return <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />;
}

export default function NewApplication() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const ref = useReferenceData();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState('');
  const [meta, setMeta] = useState(emptyMeta());
  const [rows, setRows] = useState<any[]>([]);
  const [countrySections, setCountrySections] = useState<any[]>([]);
  const [manualFleetRows, setManualFleetRows] = useState<any[]>([]);
  const [pickedFleetRows, setPickedFleetRows] = useState<any[]>([]);
  const [aircraftBlocks, setAircraftBlocks] = useState<string[]>([]);
  const [travelProgramEnabled, setTravelProgramEnabled] = useState(false);
  const [travelProgram, setTravelProgram] = useState<any>(emptyTravelProgramData());
  const [comments, setComments] = useState('');
  const [newSectionCountry, setNewSectionCountry] = useState('');
  const [newSpecialAircraftName, setNewSpecialAircraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cfg = FORM_TYPES[formType];

  useEffect(() => {
    if (ref.countries.length && !newSectionCountry) setNewSectionCountry(ref.countries.find(([en]) => en !== 'Other')?.[0] || '');
  }, [ref.countries]);

  useEffect(() => {
    if (!editId) return;
    apiGet<{ record: Application }>(`/applications/${editId}`).then((res) => {
      const rec = res.record;
      setEditingId(rec.id);
      setFormType(rec.type);
      setMeta({ ...emptyMeta(), ...rec.data.meta });
      setRows(rec.data.rows || []);
      setCountrySections(rec.data.countrySections || []);
      setManualFleetRows(rec.data.manualFleetRows || []);
      setPickedFleetRows(rec.data.pickedFleetRows || []);
      setAircraftBlocks(rec.data.aircraftBlocks || []);
      setTravelProgramEnabled(rec.data.travelProgramEnabled || false);
      setTravelProgram({ ...emptyTravelProgramData(), ...(rec.data.travelProgram || {}) });
      setComments(rec.data.comments || '');
    });
  }, [editId]);

  const combinedFleetTypes = () => {
    const owned = Object.keys(groupFleetRows(ref.owned));
    const leased = Object.keys(groupFleetRows(ref.acmi));
    return [...new Set([...owned, ...leased])];
  };
  const regsForCombinedType = (type: string) => {
    const owned = groupFleetRows(ref.owned)[type] || [];
    const leased = groupFleetRows(ref.acmi)[type] || [];
    return [...new Set([...owned, ...leased])];
  };
  const resolveAircraftSourceRows = (src: string) => {
    if (src === 'owned') return ref.owned;
    if (src === 'acmi') return ref.acmi;
    if (src && src.startsWith('special:')) {
      const f = ref.specialFleets.find((sf) => sf.name === src.slice(8));
      return f ? f.rows : [];
    }
    return [];
  };

  const selectType = (type: string) => {
    setFormType(type);
    setRows([]);
    setCountrySections([]);
    setManualFleetRows([]);
    setPickedFleetRows([]);
    setAircraftBlocks([]);
    setTravelProgramEnabled(false);
    setTravelProgram(emptyTravelProgramData());
    const c = FORM_TYPES[type];
    setMeta((m) => ({ ...m, countryEn: '', countryOther: '', seasonEn: '', actionEn: '', isAdditional: !!c.defaultAdditional }));
  };

  const updateRow = (i: number, key: string, value: any) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  const addRow = () => setRows((r) => [...r, cfg?.style === 'wide' ? emptyWideRow() : emptySimpleRow()]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const addCountrySection = () => {
    if (!newSectionCountry) return;
    if (countrySections.some((s) => s.countryEn === newSectionCountry)) return;
    setCountrySections((s) => [...s, { countryEn: newSectionCountry, countryOther: '', rows: [] }]);
  };
  const removeCountrySection = (i: number) => setCountrySections((s) => s.filter((_, idx) => idx !== i));
  const updateSectionCountryOther = (i: number, value: string) => setCountrySections((s) => s.map((sec, idx) => (idx === i ? { ...sec, countryOther: value } : sec)));
  const addSectionRow = (sIdx: number) => setCountrySections((s) => s.map((sec, idx) => (idx === sIdx ? { ...sec, rows: [...sec.rows, emptySimpleRow()] } : sec)));
  const removeSectionRow = (sIdx: number, rIdx: number) =>
    setCountrySections((s) => s.map((sec, idx) => (idx === sIdx ? { ...sec, rows: sec.rows.filter((_: any, ri: number) => ri !== rIdx) } : sec)));
  const updateSectionRow = (sIdx: number, rIdx: number, key: string, value: any) =>
    setCountrySections((s) => s.map((sec, idx) => (idx === sIdx ? { ...sec, rows: sec.rows.map((row: any, ri: number) => (ri === rIdx ? { ...row, [key]: value } : row)) } : sec)));

  const submit = async () => {
    if (!formType) return setError('Select an application type before generating the form.');
    setError('');
    setSaving(true);
    const payload = {
      type: formType,
      meta,
      rows,
      countrySections,
      manualFleetRows,
      pickedFleetRows,
      aircraftBlocks,
      travelPages: [],
      travelProgramEnabled,
      travelProgram,
      comments,
    };
    try {
      const res = editingId ? await apiPut<{ record: Application }>(`/applications/${editingId}`, payload) : await apiPost<{ record: Application }>('/applications', payload);
      navigate(`/preview/${res.record.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the application.');
    } finally {
      setSaving(false);
    }
  };

  if (!cfg) {
    return (
      <div id="viewNew" style={{ padding: '22px 18px 28px' }}>
        <div className="modern-form-shell">
          <div className="modern-form-main">
            <div className="modern-form-card">
              <div className="modern-form-head">
                <div className="modern-form-title-wrap">
                  <div className="modern-form-icon">✈</div>
                  <div>
                    <h1 className="modern-form-title">New Permit Request</h1>
                    <div className="modern-form-subtitle">Create and prepare a new permit or flight clearance application</div>
                  </div>
                </div>
              </div>
              <div className="modern-type-row">
                <div className="modern-type-field">
                  <label>
                    Application Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select value="" onChange={(e) => selectType(e.target.value)}>
                    <option value="" disabled>
                      Select an application type…
                    </option>
                    {Object.entries(FORM_TYPES).map(([key, c]) => (
                      <option key={key} value={key}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="empty-state" style={{ marginTop: 16 }}>
                Choose an application type above to begin.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const countrySummary = cfg.multiCountry ? countrySections.map((x) => x.countryEn).filter(Boolean).join(', ') || 'Not selected' : meta.countryEn || 'Not selected';
  const flightCount = cfg.multiCountry ? countrySections.reduce((n, x) => n + (x.rows || []).length, 0) : rows.length;
  const specialOptions = ref.specialFleets.map((f) => f.name);

  const RowFleetEntry = () => {
    if (cfg.manualFleet) {
      return (
        <>
          <div className="section-label" style={{ marginTop: 14 }}>
            Aircraft type &amp; registration <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(manual — type it in yourself)</span>
          </div>
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
                {manualFleetRows.length ? (
                  manualFleetRows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <input placeholder="e.g. A320" value={r.type} onChange={(e) => setManualFleetRows((rr) => rr.map((x, xi) => (xi === i ? { ...x, type: e.target.value } : x)))} />
                      </td>
                      <td>
                        <input placeholder="e.g. SU-BXX" value={r.reg} onChange={(e) => setManualFleetRows((rr) => rr.map((x, xi) => (xi === i ? { ...x, reg: e.target.value } : x)))} />
                      </td>
                      <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => setManualFleetRows((rr) => rr.filter((_, xi) => xi !== i))}>
                        &times;
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ color: '#94a3b8' }}>
                      No aircraft added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button type="button" className="add-row-btn" onClick={() => setManualFleetRows((rr) => [...rr, { type: '', reg: '' }])}>
            + Add aircraft
          </button>
        </>
      );
    }
    if (cfg.dropdownFleet) {
      const types = combinedFleetTypes();
      return (
        <>
          <div className="section-label" style={{ marginTop: 14 }}>
            Aircraft type &amp; registration <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(pick from the fleet)</span>
          </div>
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
                {pickedFleetRows.length ? (
                  pickedFleetRows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <select
                          value={r.type}
                          onChange={(e) => setPickedFleetRows((rr) => rr.map((x, xi) => (xi === i ? { type: e.target.value, reg: regsForCombinedType(e.target.value)[0] || '' } : x)))}
                        >
                          {types.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select value={r.reg} onChange={(e) => setPickedFleetRows((rr) => rr.map((x, xi) => (xi === i ? { ...x, reg: e.target.value } : x)))}>
                          {regsForCombinedType(r.type).map((reg) => (
                            <option key={reg} value={reg}>
                              {reg}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => setPickedFleetRows((rr) => rr.filter((_, xi) => xi !== i))}>
                        &times;
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ color: '#94a3b8' }}>
                      No aircraft picked yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="add-row-btn"
            onClick={() => {
              const t = types[0] || '';
              setPickedFleetRows((rr) => [...rr, { type: t, reg: regsForCombinedType(t)[0] || '' }]);
            }}
          >
            + Add aircraft
          </button>
        </>
      );
    }
    return (
      <>
        <div className="section-label" style={{ marginTop: 14 }}>
          Aircraft type &amp; registration{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>(add one or more fleet lists — Owned, ACMI, or a Special Aircrafts table)</span>
        </div>
        {aircraftBlocks.map((src, i) => (
          <div className="aircraft-block" key={i}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <select style={{ flex: 1 }} value={src} onChange={(e) => setAircraftBlocks((b) => b.map((x, xi) => (xi === i ? e.target.value : x)))}>
                <option value="">Choose a fleet list...</option>
                <option value="owned">Owned / operated fleet</option>
                <option value="acmi">ACMI leased fleet</option>
                {specialOptions.map((name) => (
                  <option key={name} value={`special:${name}`}>
                    {name}
                  </option>
                ))}
              </select>
              <span style={{ cursor: 'pointer', color: '#dc2626', whiteSpace: 'nowrap' }} onClick={() => setAircraftBlocks((b) => b.filter((_, xi) => xi !== i))}>
                &times; Remove
              </span>
            </div>
            {src && (
              <table className="flight-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>A/C Type</th>
                    <th>Registrations</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupFleetRows(resolveAircraftSourceRows(src))).map(([type, regs]) => (
                    <tr key={type}>
                      <td style={{ fontWeight: 600 }}>{type}</td>
                      <td style={{ textAlign: 'left', paddingLeft: 8 }}>{regs.join(' , ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
        <button type="button" className="add-row-btn" onClick={() => setAircraftBlocks((b) => [...b, ''])}>
          + Add Aircraft
        </button>
      </>
    );
  };

  return (
    <div id="viewNew" style={{ padding: '22px 18px 28px' }}>
      <div className="modern-form-shell">
        <div className="modern-form-main">
          <div className="modern-form-card">
            <div className="modern-form-head">
              <div className="modern-form-title-wrap">
                <div className="modern-form-icon">✈</div>
                <div>
                  <h1 className="modern-form-title">New Permit Request</h1>
                  <div className="modern-form-subtitle">Create and prepare a new permit or flight clearance application</div>
                </div>
              </div>
              <div className="modern-stepper">
                <div className="modern-step active">
                  <div className="modern-step-dot">1</div>Application
                </div>
                <div className="modern-step">
                  <div className="modern-step-dot">2</div>Route &amp; Flights
                </div>
                <div className="modern-step">
                  <div className="modern-step-dot">3</div>Permit Details
                </div>
                <div className="modern-step">
                  <div className="modern-step-dot">4</div>Documents
                </div>
                <div className="modern-step">
                  <div className="modern-step-dot">5</div>Review
                </div>
              </div>
            </div>

            {editingId && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', margin: '14px 0 0', fontSize: 12, color: '#92400e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span>
                  Editing application <b>{editingId}</b> — changes will update this application.
                </span>
                <button type="button" className="logout-link" style={{ color: '#92400e' }} onClick={() => navigate('/new')}>
                  Discard changes
                </button>
              </div>
            )}

            {error && <div className="login-error" style={{ marginTop: 14 }}>{error}</div>}

            <div className="modern-type-row">
              <div className="modern-type-field">
                <label>
                  Application Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select value={formType} onChange={(e) => selectType(e.target.value)}>
                  {Object.entries(FORM_TYPES).map(([key, c]) => (
                    <option key={key} value={key}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modern-status">
                <span>Status</span>
                <span className="modern-status-badge">Draft</span>
              </div>
            </div>

            <div className="modern-section">
              <div className="modern-section-title">Application &amp; Flight Information</div>
              <div className="field-grid" style={{ marginBottom: 14 }}>
                {!cfg.multiCountry && !cfg.noCountry && (
                  <div className="field">
                    <label>Country</label>
                    <select value={meta.countryEn} onChange={(e) => setMeta((m) => ({ ...m, countryEn: e.target.value }))}>
                      <option value="">Select a country…</option>
                      {ref.countries.map(([en]) => (
                        <option key={en} value={en}>
                          {en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!cfg.noSeason && (
                  <div className="field">
                    <label>Season</label>
                    <select value={meta.seasonEn} onChange={(e) => setMeta((m) => ({ ...m, seasonEn: e.target.value }))}>
                      <option value="">Select a season…</option>
                      {SEASONS.map(([en]) => (
                        <option key={en} value={en}>
                          {en}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>Action</label>
                  <select value={meta.actionEn} onChange={(e) => setMeta((m) => ({ ...m, actionEn: e.target.value }))}>
                    <option value="">Select an action…</option>
                    {ACTIONS.map(([en]) => (
                      <option key={en} value={en}>
                        {en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Additional flights?</label>
                  <select value={String(meta.isAdditional)} onChange={(e) => setMeta((m) => ({ ...m, isAdditional: e.target.value === 'true' }))}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                {cfg.hasCoverLetter && (
                  <>
                    <div className="field">
                      <label>Year</label>
                      <input value={meta.year} onChange={(e) => setMeta((m) => ({ ...m, year: e.target.value }))} placeholder="2026" />
                    </div>
                    <div className="field">
                      <label>Effective from</label>
                      <input value={meta.startDate} onChange={(e) => setMeta((m) => ({ ...m, startDate: e.target.value }))} placeholder="29 مارس 2026" dir="rtl" />
                    </div>
                    <div className="field">
                      <label>Effective until</label>
                      <input value={meta.endDate} onChange={(e) => setMeta((m) => ({ ...m, endDate: e.target.value }))} placeholder="24 اكتوبر 2026" dir="rtl" />
                    </div>
                  </>
                )}
                {!cfg.multiCountry && !cfg.noCountry && meta.countryEn === 'Other' && (
                  <div className="field full">
                    <label>Country name (Arabic, will be inserted as-is)</label>
                    <input value={meta.countryOther} onChange={(e) => setMeta((m) => ({ ...m, countryOther: e.target.value }))} placeholder="اكتب اسم الدولة بالعربي" dir="rtl" />
                  </div>
                )}
                {cfg.acmiExtra && (
                  <div className="field full">
                    <label>Lessor airline name (Arabic)</label>
                    <input value={meta.lessorName} onChange={(e) => setMeta((m) => ({ ...m, lessorName: e.target.value }))} placeholder="مثال: النيل للطيران" dir="rtl" />
                  </div>
                )}
              </div>
            </div>

            <div className="modern-section">
              <div className="modern-section-title">Route &amp; Schedule</div>

              {cfg.multiCountry ? (
                <>
                  <div className="section-label">Countries &amp; their flights</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <select style={{ flex: 1 }} value={newSectionCountry} onChange={(e) => setNewSectionCountry(e.target.value)}>
                      {ref.countries
                        .filter(([en]) => en !== 'Other')
                        .map(([en]) => (
                          <option key={en} value={en}>
                            {en}
                          </option>
                        ))}
                    </select>
                    <button type="button" className="add-row-btn" style={{ marginBottom: 0 }} onClick={addCountrySection}>
                      + Add country
                    </button>
                  </div>
                  {countrySections.length === 0 && <div className="note" style={{ marginBottom: 14 }}>No countries added yet — pick one above and click "Add country".</div>}
                  {countrySections.map((sec, sIdx) => (
                    <div className="fleet-group" style={{ marginBottom: 14 }} key={sIdx}>
                      <div className="fleet-group-title">
                        <span>
                          {sec.countryEn}
                          {sec.countryEn === 'Other' && sec.countryOther ? ` — ${sec.countryOther}` : ''}
                        </span>
                        <button type="button" className="remove-type-btn" onClick={() => removeCountrySection(sIdx)}>
                          Remove country
                        </button>
                      </div>
                      {sec.countryEn === 'Other' && (
                        <div className="field full" style={{ marginBottom: 10 }}>
                          <label>Country name (Arabic)</label>
                          <input value={sec.countryOther} onChange={(e) => updateSectionCountryOther(sIdx, e.target.value)} placeholder="اكتب اسم الدولة بالعربي" dir="rtl" />
                        </div>
                      )}
                      <div className="flight-table-wrap">
                        <table className="flight-table">
                          <thead>
                            <tr>
                              <th>Flight No (Out / Return)</th>
                              <th>Day of operation</th>
                              <th>From</th>
                              <th>To</th>
                              <th>Period from</th>
                              <th>Period to</th>
                              <th>ETD</th>
                              <th>ETA</th>
                              <th>Remarks</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sec.rows.length ? (
                              sec.rows.map((r: any, rIdx: number) => (
                                <tr key={rIdx}>
                                  <td>
                                    <div style={{ display: 'flex', gap: 2, marginBottom: 3 }}>
                                      <input placeholder="Out no." style={{ width: '44%' }} value={r.flightNoOut} onChange={(e) => updateSectionRow(sIdx, rIdx, 'flightNoOut', e.target.value)} />
                                      <input placeholder="ETD" style={{ width: '28%' }} value={r.etdOut} onChange={(e) => updateSectionRow(sIdx, rIdx, 'etdOut', e.target.value)} />
                                      <input placeholder="ETA" style={{ width: '28%' }} value={r.etaOut} onChange={(e) => updateSectionRow(sIdx, rIdx, 'etaOut', e.target.value)} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 2 }}>
                                      <input placeholder="Ret no." style={{ width: '44%' }} value={r.flightNoRet} onChange={(e) => updateSectionRow(sIdx, rIdx, 'flightNoRet', e.target.value)} />
                                      <input placeholder="ETD" style={{ width: '28%' }} value={r.etdRet} onChange={(e) => updateSectionRow(sIdx, rIdx, 'etdRet', e.target.value)} />
                                      <input placeholder="ETA" style={{ width: '28%' }} value={r.etaRet} onChange={(e) => updateSectionRow(sIdx, rIdx, 'etaRet', e.target.value)} />
                                    </div>
                                  </td>
                                  <td>
                                    <DayChecks days={r.days} onToggle={(day, checked) => updateSectionRow(sIdx, rIdx, 'days', applyDayToggle(r.days, day, checked))} />
                                  </td>
                                  <td>
                                    <input placeholder="Out from" style={{ marginBottom: 2 }} value={r.fromOut} onChange={(e) => updateSectionRow(sIdx, rIdx, 'fromOut', e.target.value)} />
                                    <input placeholder="Ret from" value={r.fromRet} onChange={(e) => updateSectionRow(sIdx, rIdx, 'fromRet', e.target.value)} />
                                  </td>
                                  <td>
                                    <input placeholder="Out to" style={{ marginBottom: 2 }} value={r.toOut} onChange={(e) => updateSectionRow(sIdx, rIdx, 'toOut', e.target.value)} />
                                    <input placeholder="Ret to" value={r.toRet} onChange={(e) => updateSectionRow(sIdx, rIdx, 'toRet', e.target.value)} />
                                  </td>
                                  <td>
                                    <input type="date" value={r.periodFrom} onChange={(e) => updateSectionRow(sIdx, rIdx, 'periodFrom', e.target.value)} />
                                  </td>
                                  <td>
                                    <input type="date" value={r.periodTo} onChange={(e) => updateSectionRow(sIdx, rIdx, 'periodTo', e.target.value)} />
                                  </td>
                                  <td>
                                    <select style={{ marginBottom: 2 }} value={r.remarksOut} onChange={(e) => updateSectionRow(sIdx, rIdx, 'remarksOut', e.target.value)}>
                                      {REMARKS_TYPES.map((o) => (
                                        <option key={o}>{o}</option>
                                      ))}
                                    </select>
                                    <select value={r.remarksRet} onChange={(e) => updateSectionRow(sIdx, rIdx, 'remarksRet', e.target.value)}>
                                      {REMARKS_TYPES.map((o) => (
                                        <option key={o}>{o}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => removeSectionRow(sIdx, rIdx)}>
                                    &times;
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={9} style={{ color: '#94a3b8' }}>
                                  No rows added
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <button type="button" className="add-row-btn" onClick={() => addSectionRow(sIdx)}>
                        + Add flight row
                      </button>
                    </div>
                  ))}
                  <RowFleetEntry />
                </>
              ) : (
                <>
                  <div className="section-label">Flight rows</div>
                  <div className="flight-table-wrap">
                    <table className="flight-table">
                      <thead>
                        <tr>
                          <th>Flight No ({cfg.style === 'wide' ? 'Dep / Arr' : 'Out / Return'})</th>
                          <th>Day{cfg.style === 'wide' ? '' : ' of operation'}</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Period from</th>
                          <th>Period to</th>
                          <th>ETD</th>
                          <th>ETA</th>
                          <th>Remarks</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) =>
                          cfg.style === 'wide' ? (
                            <tr key={i}>
                              <td>
                                <input placeholder="Dep no." style={{ marginBottom: 2 }} value={r.flightNoDep} onChange={(e) => updateRow(i, 'flightNoDep', e.target.value)} />
                                <input placeholder="Arr no." value={r.flightNoArr} onChange={(e) => updateRow(i, 'flightNoArr', e.target.value)} />
                              </td>
                              <td>
                                <DayChecks days={r.days} onToggle={(day, checked) => updateRow(i, 'days', applyDayToggle(r.days, day, checked))} />
                              </td>
                              <td>
                                <AirportField cfg={cfg} airports={ref.airports} placeholder="Dep from" value={r.fromDep} onChange={(v) => updateRow(i, 'fromDep', v)} />
                                <div style={{ marginTop: 2 }}>
                                  <AirportField cfg={cfg} airports={ref.airports} placeholder="Arr from" value={r.fromArr} onChange={(v) => updateRow(i, 'fromArr', v)} />
                                </div>
                              </td>
                              <td>
                                <AirportField cfg={cfg} airports={ref.airports} placeholder="Dep to" value={r.toDep} onChange={(v) => updateRow(i, 'toDep', v)} />
                                <div style={{ marginTop: 2 }}>
                                  <AirportField cfg={cfg} airports={ref.airports} placeholder="Arr to" value={r.toArr} onChange={(v) => updateRow(i, 'toArr', v)} />
                                </div>
                              </td>
                              <td>
                                <input type="date" value={r.periodFrom} onChange={(e) => updateRow(i, 'periodFrom', e.target.value)} />
                              </td>
                              <td>
                                <input type="date" value={r.periodTo} onChange={(e) => updateRow(i, 'periodTo', e.target.value)} />
                              </td>
                              <td>
                                <input placeholder="Dep ETD" style={{ marginBottom: 2 }} value={r.etdDep} onChange={(e) => updateRow(i, 'etdDep', e.target.value)} />
                                <input placeholder="Arr ETD" value={r.etdArr} onChange={(e) => updateRow(i, 'etdArr', e.target.value)} />
                              </td>
                              <td>
                                <input placeholder="Dep ETA" style={{ marginBottom: 2 }} value={r.etaDep} onChange={(e) => updateRow(i, 'etaDep', e.target.value)} />
                                <input placeholder="Arr ETA" value={r.etaArr} onChange={(e) => updateRow(i, 'etaArr', e.target.value)} />
                              </td>
                              <td>
                                <select style={{ marginBottom: 2 }} value={r.remarksDep} onChange={(e) => updateRow(i, 'remarksDep', e.target.value)}>
                                  {REMARKS_TYPES.map((o) => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                                <select value={r.remarksArr} onChange={(e) => updateRow(i, 'remarksArr', e.target.value)}>
                                  {REMARKS_TYPES.map((o) => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => removeRow(i)}>
                                &times;
                              </td>
                            </tr>
                          ) : (
                            <tr key={i}>
                              <td>
                                <input placeholder="Out no." style={{ marginBottom: 2 }} value={r.flightNoOut} onChange={(e) => updateRow(i, 'flightNoOut', e.target.value)} />
                                <input placeholder="Ret no." value={r.flightNoRet} onChange={(e) => updateRow(i, 'flightNoRet', e.target.value)} />
                              </td>
                              <td>
                                <DayChecks days={r.days} onToggle={(day, checked) => updateRow(i, 'days', applyDayToggle(r.days, day, checked))} />
                              </td>
                              <td>
                                <AirportField cfg={cfg} airports={ref.airports} placeholder="Out from" value={r.fromOut} onChange={(v) => updateRow(i, 'fromOut', v)} />
                                <div style={{ marginTop: 2 }}>
                                  <AirportField cfg={cfg} airports={ref.airports} placeholder="Ret from" value={r.fromRet} onChange={(v) => updateRow(i, 'fromRet', v)} />
                                </div>
                              </td>
                              <td>
                                <AirportField cfg={cfg} airports={ref.airports} placeholder="Out to" value={r.toOut} onChange={(v) => updateRow(i, 'toOut', v)} />
                                <div style={{ marginTop: 2 }}>
                                  <AirportField cfg={cfg} airports={ref.airports} placeholder="Ret to" value={r.toRet} onChange={(v) => updateRow(i, 'toRet', v)} />
                                </div>
                              </td>
                              <td>
                                <input type="date" value={r.periodFrom} onChange={(e) => updateRow(i, 'periodFrom', e.target.value)} />
                              </td>
                              <td>
                                <input type="date" value={r.periodTo} onChange={(e) => updateRow(i, 'periodTo', e.target.value)} />
                              </td>
                              <td>
                                <input placeholder="Out ETD" style={{ marginBottom: 2 }} value={r.etdOut} onChange={(e) => updateRow(i, 'etdOut', e.target.value)} />
                                <input placeholder="Ret ETD" value={r.etdRet} onChange={(e) => updateRow(i, 'etdRet', e.target.value)} />
                              </td>
                              <td>
                                <input placeholder="Out ETA" style={{ marginBottom: 2 }} value={r.etaOut} onChange={(e) => updateRow(i, 'etaOut', e.target.value)} />
                                <input placeholder="Ret ETA" value={r.etaRet} onChange={(e) => updateRow(i, 'etaRet', e.target.value)} />
                              </td>
                              <td>
                                <select style={{ marginBottom: 2 }} value={r.remarksOut} onChange={(e) => updateRow(i, 'remarksOut', e.target.value)}>
                                  {REMARKS_TYPES.map((o) => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                                <select value={r.remarksRet} onChange={(e) => updateRow(i, 'remarksRet', e.target.value)}>
                                  {REMARKS_TYPES.map((o) => (
                                    <option key={o}>{o}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ cursor: 'pointer', color: '#dc2626' }} onClick={() => removeRow(i)}>
                                &times;
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="add-row-btn" onClick={addRow}>
                    + Add flight row
                  </button>
                  <RowFleetEntry />

                  {cfg.hasTravelProgram && (
                    <>
                      <div className="section-label" style={{ marginTop: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', fontWeight: 600, color: '#334155' }}>
                          <input type="checkbox" style={{ width: 16, height: 16 }} checked={travelProgramEnabled} onChange={(e) => setTravelProgramEnabled(e.target.checked)} />
                          Include Travel Program <span style={{ fontWeight: 400, color: '#94a3b8' }}>(adds 2 extra pages to this application)</span>
                        </label>
                      </div>
                      {travelProgramEnabled && (
                        <div className="fleet-group" style={{ marginTop: 10 }}>
                          <div className="fleet-group-title">
                            <span>
                              Travel Program{' '}
                              <span style={{ fontWeight: 400, color: '#94a3b8' }}>(adds 2 extra pages — country/nationality/flight/period taken automatically from the flight rows above)</span>
                            </span>
                          </div>

                          <div className="section-label" style={{ marginTop: 4 }}>
                            Egyptian Tour Operator
                          </div>
                          <TravelContactFields data={travelProgram.egyptian} onChange={(key, v) => setTravelProgram((tp: any) => ({ ...tp, egyptian: { ...tp.egyptian, [key]: v } }))} />

                          <div className="section-label" style={{ marginTop: 14 }}>
                            Foreign Tour Operator
                          </div>
                          <TravelContactFields data={travelProgram.foreign} onChange={(key, v) => setTravelProgram((tp: any) => ({ ...tp, foreign: { ...tp.foreign, [key]: v } }))} />

                          <div className="section-label" style={{ marginTop: 14 }}>
                            Aircraft &amp; Hotel
                          </div>
                          <div className="field-grid">
                            <div className="field full">
                              <label>
                                A/C Type <span style={{ fontWeight: 400, color: '#94a3b8' }}>(you can select more than one)</span>
                              </label>
                              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '6px 0' }}>
                                {['A320', 'E190', 'ATR', 'Other'].map((t) => (
                                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 400, cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      style={{ width: 15, height: 15 }}
                                      checked={(travelProgram.acTypes || []).includes(t)}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setTravelProgram((tp: any) => {
                                          const current: string[] = tp.acTypes || [];
                                          const types = checked ? [...current.filter((x) => x !== t), t] : current.filter((x) => x !== t);
                                          const pax = types.length === 1 && types[0] !== 'Other' ? AC_TYPE_PAX[types[0]] || '' : tp.pax;
                                          return { ...tp, acTypes: types, pax };
                                        });
                                      }}
                                    />
                                    {t}
                                  </label>
                                ))}
                              </div>
                            </div>
                            {(travelProgram.acTypes || []).includes('Other') && (
                              <div className="field">
                                <label>Custom aircraft type</label>
                                <input value={travelProgram.acTypeOther} placeholder="e.g. B737" onChange={(e) => setTravelProgram((tp: any) => ({ ...tp, acTypeOther: e.target.value }))} />
                              </div>
                            )}
                            <div className="field">
                              <label>No. of Pax</label>
                              {(travelProgram.acTypes || []).length === 1 && (travelProgram.acTypes || [])[0] !== 'Other' ? (
                                <input value={travelProgram.pax} disabled style={{ background: '#f8fafc', color: '#94a3b8' }} />
                              ) : (
                                <input value={travelProgram.pax} placeholder="Enter pax count" onChange={(e) => setTravelProgram((tp: any) => ({ ...tp, pax: e.target.value }))} />
                              )}
                            </div>
                            <div className="field">
                              <label>Hotel Reservation — Page 1 (English)</label>
                              <input value={travelProgram.hotelPage1En} placeholder="e.g. AMC Royal Hurghada" onChange={(e) => setTravelProgram((tp: any) => ({ ...tp, hotelPage1En: e.target.value }))} />
                            </div>
                            <div className="field">
                              <label>Hotel Reservation — Page 1 (Arabic)</label>
                              <input value={travelProgram.hotelPage1Ar} dir="rtl" onChange={(e) => setTravelProgram((tp: any) => ({ ...tp, hotelPage1Ar: e.target.value }))} />
                            </div>
                            <div className="field">
                              <label>Hotel Reservation — Page 2 (English)</label>
                              <input value={travelProgram.hotelPage2En} placeholder="e.g. Next House Copenhagen" onChange={(e) => setTravelProgram((tp: any) => ({ ...tp, hotelPage2En: e.target.value }))} />
                            </div>
                            <div className="field">
                              <label>Hotel Reservation — Page 2 (Arabic)</label>
                              <input value={travelProgram.hotelPage2Ar} dir="rtl" onChange={(e) => setTravelProgram((tp: any) => ({ ...tp, hotelPage2Ar: e.target.value }))} />
                            </div>
                          </div>
                          <div className="note" style={{ marginTop: 6 }}>
                            Flight number, route, days of operation, period and nights are pulled automatically from the flight row(s) above.
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="modern-section">
              <div className="modern-section-title">Additional Information</div>
              <textarea
                style={{ width: '100%', minHeight: 74, padding: '10px 12px', fontSize: 12, fontFamily: 'inherit', direction: 'rtl', textAlign: 'right' }}
                placeholder="اكتب أي ملاحظات أو تعليمات إضافية هنا..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
            <div className="modern-actions">
              <button type="button" className="modern-cancel" onClick={() => navigate('/dashboard')}>
                Cancel
              </button>
              <button type="button" className="modern-generate" onClick={submit} disabled={saving}>
                {editingId ? 'Save Changes' : 'Generate Form'} &nbsp;→
              </button>
            </div>
          </div>
        </div>

        <aside className="modern-side">
          <div className="modern-side-card">
            <div className="modern-side-title">Request Summary</div>
            <div className="modern-aircraft">
              <img src="/assets/aircraft.jpg" alt="Air Cairo passenger aircraft" />
            </div>
            <div className="modern-summary-row">
              <span className="modern-summary-label">Application</span>
              <span className="modern-summary-value">{cfg.title.replace(' Application', '')}</span>
            </div>
            {!cfg.noCountry && (
              <div className="modern-summary-row">
                <span className="modern-summary-label">{cfg.multiCountry ? 'Countries' : 'Country'}</span>
                <span className="modern-summary-value">{countrySummary}</span>
              </div>
            )}
            {!cfg.noSeason && (
              <div className="modern-summary-row">
                <span className="modern-summary-label">Season</span>
                <span className="modern-summary-value">{meta.seasonEn || '—'}</span>
              </div>
            )}
            <div className="modern-summary-row">
              <span className="modern-summary-label">Action</span>
              <span className="modern-summary-value">{meta.actionEn || '—'}</span>
            </div>
            <div className="modern-summary-row">
              <span className="modern-summary-label">Flight rows</span>
              <span className="modern-summary-value">{flightCount}</span>
            </div>
            <div className="modern-summary-row">
              <span className="modern-summary-label">Status</span>
              <span className="modern-status-badge">Draft</span>
            </div>
          </div>

          <div className="modern-side-card">
            <div className="modern-side-title">Quick Tips</div>
            <ul className="modern-tips">
              <li>
                <b>1. Complete the form:</b> Enter all required application, flight, route, and supporting information. Flight periods use a real date picker.
              </li>
              <li>
                <b>2. Generate Form:</b> Submit the completed application for review. It's assigned a Request No. in the format <b>TYPE-YEAR-SEQUENCE</b> (e.g. CHR-2026-001 for a Charter
                application).
              </li>
              <li>
                <b>3. Waiting Manager Approval:</b> The application is placed in the Manager approval queue.
              </li>
              <li>
                <b>4. Manager Review:</b> The Manager can either <b>Request Changes</b> with internal comments or <b>Approve</b>.
              </li>
              <li>
                <b>5. Manager Approved:</b> If Electronic Signature Approval is switched ON in Settings (and Admin has uploaded a Company Signature), the signature is stamped automatically and the
                application moves straight to ECAA's queue. Otherwise (default), the User prints it, gets it physically stamped by ECAA, then uses <b>Upload ECAA approval</b> together with the
                official Approval No. to finalize it directly.
              </li>
              <li>
                <b>6. ECAA Review:</b> ECAA can either <b>Request Changes</b> with comments or <b>Approve</b>, entering the official Approval No.
              </li>
              <li>
                <b>7. Final step:</b> After ECAA approval, <b>Download Approved Application</b> stays available. Internal Manager/ECAA comments are never included in the printed/downloaded document.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TravelContactFields({ data, onChange }: { data: any; onChange: (key: string, value: string) => void }) {
  return (
    <div className="field-grid">
      <div className="field">
        <label>Name (English)</label>
        <input value={data.nameEn} onChange={(e) => onChange('nameEn', e.target.value)} />
      </div>
      <div className="field">
        <label>Name (Arabic)</label>
        <input value={data.nameAr} dir="rtl" onChange={(e) => onChange('nameAr', e.target.value)} />
      </div>
      <div className="field">
        <label>Phone</label>
        <input value={data.phone} onChange={(e) => onChange('phone', e.target.value)} />
      </div>
      <div className="field">
        <label>Fax</label>
        <input value={data.fax} onChange={(e) => onChange('fax', e.target.value)} />
      </div>
      <div className="field">
        <label>Email</label>
        <input value={data.email} onChange={(e) => onChange('email', e.target.value)} />
      </div>
      <div className="field full">
        <label>Address</label>
        <input value={data.address} onChange={(e) => onChange('address', e.target.value)} />
      </div>
    </div>
  );
}
