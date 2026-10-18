import React, { useState, useRef } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  Check,
  X,
  Crosshair,
  Save,
  RotateCcw,
  Shield,
  Layers,
  Info
} from 'lucide-react';
import { api, RestrictedZone, Point2D } from '../api';

interface RestrictedZonesPageProps {
  zones: RestrictedZone[];
  onRefresh: () => void;
}

export const RestrictedZonesPage: React.FC<RestrictedZonesPageProps> = ({ zones, onRefresh }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [dwellTime, setDwellTime] = useState(1.5);
  const [requiredPPE, setRequiredPPE] = useState<string[]>(['HELMET']);
  const [points, setPoints] = useState<Point2D[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);

  const startNewZone = () => {
    setIsEditing(true);
    setEditingZoneId(null);
    setName('Perimeter Zone Beta');
    setColor('#f59e0b');
    setSeverity('HIGH');
    setDwellTime(1.5);
    setRequiredPPE(['HELMET']);
    setPoints([
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.75 },
    ]);
  };

  const startEditZone = (z: RestrictedZone) => {
    setIsEditing(true);
    setEditingZoneId(z.id);
    setName(z.name);
    setColor(z.color);
    setSeverity(z.severity);
    setDwellTime(z.dwell_time_seconds);
    setRequiredPPE(z.required_ppe || []);
    setPoints([...z.polygon_coords]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setMousePos({ x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) });
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isEditing || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setPoints([...points, { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }]);
  };

  const updateVertexCoordinate = (index: number, axis: 'x' | 'y', val: number) => {
    const updated = [...points];
    updated[index][axis] = Math.max(0, Math.min(1, val));
    setPoints(updated);
  };

  const removeVertex = (index: number) => {
    if (points.length > 3) {
      setPoints(points.filter((_, i) => i !== index));
    }
  };

  const togglePPE = (item: string) => {
    if (requiredPPE.includes(item)) {
      setRequiredPPE(requiredPPE.filter(p => p !== item));
    } else {
      setRequiredPPE([...requiredPPE, item]);
    }
  };

  const handleSave = async () => {
    if (points.length < 3) {
      alert('A zone polygon must contain at least 3 vertices.');
      return;
    }
    if (!name.trim()) {
      alert('Zone name is required.');
      return;
    }

    try {
      const payload = {
        name,
        color,
        severity,
        dwell_time_seconds: dwellTime,
        required_ppe: requiredPPE,
        polygon_coords: points,
        is_active: true,
      };

      if (editingZoneId) {
        await api.updateZone(editingZoneId, payload);
      } else {
        await api.createZone(payload);
      }

      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    }
  };

  const handleDelete = async (zoneId: string) => {
    if (confirm('Permanently delete this safety perimeter envelope?')) {
      try {
        await api.deleteZone(zoneId);
        onRefresh();
      } catch (err: any) {
        alert(`Delete error: ${err.message}`);
      }
    }
  };

  const toggleZoneActive = async (z: RestrictedZone) => {
    try {
      await api.updateZone(z.id, { is_active: !z.is_active });
      onRefresh();
    } catch (err: any) {
      alert(`Update error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center space-x-2">
            <span>Perimeter Envelope Calibration</span>
          </h1>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Normalized Coordinate Polygons · Feet-Ground Contact Containment · Dwell Filters
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={startNewZone}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Perimeter Envelope</span>
          </button>
        )}
      </div>

      {/* Interactive CAD Calibration View */}
      {isEditing && (
        <div className="p-4 rounded bg-zinc-900 border border-zinc-700/80 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-200">
                {editingZoneId ? 'Modify Envelope Geometry' : 'Draft New Perimeter Envelope'}
              </span>
            </div>
            <div className="font-mono text-zinc-400 text-[11px]">
              CURSOR: X: {mousePos.x.toFixed(3)} · Y: {mousePos.y.toFixed(3)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* SVG Calibration Canvas */}
            <div className="lg:col-span-2 space-y-2">
              <div className="relative aspect-video bg-[#060609] rounded border border-zinc-800 overflow-hidden cursor-crosshair">
                <svg
                  ref={svgRef}
                  onMouseMove={handleMouseMove}
                  onClick={handleCanvasClick}
                  className="w-full h-full"
                  viewBox="0 0 1000 562"
                >
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="1000" height="562" fill="#08080c" />
                  <rect width="1000" height="562" fill="url(#cadGrid)" />

                  {/* Existing other zones */}
                  {zones.filter(z => z.id !== editingZoneId).map(z => (
                    <polygon
                      key={z.id}
                      points={z.polygon_coords.map(p => `${p.x * 1000},${p.y * 562}`).join(' ')}
                      fill="rgba(255, 255, 255, 0.04)"
                      stroke="#3f3f46"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                  ))}

                  {/* Active Polygon Being Calibrated */}
                  {points.length >= 3 && (
                    <polygon
                      points={points.map(p => `${p.x * 1000},${p.y * 562}`).join(' ')}
                      fill={color}
                      fillOpacity="0.22"
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}

                  {/* Vertices Points with Index Tags */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x * 1000}
                        cy={p.y * 562}
                        r="5"
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth="2"
                      />
                      <text
                        x={p.x * 1000 + 7}
                        y={p.y * 562 - 7}
                        fill="#e4e4e7"
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        v{idx + 1}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="text-[11px] text-zinc-500 font-mono flex items-center justify-between">
                <span>CLICK TO ADD VERTEX · MINIMUM 3 VERTICES REQUIRED</span>
                <span>PLANE: NORMALIZED [0.0 - 1.0]</span>
              </div>
            </div>

            {/* Calibration Form & Numeric Vertices Inspector */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-mono text-[11px] mb-1">ENVELOPE IDENTIFIER</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-200 font-medium focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-mono text-[11px] mb-1">SEVERITY TIER</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono text-[11px] mb-1">COLOR TAG</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-8 rounded bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] mb-1">
                  <span>DWELL THRESHOLD</span>
                  <span className="text-zinc-200 font-bold">{dwellTime}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={dwellTime}
                  onChange={(e) => setDwellTime(parseFloat(e.target.value))}
                  className="w-full accent-zinc-500"
                />
              </div>

              {/* Required PPE */}
              <div>
                <label className="block text-zinc-400 font-mono text-[11px] mb-1">MANDATED PPE ITEMS</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => togglePPE('HELMET')}
                    className={`py-1.5 px-2 rounded border text-[11px] font-mono transition ${
                      requiredPPE.includes('HELMET')
                        ? 'bg-zinc-800 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    Hard Hat
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePPE('VEST')}
                    className={`py-1.5 px-2 rounded border text-[11px] font-mono transition ${
                      requiredPPE.includes('VEST')
                        ? 'bg-zinc-800 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    Hi-Vis Vest
                  </button>
                </div>
              </div>

              {/* Vertices Numeric Coordinates Table */}
              <div>
                <label className="block text-zinc-400 font-mono text-[11px] mb-1">
                  COORDINATES ({points.length} VERTICES)
                </label>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                  {points.map((pt, i) => (
                    <div key={i} className="flex items-center justify-between p-1 bg-zinc-950 rounded border border-zinc-800">
                      <span className="text-zinc-500">v{i + 1}</span>
                      <span className="text-zinc-300">X: {pt.x.toFixed(3)}</span>
                      <span className="text-zinc-300">Y: {pt.y.toFixed(3)}</span>
                      {points.length > 3 && (
                        <button
                          type="button"
                          onClick={() => removeVertex(i)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save & Cancel */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs transition"
                >
                  Save Envelope
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zone Envelopes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((z) => (
          <div
            key={z.id}
            className={`p-4 rounded border transition space-y-3 ${
              z.is_active
                ? 'bg-zinc-900/90 border-zinc-800'
                : 'bg-zinc-950/60 border-zinc-900 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                  <h3 className="text-xs font-bold text-zinc-100">{z.name}</h3>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {z.id}</div>
              </div>

              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                z.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/50' :
                z.severity === 'HIGH' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                'bg-zinc-800 text-zinc-300'
              }`}>
                {z.severity}
              </span>
            </div>

            {/* Geometry preview */}
            <div className="h-20 bg-[#060609] rounded border border-zinc-800 p-2 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 1000 562">
                <polygon
                  points={z.polygon_coords.map(p => `${p.x * 1000},${p.y * 562}`).join(' ')}
                  fill={z.color}
                  fillOpacity="0.25"
                  stroke={z.color}
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono text-zinc-400 pt-1">
              <div>VERTICES: <span className="text-zinc-200">{z.polygon_coords.length}</span></div>
              <div>DWELL: <span className="text-zinc-200">{z.dwell_time_seconds}s</span></div>
              <div className="col-span-2 text-[10px]">
                MANDATORY PPE: <span className="text-zinc-300">{z.required_ppe?.join(', ') || 'None'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
              <button
                onClick={() => toggleZoneActive(z)}
                className={`font-mono text-[11px] font-semibold transition ${
                  z.is_active ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                {z.is_active ? '● ENFORCED' : '○ DISABLED'}
              </button>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => startEditZone(z)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                  title="Calibrate Zone"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(z.id)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition"
                  title="Remove Envelope"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
