import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../api/client';

type Entry = { id: string; requestId: string; formTitle: string; action: string; userName: string; createdAt: string };

export default function ActivityLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiGet<{ entries: Entry[] }>('/activity-log').then((r) => setEntries(r.entries));
  }, []);

  return (
    <div style={{ padding: '22px 18px 28px' }}>
      <div className="card">
        <div className="section-label">
          Activity Log <span style={{ fontWeight: 400, textTransform: 'none', color: '#94a3b8' }}>— who did what, and when</span>
        </div>
        {entries.length === 0 ? (
          <div className="empty-state">No activity yet</div>
        ) : (
          <div className="records-list">
            {entries.map((e) => {
              const d = new Date(e.createdAt);
              return (
                <div key={e.id} className="record-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/preview/${e.requestId}`)}>
                  <div>
                    <div className="rec-title">
                      {e.userName} &middot; {e.action}
                    </div>
                    <div className="rec-sub">
                      {e.formTitle} &middot; {e.requestId} &middot; {d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
