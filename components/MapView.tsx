import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { HistoryItem } from '../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });

interface MapViewProps { history: HistoryItem[]; onSelectItem: (item: HistoryItem) => void; }
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; emoji: string; label: string }> = {
  HEALTHY:  { color: '#065f46', bg: '#d1fae5', border: '#10b981', emoji: '🟢', label: 'Saudável' },
  THIRSTY:  { color: '#92400e', bg: '#fef3c7', border: '#f59e0b', emoji: '🟡', label: 'Em Stress' },
  SICK:     { color: '#991b1b', bg: '#fee2e2', border: '#ef4444', emoji: '🔴', label: 'Doente' },
  UNKNOWN:  { color: '#374151', bg: '#f3f4f6', border: '#9ca3af', emoji: '⚪', label: '?' },
  INVASIVE: { color: '#581c87', bg: '#f3e8ff', border: '#9333ea', emoji: '⚠️', label: 'Invasora' },
  REMOVED:  { color: '#374151', bg: '#e5e7eb', border: '#6b7280', emoji: '✅', label: 'Removida' },
};

function createMarkerIcon(status: string, isInvasive: boolean, removed: boolean) {
  const cfg = STATUS_CONFIG[isInvasive ? (removed ? 'REMOVED' : 'INVASIVE') : status] || STATUS_CONFIG.UNKNOWN;
  const inner = isInvasive ? (removed ? `<text x="18" y="20" text-anchor="middle" font-size="10" font-weight="900" fill="${cfg.border}">✓</text>` : `<text x="18" y="21" text-anchor="middle" font-size="11" font-weight="900" fill="${cfg.border}">✕</text>`) : `<circle cx="18" cy="16" r="5" fill="${cfg.border}"/>`;
  return L.divIcon({ html: `<svg viewBox="0 0 36 50" width="36" height="50"><path d="M18 2C10.2 2 4 8.2 4 16c0 10 14 30 14 30s14-20 14-30C32 8.2 25.7 2 18 2z" fill="${cfg.border}" stroke="white" stroke-width="2"/><circle cx="18" cy="16" r="8" fill="white"/>${inner}</svg>`, className: '', iconSize: [36, 50], iconAnchor: [18, 50], popupAnchor: [0, -52] });
}

const MapView: React.FC<MapViewProps> = ({ history, onSelectItem }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const items = history.filter(i => i.coords != null);

  const buildPopup = useCallback((item: HistoryItem, onSelect: any) => {
    const inv = !!item.isInvasive; const rem = inv && !!item.removedAt;
    const cfg = STATUS_CONFIG[inv ? (rem ? 'REMOVED' : 'INVASIVE') : item.status] || STATUS_CONFIG.UNKNOWN;
    const div = document.createElement('div');
    div.style.cssText = 'width:200px;font-family:sans-serif;background:white;border-radius:12px;overflow:hidden;';
    div.innerHTML = `<div style="padding:10px;"><div style="display:flex;gap:5px;margin-bottom:5px;"><span style="background:${cfg.bg};color:${cfg.color};font-size:9px;font-weight:900;padding:2px 8px;border-radius:99px;">${cfg.emoji} ${inv ? (rem ? 'Removida' : 'INVASORA') : cfg.label}</span></div><p style="font-size:13px;font-weight:800;margin:0;">${item.species}</p><button id="btn-${item.id}" style="width:100%;margin-top:10px;padding:8px;background:#064e3b;color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;">Ver →</button></div>`;
    div.querySelector(`#btn-${item.id}`)?.addEventListener('click', () => onSelect(item));
    return div;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, { center: [39.6, -8.0], zoom: 6 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    map.eachLayer(l => { if (l instanceof L.Marker) map.removeLayer(l); });
    if (items.length === 0) return;
    const bounds: any[] = [];
    items.forEach(i => { const m = L.marker([i.coords!.latitude, i.coords!.longitude], { icon: createMarkerIcon(i.status, !!i.isInvasive, !!i.removedAt) }).addTo(map); m.bindPopup(buildPopup(i, onSelectItem)); bounds.push([i.coords!.latitude, i.coords!.longitude]); });
    if (bounds.length === 1) map.setView(bounds[0], 14); else map.fitBounds(bounds as any, { padding: [40, 40], maxZoom: 14 });
  }, [items, buildPopup, onSelectItem]);

  if (items.length === 0) return <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4"><div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center"><MapPin className="w-8 h-8 text-emerald-200" /></div><p className="font-bold">Sem diagnósticos no mapa</p></div>;

  return (
    <div className="relative h-full flex flex-col">
      <style>{`.leaflet-control-attribution { opacity: 0.12 !important; font-size: 7px !important; background: transparent !important; box-shadow: none !important; } .leaflet-control-attribution a { color: inherit; }`}</style>
      <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: 300 }} />
    </div>
  );
};

export default MapView;
