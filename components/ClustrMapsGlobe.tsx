import React, { useEffect, useRef } from 'react';

const CLUSTRMAPS_SCRIPT_URL = 'https://clustrmaps.com/globe.js?d=b4Di1FzjHeI5PRsDga_FiIU5CwTpBFdDSbBmNd4RS3A';

const ClustrMapsGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (document.getElementById('clstr_globe')) return; // Already loaded

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.id = 'clstr_globe';
    script.src = CLUSTRMAPS_SCRIPT_URL;
    containerRef.current.appendChild(script);

    return () => {
      const existing = document.getElementById('clstr_globe');
      if (existing?.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    };
  }, []);

  return (
    <div
      className="clustrmaps-globe-wrapper fixed bottom-3 right-3 z-[9999] w-[80px] h-[80px] overflow-hidden rounded border-0 bg-transparent"
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ClustrMapsGlobe;
