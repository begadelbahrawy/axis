import React from 'react';
import { FORM_TYPES } from '../types';
import type { ApplicationAttachments, ApplicationData } from '../types';
import { periodDateDisplay, twoLineDisplay, flightNoCellDisplay, daysDisplay, combineRemarks } from '../lib/workflow';
import { travelProgramFlightData, bilingualDisplay, TRAVEL_FIXED_OPERATOR, TRAVEL_FIXED_HANDLING, NATIONALITY_MAP, acTypesLabel } from '../lib/travel';
import { useReferenceData, groupFleetRows } from '../hooks/useReferenceData';

export type PreviewRecord = {
  id: string;
  type: string;
  createdAt: string;
  preparedBy: string;
  approvalNumber?: string | null;
  data: ApplicationData;
  attachments: ApplicationAttachments;
};

function FleetPreview({ rec, refData }: { rec: PreviewRecord; refData: ReturnType<typeof useReferenceData> }) {
  const cfg = FORM_TYPES[rec.type];
  const header = (kind?: 'acmi') => (
    <div className="ac-header-row">
      <span className="ac-header-en">{kind === 'acmi' ? 'ACMI Aircrafts' : 'Aircraft type & registration'}</span>
      <span className="ac-header-ar">{kind === 'acmi' ? 'الطائرات المؤجرة' : 'طراز الطائرة وحروف التسجيل'}</span>
    </div>
  );
  const table = (obj: Record<string, string[]>) => (
    <table className="flight-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th style={{ width: '22%' }}>A/C Type</th>
          <th>Registrations</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(obj).map(([type, regs]) => (
          <tr key={type}>
            <td style={{ fontWeight: 600 }}>{type}</td>
            <td style={{ textAlign: 'left', paddingLeft: 8 }}>{regs.join(' , ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (cfg.manualFleet) {
    const rows = (rec.data.manualFleetRows || []).filter((r: any) => r.type || r.reg);
    if (!rows.length)
      return (
        <>
          {header()}
          <div className="note">No aircraft entered</div>
        </>
      );
    return (
      <>
        {header()}
        {table(groupFleetRows(rows.map((r: any) => ({ type: r.type, registration: r.reg }))))}
      </>
    );
  }
  if (cfg.dropdownFleet) {
    const rows = (rec.data.pickedFleetRows || []).filter((r: any) => r.type && r.reg);
    if (!rows.length)
      return (
        <>
          {header()}
          <div className="note">No aircraft selected</div>
        </>
      );
    return (
      <>
        {header()}
        {table(groupFleetRows(rows.map((r: any) => ({ type: r.type, registration: r.reg }))))}
      </>
    );
  }
  const blocks = (rec.data.aircraftBlocks || []).filter(Boolean);
  if (!blocks.length)
    return (
      <>
        {header()}
        <div className="note">No aircraft selected</div>
      </>
    );
  const resolve = (src: string) => {
    if (src === 'owned') return refData.owned;
    if (src === 'acmi') return refData.acmi;
    if (src.startsWith('special:')) return refData.specialFleets.find((f) => f.name === src.slice(8))?.rows || [];
    return [];
  };
  return (
    <>
      {blocks.map((src: string, i: number) => (
        <div key={i}>
          {header(src === 'acmi' ? 'acmi' : undefined)}
          {table(groupFleetRows(resolve(src)))}
        </div>
      ))}
    </>
  );
}

export function TravelProgramPage({ rec, pageIdx }: { rec: PreviewRecord; pageIdx: 0 | 1 }) {
  const tp = rec.data.travelProgram || {};
  const fd = travelProgramFlightData(rec.data.rows || []);
  const isPage1 = pageIdx === 0;
  const meta = rec.data.meta || {};
  let countryLine: string, nationalityLine: string;
  if (isPage1) {
    const countryEn = meta.countryEn === 'Other' ? meta.countryOther || '—' : meta.countryEn;
    countryLine = countryEn || '—';
    const demo = NATIONALITY_MAP[meta.countryEn];
    nationalityLine = demo ? `${demo[0]} and other Nationalities [${demo[1]} وجنسيات مختلفة]` : meta.countryEn || '—';
  } else {
    countryLine = 'Egypt [مصر]';
    nationalityLine = 'Egyptian [مصري]';
  }
  const acTypeLabel = acTypesLabel(tp.acTypes, tp.acTypeOther);
  const hotel = isPage1 ? bilingualDisplay(tp.hotelPage1En, tp.hotelPage1Ar) : bilingualDisplay(tp.hotelPage2En, tp.hotelPage2Ar);
  const daysLabel = fd.days.en !== '—' ? `${fd.days.en} [${fd.days.ar}]` : '—';

  return (
    <div className={`preview-card${pageIdx === 1 ? ' second-page' : ''}`}>
      <div className="letterhead">
        <div>
          <div className="letterhead-id">
            {rec.id || 'Draft — Request No. assigned on Confirm'} — Travel Program, Page {pageIdx + 1}
          </div>
        </div>
        <img src="/assets/aircairo-logo-color.png" alt="Air Cairo" />
      </div>
      <div className="tp-titles">
        <div className="ar">برنامج سياحي لرحلات جوية عارضة سياحية</div>
        <div className="en">Charter Flights Travel Program</div>
      </div>
      <div className="tp-body">
        <div className="tp-left">
          <div className="blk">
            <h4>
              Operator <span className="ar-lbl">الشركة الناقلة</span>
            </h4>
            <div className="row">{TRAVEL_FIXED_OPERATOR.name}</div>
            <div className="row">
              <span>Tel</span> {TRAVEL_FIXED_OPERATOR.phone}
            </div>
            <div className="row">
              <span>Email</span> {TRAVEL_FIXED_OPERATOR.email}
            </div>
          </div>
          <div className="blk">
            <h4>
              Egyptian handling agent <span className="ar-lbl">الوكيل المصري لخدمات الطيران</span>
            </h4>
            <div className="row">{TRAVEL_FIXED_HANDLING.name}</div>
            <div className="row">
              <span>Tel</span> {TRAVEL_FIXED_HANDLING.phone}
            </div>
            <div className="row">
              <span>Email</span> {TRAVEL_FIXED_HANDLING.email}
            </div>
          </div>
          <div className="blk">
            <h4>
              Egyptian tour operator <span className="ar-lbl">الوكيل السياحي المصري</span>
            </h4>
            <div className="row">{bilingualDisplay(tp.egyptian?.nameEn, tp.egyptian?.nameAr)}</div>
            <div className="row">
              <span>Tel</span> {tp.egyptian?.phone || '—'}
            </div>
            <div className="row">
              <span>Email</span> {tp.egyptian?.email || '—'}
            </div>
            <div className="row">
              <span>Address</span> {tp.egyptian?.address || '—'}
            </div>
          </div>
          <div className="blk">
            <h4>
              Foreign tour operator <span className="ar-lbl">الوكيل السياحي الاجنبي</span>
            </h4>
            <div className="row">{bilingualDisplay(tp.foreign?.nameEn, tp.foreign?.nameAr)}</div>
            <div className="row">
              <span>Tel</span> {tp.foreign?.phone || '—'}
            </div>
            <div className="row">
              <span>Email</span> {tp.foreign?.email || '—'}
            </div>
            <div className="row">
              <span>Address</span> {tp.foreign?.address || '—'}
            </div>
          </div>
        </div>
        <div className="tp-right">
          <div className="tp-hero">
            <div className="top">
              <span>{countryLine}</span>
              <span>{daysLabel}</span>
            </div>
            <div className="fn">{fd.flightNo1 || '—'}</div>
            <div className="route">{fd.route1 || '—'}</div>
            {(fd.flightNo2 || fd.route2) && (
              <div className="fn2">
                + {fd.flightNo2 || '—'} &middot; {fd.route2 || '—'}
              </div>
            )}
          </div>
          <div className="tp-mini-grid">
            <div className="tp-mini">
              <div className="lbl">
                A/C type <span className="ar-lbl-sm">طراز الطائرة</span>
              </div>
              <div className="val">{acTypeLabel || '—'}</div>
            </div>
            <div className="tp-mini">
              <div className="lbl">
                Pax <span className="ar-lbl-sm">عدد الركاب</span>
              </div>
              <div className="val">{tp.pax || '—'}</div>
            </div>
            <div className="tp-mini">
              <div className="lbl">
                Nights <span className="ar-lbl-sm">عدد الليالي</span>
              </div>
              <div className="val">{fd.nights !== null ? fd.nights : '—'}</div>
            </div>
          </div>
          <div className="tp-prog">
            <div className="row2">
              <span>
                Period <span className="ar-lbl-sm">الفترة</span>
              </span>
              <b>{fd.periodText}</b>
            </div>
            <div className="row2">
              <span>
                Nationality <span className="ar-lbl-sm">الجنسيات</span>
              </span>
              <b>{nationalityLine}</b>
            </div>
            <div className="row2">
              <span>
                Hotel reservation <span className="ar-lbl-sm">حجز الفنادق</span>
              </span>
              <b>{hotel || '—'}</b>
            </div>
            <div className="row2">
              <span>
                Internal transfer <span className="ar-lbl-sm">الانتقالات الداخلية</span>
              </span>
              <b>Tourist Buses [اتوبيسات سياحية]</b>
            </div>
          </div>
        </div>
      </div>
      <div className="preview-body" style={{ paddingTop: 0 }}>
        <div style={{ marginTop: 18, direction: 'rtl', textAlign: 'right', fontSize: 12, lineHeight: 2 }}>
          <div style={{ fontWeight: 700 }}>Prepared by:</div>
          <div style={{ fontWeight: 700 }}>الشركة الناقلة / الوكيل المصري</div>
          <div>التوقيع :</div>
          <div>ختم الشركة :</div>
        </div>
      </div>
    </div>
  );
}

export type DocumentPreviewProps = {
  rec: PreviewRecord;
  refData: ReturnType<typeof useReferenceData>;
  isEcaa: boolean;
  interactive: boolean;
  onFieldChange?: (field: 'salutationText' | 'coverLetterText' | 'ecaaResponse' | 'approvalNumber', value: string) => void;
  onUploadEcaaSignature?: (file: File) => void;
};

export default function DocumentPreview({ rec, refData, isEcaa, interactive, onFieldChange, onUploadEcaaSignature }: DocumentPreviewProps) {
  const cfg = FORM_TYPES[rec.type];

  const buildSubjectLine = () => {
    const meta = rec.data.meta || {};
    const seasonNoun = meta.seasonEn === 'Winter' ? 'شتاء' : 'صيف';
    return `الموضوع: اعتماد جدول تشغيل شركة اير كايرو – موسم ${seasonNoun} ${meta.year || ''}`;
  };

  let bodyHtml: React.ReactNode;
  if (cfg.multiCountry) {
    bodyHtml = (
      <>
        {(rec.data.countrySections || []).map((sec: any, i: number) => (
          <div style={{ marginBottom: 14 }} key={i}>
            <div className="ac-line" style={{ fontWeight: 700, fontSize: 13, color: '#4A1656' }}>
              {sec.countryEn}
            </div>
            <table className="flight-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Flight No (Out / Return)</th>
                  <th>Day</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Period from</th>
                  <th>Period to</th>
                  <th>ETD</th>
                  <th>ETA</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(sec.rows || []).map((r: any, ri: number) => (
                  <tr key={ri}>
                    <td>{flightNoCellDisplay(r.flightNoOut, r.flightNoRet)}</td>
                    <td>{daysDisplay(r.days)}</td>
                    <td>{twoLineDisplay(r.fromOut, r.fromRet)}</td>
                    <td>{twoLineDisplay(r.toOut, r.toRet)}</td>
                    <td>{periodDateDisplay(r.periodFrom) || '—'}</td>
                    <td>{periodDateDisplay(r.periodTo) || '—'}</td>
                    <td>{twoLineDisplay(r.etdOut, r.etdRet)}</td>
                    <td>{twoLineDisplay(r.etaOut, r.etaRet)}</td>
                    <td>{combineRemarks(r.remarksOut, r.remarksRet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <FleetPreview rec={rec} refData={refData} />
        </div>
      </>
    );
  } else if (cfg.style === 'wide') {
    bodyHtml = (
      <>
        <table className="flight-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Flight No (Dep / Arr)</th>
              <th>Day</th>
              <th>From</th>
              <th>To</th>
              <th>Period from</th>
              <th>Period to</th>
              <th>ETD</th>
              <th>ETA</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(rec.data.rows || []).map((r: any, i: number) => (
              <tr key={i}>
                <td>{flightNoCellDisplay(r.flightNoDep, r.flightNoArr)}</td>
                <td>{daysDisplay(r.days)}</td>
                <td>{twoLineDisplay(r.fromDep, r.fromArr)}</td>
                <td>{twoLineDisplay(r.toDep, r.toArr)}</td>
                <td>{periodDateDisplay(r.periodFrom) || '—'}</td>
                <td>{periodDateDisplay(r.periodTo) || '—'}</td>
                <td>{twoLineDisplay(r.etdDep, r.etdArr)}</td>
                <td>{twoLineDisplay(r.etaDep, r.etaArr)}</td>
                <td>{combineRemarks(r.remarksDep, r.remarksArr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10 }}>
          <FleetPreview rec={rec} refData={refData} />
        </div>
      </>
    );
  } else {
    bodyHtml = (
      <>
        <table className="flight-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Flight No (Out / Return)</th>
              <th>Day</th>
              <th>From</th>
              <th>To</th>
              <th>Period from</th>
              <th>Period to</th>
              <th>ETD</th>
              <th>ETA</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(rec.data.rows || []).map((r: any, i: number) => (
              <tr key={i}>
                <td>{flightNoCellDisplay(r.flightNoOut, r.flightNoRet)}</td>
                <td>{daysDisplay(r.days)}</td>
                <td>{twoLineDisplay(r.fromOut, r.fromRet)}</td>
                <td>{twoLineDisplay(r.toOut, r.toRet)}</td>
                <td>{periodDateDisplay(r.periodFrom) || '—'}</td>
                <td>{periodDateDisplay(r.periodTo) || '—'}</td>
                <td>{twoLineDisplay(r.etdOut, r.etdRet)}</td>
                <td>{twoLineDisplay(r.etaOut, r.etaRet)}</td>
                <td>{combineRemarks(r.remarksOut, r.remarksRet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 10 }}>
          <FleetPreview rec={rec} refData={refData} />
        </div>
      </>
    );
  }

  const letterhead = (showApprovalBox: boolean) => (
    <div className="letterhead">
      <div>
        <div className="letterhead-id">{rec.id || 'Draft — Request No. assigned on Confirm'}</div>
        {showApprovalBox && (
          <div className="approval-box" style={{ marginTop: 6 }}>
            <span className="approval-number-print">Approval No:</span>
            {interactive && isEcaa ? (
              <input type="text" value={rec.approvalNumber || ''} onChange={(e) => onFieldChange?.('approvalNumber', e.target.value)} />
            ) : (
              <span className="approval-number-display">{rec.approvalNumber || '—'}</span>
            )}
          </div>
        )}
      </div>
      <img src="/assets/aircairo-logo-color.png" alt="AIR CAIRO" />
    </div>
  );

  const metaRow = (
    <div className="meta-row">
      <div></div>
      <div className="meta-company">اسم الشركة : "إير كايرو"</div>
      <div className="meta-date">تحريراً في: {new Date(rec.createdAt).toLocaleDateString('en-GB')}</div>
    </div>
  );

  const signBlock = (
    <div className="sign-block">
      <div className="prepared-by">
        Prepared by
        <br />
        <b>{rec.preparedBy}</b>
      </div>
      <div className="approver-sign">
        وتفضلوا بقبول فائق الاحترام ،،،
        <br />
        <span className="name">طيار / رامى حمزة</span>
        <br />
        مدير عام مساعد تخطيط الشبكات
        <div className="esign-circle-wrap">
          {rec.attachments.eSignature?.url ? (
            <div className="esign-circle" title={`Electronically signed by ${rec.attachments.eSignature.by}`}>
              <img src={rec.attachments.eSignature.url} alt="Electronic signature" />
            </div>
          ) : (
            <div className="esign-circle esign-circle-empty" title="Signature is applied automatically once the Manager approves" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {cfg.hasCoverLetter && (
        <div className="preview-card">
          {letterhead(false)}
          <div className="preview-body">
            {metaRow}
            <div className="letter-salutation">السيدة / رئيس الإدارة المركزية للنقل الجوى</div>
            <div className="letter-salutation">سلطة الطيران المدنى المصري</div>
            <div className="letter-salutation">تحية طيبة وبعد ،،،</div>
            <div className="letter-salutation" style={{ fontWeight: 700 }}>
              {buildSubjectLine()}
            </div>
            {interactive ? (
              <div
                className="letter-body-text"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onFieldChange?.('coverLetterText', e.currentTarget.innerText)}
              >
                {rec.data.coverLetterText || ''}
              </div>
            ) : (
              <div className="letter-body-text">{rec.data.coverLetterText || ''}</div>
            )}
            <div style={{ marginTop: 10 }}>
              <FleetPreview rec={rec} refData={refData} />
            </div>
            {signBlock}
          </div>
        </div>
      )}

      <div className={`preview-card${cfg.hasCoverLetter ? ' second-page' : ''}`}>
        {letterhead(true)}
        <div className="preview-body">
          {metaRow}
          <div className="letter-salutation">السيدة / رئيس الإدارة المركزية للنقل الجوى</div>
          <div className="letter-salutation">تحية طيبة وبعد ،،،</div>
          {interactive ? (
            <div className="letter-body-text" contentEditable suppressContentEditableWarning onBlur={(e) => onFieldChange?.('salutationText', e.currentTarget.innerText)}>
              {rec.data.salutationText || ''}
            </div>
          ) : (
            <div className="letter-body-text">{rec.data.salutationText || ''}</div>
          )}

          {bodyHtml}

          <div className="attach-note">
            * جميع التوقيتات بالتوقيت العالمى.
            {cfg.acmiExtra && (
              <>
                <br />* مرفق التأمين — * مرفق عقد الأيجار — * مرفق شهادات الطائرة
              </>
            )}
          </div>

          {rec.data.comments && rec.data.comments.trim() && (
            <div style={{ marginTop: 12 }}>
              <div className="section-label" style={{ marginBottom: 6 }}>
                Comments
              </div>
              <div className="comments-editable">{rec.data.comments}</div>
            </div>
          )}

          {signBlock}

          <div style={{ marginTop: 14 }}>
            <div className="section-label" style={{ marginBottom: 6 }}>
              ECAA Response <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>— رد سلطة الطيران المدني</span>
            </div>
            <div className="ecaa-response-wrap">
              {interactive ? (
                <div
                  className="comments-editable"
                  contentEditable
                  suppressContentEditableWarning
                  data-placeholder="..."
                  style={{ minHeight: 160 }}
                  onBlur={(e) => onFieldChange?.('ecaaResponse', e.currentTarget.innerText)}
                >
                  {rec.data.ecaaResponse || ''}
                </div>
              ) : (
                <div className="comments-editable" data-placeholder="..." style={{ minHeight: 160 }}>
                  {rec.data.ecaaResponse || ''}
                </div>
              )}
              <div className="ecaa-response-sign-footer">
                <div className="esign-circle-wrap">
                  {rec.attachments.ecaaESignature?.url ? (
                    <div className="esign-circle" title={`Electronically signed by ${rec.attachments.ecaaESignature.by}`}>
                      <img src={rec.attachments.ecaaESignature.url} alt="ECAA electronic signature" />
                    </div>
                  ) : (
                    <div className="esign-circle esign-circle-empty" title="ECAA signature" />
                  )}
                  <div>
                    <div className="esign-circle-label">
                      {rec.attachments.ecaaESignature ? (
                        <>
                          Signed by {rec.attachments.ecaaESignature.by}
                          <br />
                          {new Date(rec.attachments.ecaaESignature.at).toLocaleString()}
                        </>
                      ) : (
                        'No ECAA signature uploaded yet'
                      )}
                    </div>
                    {interactive && onUploadEcaaSignature && (
                      <label className="ecaa-response-esign-upload">
                        &#9997; {rec.attachments.ecaaESignature ? 'Replace signature' : 'Upload signature'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && onUploadEcaaSignature(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </div>
                {rec.attachments.ecaaApprovalFile && (
                  <div className="ecaa-proof-note">
                    &#10003; Signed approval attached: {rec.attachments.ecaaApprovalFile.name} —{' '}
                    <a href={rec.attachments.ecaaApprovalFile.url} download={rec.attachments.ecaaApprovalFile.name}>
                      Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {cfg.hasTravelProgram && rec.data.travelProgramEnabled && (
        <>
          <TravelProgramPage rec={rec} pageIdx={0} />
          <TravelProgramPage rec={rec} pageIdx={1} />
        </>
      )}
    </>
  );
}
