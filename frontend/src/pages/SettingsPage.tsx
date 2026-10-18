import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Layers,
  HardHat,
  Network,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Unplug,
  Zap,
  Save,
  Radio,
  Server,
  Activity,
  Terminal,
  ShieldCheck,
  Microchip,
  FolderLock
} from 'lucide-react';
import { api, SystemStatus } from '../api';

interface SettingsPageProps {
  status: SystemStatus | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ status, onRefresh }) => {
  const [personModelPath, setPersonModelPath] = useState('yolov8n.pt');
  const [ppeModelPath, setPpeModelPath] = useState('');
  const [isUpdatingModels, setIsUpdatingModels] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  // PipeGen action states
  const [isConnecting, setIsConnecting] = useState(false);
  const [pipegenMsg, setPipegenMsg] = useState<string | null>(null);

  const handleUpdateModels = async () => {
    try {
      setIsUpdatingModels(true);
      setUpdateMsg(null);
      await api.configureModels({
        person_model_path: personModelPath,
        ppe_model_path: ppeModelPath,
      });
      setUpdateMsg('MODEL REGISTRY RELOADED: Active weights hot-swapped into memory.');
      onRefresh();
    } catch (err: any) {
      setUpdateMsg(`REGISTRY ERROR: ${err.message}`);
    } finally {
      setIsUpdatingModels(false);
    }
  };

  const handleConnectPipeGen = async () => {
    try {
      setIsConnecting(true);
      setPipegenMsg(null);
      const res = await api.connectPipeline();
      setPipegenMsg(`BRIDGE ESTABLISHED: ${res.message || 'PipeGen edge pipeline connected.'}`);
      onRefresh();
    } catch (err: any) {
      setPipegenMsg(`BRIDGE REJECTED: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectPipeGen = async () => {
    try {
      setIsConnecting(true);
      setPipegenMsg(null);
      const res = await api.disconnectPipeline();
      setPipegenMsg(`BRIDGE TERMINATED: ${res.message || 'PipeGen edge pipeline disconnected.'}`);
      onRefresh();
    } catch (err: any) {
      setPipegenMsg(`DISCONNECT ERROR: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendTestEvent = async () => {
    try {
      setIsConnecting(true);
      setPipegenMsg(null);
      const res = await api.sendPipelineTestEvent();
      setPipegenMsg(`SYNTHETIC INGRESS INGESTED: Incident ${res.incident_id || 'OK'} registered in audit log.`);
      onRefresh();
    } catch (err: any) {
      setPipegenMsg(`INGESTION FAILURE: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRunLivePipeline = async () => {
    try {
      setIsConnecting(true);
      setPipegenMsg(null);
      const res = await api.runLivePipeline();
      setPipegenMsg(`PROCESS SPAWNED: ${res.message || 'Live PipeGen edge pipeline runner launched.'}`);
      onRefresh();
    } catch (err: any) {
      setPipegenMsg(`SPAWN ERROR: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const isPipeConnected = status?.pipegen_status === 'CONNECTED';

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center space-x-1">
              <Server className="w-3 h-3 text-amber-500" />
              <span>NODE: ATX-EDGE-01A</span>
            </span>
            <span>/</span>
            <span>HARDWARE & PIPELINE PARAMETERIZATION</span>
            <span>/</span>
            <span className="text-zinc-400">FIRMWARE: 2.4.12-LTS</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2 mt-1">
            <span>Hardware Diagnostics & Edge Model Parameterization</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure PyTorch / ONNX neural inference runtimes, CraftifAI PipeGen edge adapters, and forensically sealed storage volumes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>POLL DIAGNOSTICS</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module 1: Hardware Compute Engine */}
        <div className="rounded bg-zinc-900/90 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Host Compute Engine & Hardware Acceleration
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">BUS ARCHITECTURE</span>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Inference Backend</span>
                <span className="text-sm font-bold text-cyan-400 mt-1 block">
                  {status?.inference_device || 'CPU'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
                  PyTorch Core Runtime
                </span>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">NVIDIA CUDA Subsystem</span>
                <span
                  className={`text-sm font-bold mt-1 block ${
                    status?.is_cuda_available ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {status?.is_cuda_available ? 'CUDA ACTIVE' : 'HOST CPU ONLY'}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
                  {status?.is_cuda_available ? 'GPU device attached' : 'No discrete GPU target'}
                </span>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">TensorRT / Jetson</span>
                <span className="text-sm font-bold text-zinc-300 mt-1 block">
                  {status?.tensorrt_status}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
                  Hardware Engine Spec
                </span>
              </div>
            </div>

            <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">PROCESSOR CORES:</span>
                <span className="text-zinc-300 font-semibold">AMD/Intel 64-bit Architecture</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">FRAME BUFFER:</span>
                <span className="text-zinc-300 font-semibold">Unified Shared Memory Buffer (64-bit DMA)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">PRECISION MODE:</span>
                <span className="text-zinc-300 font-semibold">FP32 Linear Weights (Zero Quant Loss)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Storage Forensics & Evidence Retention */}
        <div className="rounded bg-zinc-900/90 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                Non-Volatile Evidentiary Storage & Hash Vault
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">SQLITE + SHA-256</span>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Keyframe Snapshots</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {status?.evidence_count || 0}
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
                  JPEG / PNG Ingress Crops
                </span>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Storage Allocated</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {((status?.storage_used_bytes || 0) / 1024 / 1024).toFixed(2)} MB
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
                  Local NVMe Pool
                </span>
              </div>

              <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block uppercase">Retention Policy</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">
                  30 DAYS
                </span>
                <span className="text-[10px] text-zinc-500 mt-1 block font-sans">
                  OSHA 1904 Compliant
                </span>
              </div>
            </div>

            <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">DIGITAL SIGNATURE:</span>
                <span className="text-emerald-400 font-semibold">FIPS 180-4 SHA-256 Digest</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">DATABASE BACKEND:</span>
                <span className="text-zinc-300 font-semibold">SQLAlchemy / SQLite WAL Mode</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">AUDIT LOG PURGE:</span>
                <span className="text-zinc-300 font-semibold">Never Purged (Append-Only Journal)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module 3: CraftifAI PipeGen Edge Integration Bridge */}
      <div className="rounded bg-zinc-900/90 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Network className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              CraftifAI PipeGen Edge Pipeline Bridge
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPipeConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`text-[10px] font-mono font-bold tracking-wider ${
                isPipeConnected ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              BRIDGE {status?.pipegen_status || 'DISCONNECTED'}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">Bridge Status</span>
              <span
                className={`text-sm font-bold mt-1 block ${
                  isPipeConnected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {status?.pipegen_status || 'NOT CONNECTED'}
              </span>
            </div>

            <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">Ingestion Endpoint</span>
              <span className="text-sm font-bold text-zinc-200 mt-1 block truncate">
                /api/pipeline/events
              </span>
            </div>

            <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">Telemetry Protocol</span>
              <span className="text-sm font-bold text-zinc-200 mt-1 block">
                REST / Schema V1
              </span>
            </div>

            <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">Edge Script Target</span>
              <span className="text-sm font-bold text-indigo-400 mt-1 block truncate">
                pipegen/pipegen_pipeline.py
              </span>
            </div>
          </div>

          {/* Bridge Controls */}
          <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <span className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                Edge Pipeline Transport Operations
              </span>
              <span className="text-[10px] text-zinc-500">
                ACTIVE PIPELINE SPEC: ai_safety_sentinel_360_spec.json
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isPipeConnected ? (
                <button
                  onClick={handleConnectPipeGen}
                  disabled={isConnecting}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-mono font-bold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>CONNECT BRIDGE</span>
                </button>
              ) : (
                <button
                  onClick={handleDisconnectPipeGen}
                  disabled={isConnecting}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Unplug className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span>DISCONNECT BRIDGE</span>
                </button>
              )}

              <button
                onClick={handleSendTestEvent}
                disabled={isConnecting}
                className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>INJECT SCHEMA V1 TELEMETRY TEST</span>
              </button>

              <button
                onClick={handleRunLivePipeline}
                disabled={isConnecting}
                className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-semibold text-xs flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>LAUNCH PIPEGEN EDGE DAEMON</span>
              </button>
            </div>

            {pipegenMsg && (
              <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-amber-400 font-mono flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{pipegenMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module 4: Neural Vision Model Registry */}
      <div className="rounded bg-zinc-900/90 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
              Neural Vision Model Registry & Weight Assignment
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">HOT-SWAPPABLE ONNX / PT</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Person Detector Model */}
            <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-200 font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Primary Person Detector Model</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {status?.person_model_status || 'READY'}
                </span>
              </div>

              <input
                type="text"
                value={personModelPath}
                onChange={(e) => setPersonModelPath(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition"
                placeholder="yolov8n.pt or /path/to/person_model.onnx"
              />

              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                <span>Active Target: {status?.person_model_name || 'yolov8n.pt'}</span>
                <span>IO: 640x640 FP32</span>
              </div>
            </div>

            {/* PPE Classifier Model */}
            <div className="p-3.5 rounded bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-200 font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <HardHat className="w-3.5 h-3.5 text-amber-400" />
                  <span>Secondary PPE Classifier Model</span>
                </label>
                <span className="text-[10px] text-zinc-400 font-bold">
                  {status?.ppe_model_status || 'UNCONFIGURED'}
                </span>
              </div>

              <input
                type="text"
                value={ppeModelPath}
                onChange={(e) => setPpeModelPath(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-amber-500 transition"
                placeholder="Leave blank or specify custom ppe_weights.pt / .onnx"
              />

              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
                <span>Classes: Helmet, Vest, Glasses, Boots</span>
                <span>Fallback: Honest Reporting</span>
              </div>
            </div>
          </div>

          {updateMsg && (
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-amber-400 font-mono flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{updateMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleUpdateModels}
              disabled={isUpdatingModels}
              className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-xs flex items-center space-x-1.5 transition disabled:opacity-50 shadow-sm"
            >
              {isUpdatingModels ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>COMMIT MODEL PARAMETERS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

