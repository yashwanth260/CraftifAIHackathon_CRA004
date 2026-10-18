import React, { useState } from 'react';
import {
  HardHat,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  FileText,
  AlertTriangle,
  ArrowRight,
  Info
} from 'lucide-react';
import { SystemStatus, Incident, RestrictedZone } from '../api';

interface PPECompliancePageProps {
  status: SystemStatus | null;
  incidents: Incident[];
  zones: RestrictedZone[];
  onRefresh: () => void;
}

export const PPECompliancePage: React.FC<PPECompliancePageProps> = ({
  status,
  incidents,
  zones
}) => {
  const compliantCount = incidents.filter(i => i.ppe_status === 'COMPLIANT').length;
  const nonCompliantCount = incidents.filter(i => i.ppe_status === 'NON_COMPLIANT').length;
  const uncertainCount = incidents.filter(i => i.ppe_status === 'UNCERTAIN').length;
  const notEvaluatedCount = incidents.filter(i => i.ppe_status === 'NOT_EVALUATED').length;

  const totalEvaluated = compliantCount + nonCompliantCount;
  const complianceRate = totalEvaluated > 0
    ? ((compliantCount / totalEvaluated) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center space-x-2">
            <span>PPE Hygiene & Compliance Protocol Engine</span>
          </h1>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            OSHA 1910.135 (Head Protection) · ANSI/ISEA 107 (High-Visibility Workwear) · Anatomical ROI Extraction
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-zinc-500">CLASSIFIER LINK:</span>
          {status?.ppe_model_status === 'READY' ? (
            <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 font-bold border border-emerald-900/50">
              ACTIVE [ONLINE]
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono border border-zinc-800">
              AWAITING SECONDARY WEIGHTS (NOT_EVALUATED)
            </span>
          )}
        </div>
      </div>

      {/* Compliance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>COMPLIANCE RATE</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{complianceRate}%</div>
          <div className="text-[10px] text-emerald-400 font-mono">ANSI/ISEA benchmark compliant</div>
        </div>

        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>NON-COMPLIANT</span>
            <XCircle className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{nonCompliantCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Missing mandatory items</div>
        </div>

        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>UNCERTAIN OCCLUSION</span>
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{uncertainCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Partially obstructed line of sight</div>
        </div>

        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span>UNINSPECTED</span>
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-300">{notEvaluatedCount}</div>
          <div className="text-[10px] text-zinc-500 font-mono">Outside mandated PPE zones</div>
        </div>
      </div>

      {/* Live Camera PPE Verification Station Banner */}
      <div className="p-4 rounded bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900 border border-red-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE DEMO: OSHA 1910.135 CRANIAL HELMET SCANNER</span>
          </div>
          <h2 className="text-sm font-bold text-zinc-100">
            Instantaneous Red Indication Signal for Missing Hard Hats
          </h2>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-2xl">
            Activate the operator webcam demo or live CCTV stream. The computer vision engine continuously tracks operators and flags any individual without a safety hard hat with an instantaneous <strong>RED alert signal</strong>, bounding reticle, and audit alarm.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <a
            href="/monitoring"
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-red-950/50"
          >
            <HardHat className="w-4 h-4" />
            <span>LAUNCH CAMERA DEMO</span>
          </a>
        </div>
      </div>

      {/* Dual-Stage Vision Pipeline Architecture */}
      <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
          <span className="font-semibold text-zinc-200">Dual-Stage Hierarchical Classification Architecture</span>
          <span className="text-[10px] font-mono text-zinc-500">IEEE Industrial Vision Specification</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 text-[10px]">STAGE 1: LOCUS DETECTION</span>
            <div className="font-bold text-zinc-200">YOLOv8 Person Anchor</div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1">
              Extracts primary humanoid bounding coordinates with non-max suppression and tracks across frames.
            </p>
          </div>

          <div className="p-3 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 text-[10px]">STAGE 2: ROI CROPPING</span>
            <div className="font-bold text-zinc-200">Cranial & Thoracic Slicing</div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1">
              Cranial crop (0–25% vertical height) checks for hard hat. Thoracic crop (25–70%) verifies high-visibility vest.
            </p>
          </div>

          <div className="p-3 rounded bg-zinc-950 border border-zinc-800/80 space-y-1">
            <span className="text-zinc-500 text-[10px]">STAGE 3: DISAMBIGUATION</span>
            <div className="font-bold text-zinc-200">Uncertainty Protocol</div>
            <p className="text-[11px] text-zinc-400 font-sans leading-relaxed pt-1">
              Low-resolution crops or partial occlusion flag an UNCERTAIN state rather than registering a false compliance violation.
            </p>
          </div>
        </div>
      </div>

      {/* Mandated Gear by Zone */}
      <div className="p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs">
          <span className="font-semibold text-zinc-200">Zone-Specific Personal Protective Equipment Matrix</span>
          <span className="text-[10px] font-mono text-zinc-500">{zones.length} configured envelopes</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {zones.map((z) => (
            <div key={z.id} className="p-3 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                  <span className="font-bold text-zinc-100">{z.name}</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">ZONE ID: {z.id}</div>
              </div>

              <div className="flex items-center space-x-1.5">
                {z.required_ppe && z.required_ppe.length > 0 ? (
                  z.required_ppe.map((item) => (
                    <span key={item} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold text-[10px]">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-600 text-[10px]">No Mandate</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
