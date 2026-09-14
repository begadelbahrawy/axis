import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FORM_TYPES } from '../../types';
import type { Application } from '../../types';
import { buildEcaaArchive, type MonthMap, type CountryTree, type SeasonTree } from '../../lib/archive';

function ArchiveLeaves({ recs }: { recs: Application[] }) {
  const navigate = useNavigate();
  return (
    <>
      {recs.map((r) => {
        const title = FORM_TYPES[r.type]?.title || r.type;
        return (
          <button key={r.id} type="button" className="archive-leaf" title={title} onClick={() => navigate(`/preview/${r.id}`)}>
            <span className="archive-leaf-id">{r.id}</span>
            <span className="archive-leaf-title">{title}</span>
          </button>
        );
      })}
    </>
  );
}

function ArchiveNode({ level, label, count, extraClass, children }: { level: number; label: string; count: number; extraClass?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <div className={`archive-node archive-node-lvl${level} ${extraClass || ''}`}>
      <button type="button" className={`archive-node-btn${open ? ' archive-node-open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className="archive-chevron">›</span>
        <span className="archive-node-label">{label}</span>
        <span className="archive-node-count">{count}</span>
      </button>
      <div className="archive-node-children" style={{ display: open ? 'block' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

function MonthNodes({ monthMap, level }: { monthMap: MonthMap; level: number }) {
  const keys = Object.keys(monthMap).sort((a, b) => monthMap[b].sortKey - monthMap[a].sortKey);
  return (
    <>
      {keys.map((k) => (
        <ArchiveNode key={k} level={level} label={monthMap[k].label} count={monthMap[k].recs.length} extraClass={k === 'MULTI' ? 'archive-multi-month' : ''}>
          <ArchiveLeaves recs={monthMap[k].recs} />
        </ArchiveNode>
      ))}
    </>
  );
}

function CountryMonthTree({ tree, countryLevel, monthLevel }: { tree: CountryTree; countryLevel: number; monthLevel: number }) {
  const countries = Object.keys(tree).sort();
  return (
    <>
      {countries.map((country) => {
        const monthMap = tree[country];
        const count = Object.values(monthMap).reduce((s, m) => s + m.recs.length, 0);
        return (
          <ArchiveNode key={country} level={countryLevel} label={country} count={count}>
            <MonthNodes monthMap={monthMap} level={monthLevel} />
          </ArchiveNode>
        );
      })}
    </>
  );
}

function SeasonTreeView({ seasonTree }: { seasonTree: SeasonTree }) {
  const codes = Object.keys(seasonTree).sort();
  return (
    <>
      {codes.map((code) => {
        const bucket = seasonTree[code];
        const count = bucket.schedule.length + bucket.charter.length;
        return (
          <ArchiveNode key={code} level={2} label={code} count={count}>
            <ArchiveNode level={3} label="Schedule" count={bucket.schedule.length}>
              <ArchiveLeaves recs={bucket.schedule} />
            </ArchiveNode>
            <ArchiveNode level={3} label="Charter" count={bucket.charter.length}>
              <ArchiveLeaves recs={bucket.charter} />
            </ArchiveNode>
          </ArchiveNode>
        );
      })}
    </>
  );
}

export default function ArchiveSidebar({ records, isEcaa }: { records: Application[]; isEcaa: boolean }) {
  const tree = buildEcaaArchive(records, isEcaa);
  if (!tree.total) return <div className="archive-empty">No applications in the archive yet.</div>;

  const seasonCount = Object.values(tree.seasonTree).reduce((s, b) => s + b.schedule.length + b.charter.length, 0);
  const acmiCount = Object.values(tree.acmiTree).reduce((s, mm) => s + Object.values(mm).reduce((s2, m) => s2 + m.recs.length, 0), 0);
  const positioningCount = Object.values(tree.positioningByMonth).reduce((s, m) => s + m.recs.length, 0);
  const domesticCount = Object.values(tree.domesticByMonth).reduce((s, m) => s + m.recs.length, 0);
  const cancelledCount = Object.values(tree.cancelledTree).reduce((s, mm) => s + Object.values(mm).reduce((s2, m) => s2 + m.recs.length, 0), 0);

  return (
    <>
      <ArchiveNode level={1} label="Season Approval" count={seasonCount} extraClass="archive-season">
        <SeasonTreeView seasonTree={tree.seasonTree} />
      </ArchiveNode>
      <ArchiveNode level={1} label="ACMI Applications" count={acmiCount}>
        <CountryMonthTree tree={tree.acmiTree} countryLevel={2} monthLevel={3} />
      </ArchiveNode>
      <ArchiveNode level={1} label="Positioning Applications" count={positioningCount}>
        <MonthNodes monthMap={tree.positioningByMonth} level={2} />
      </ArchiveNode>
      <ArchiveNode level={1} label="Domestic Applications" count={domesticCount}>
        <MonthNodes monthMap={tree.domesticByMonth} level={2} />
      </ArchiveNode>
      <ArchiveNode level={1} label="Cancelled Applications" count={cancelledCount} extraClass="archive-cancelled">
        <CountryMonthTree tree={tree.cancelledTree} countryLevel={2} monthLevel={3} />
      </ArchiveNode>
      <CountryMonthTree tree={tree.generalTree} countryLevel={1} monthLevel={2} />
    </>
  );
}
