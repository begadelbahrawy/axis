import React from 'react';

// The diagonal split between the login photo panel and the form panel is a
// clip-path referencing this SVG def (see .login-brand-panel-v2 in legacy.css).
export default function AxisWaveClip() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <clipPath id="axisWaveClip" clipPathUnits="objectBoundingBox">
          <path d="M0,0 L0.85,0 C0.70,0.35 0.80,0.65 0.60,1 L0,1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
