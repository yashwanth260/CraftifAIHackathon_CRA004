import React, { useState, useEffect } from 'react';
import {
  Film,
  Upload,
  Play,
  Square,
  RefreshCw,
  Sliders,
  Sparkles,
  Terminal,
  Activity,
  FileVideo,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api, VideoSource, ProcessingJob, RestrictedZone } from '../api';

interface VideoAnalysisPageProps {
  videos: VideoSource[];
  jobs: ProcessingJob[];
  zones: RestrictedZone[];
  onRefresh: () => void;
}

export const VideoAnalysisPage: React.FC<VideoAnalysisPageProps> = ({
  videos,
  jobs,
  zones,
  onRefresh
}) => {
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [activeJob, setActiveJob] = useState<ProcessingJob | null>(null);

  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos, selectedVideoId]);

  useEffect(() => {
    const running = jobs.find(j => j.status === 'RUNNING');
    if (running) {
      setActiveJob(running);
      const interval = setInterval(async () => {
        try {
          const updated = await api.getJob(running.id);
          setActiveJob(updated);
          if (updated.status !== 'RUNNING') {
            onRefresh();
          }
        } catch {
          // ignore
        }
      }, 1500);
      return () => clearInterval(interval);
    } else {
      setActiveJob(null);
    }
  }, [jobs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const newVideo = await api.uploadVideo(file);
      setSelectedVideoId(newVideo.id);
      onRefresh();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSample = async () => {
    try {
      setIsGenerating(true);
      const sample = await api.generateSampleVideo();
      setSelectedVideoId(sample.id);
      onRefresh();
    } catch (err: any) {
      alert(`Sample video generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedVideoId) return;
    try {
      setIsStartingJob(true);
      const job = await api.createJob(selectedVideoId);
      setActiveJob(job);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to start job: ${err.message}`);
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleStopAnalysis = async () => {
    if (!activeJob) return;
    try {
      await api.stopJob(activeJob.id);
      onRefresh();
    } catch (err: any) {
      alert(`Stop error: ${err.message}`);
    }
  };

  const selectedVideo = videos.find(v => v.id === selectedVideoId);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center space-x-2">
            <span>Video Ingestion & Batch Computer Vision Ingest</span>
          </h1>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Asynchronous Multi-Threaded Processing Worker · Tracking Telemetry Ingest · Frame Extraction
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={handleGenerateSample}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold flex items-center space-x-1.5 transition"
          >
            {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span>Generate Test Feed</span>
          </button>

          <label className="px-3 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-900 font-semibold flex items-center space-x-1.5 cursor-pointer transition">
            {isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Upload MP4 Source</span>
            <input
              type="file"
              accept="video/mp4,video/avi,video/mov,video/webm"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Active Processing Job Banner */}
      {activeJob && (
        <div className="p-4 rounded bg-zinc-900 border border-zinc-700 space-y-2.5 font-mono shadow-md">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-bold text-zinc-100">THREAD WORKER ACTIVE [JOB #{activeJob.id.substring(0, 10)}]</span>
            </div>
            <button
              onClick={handleStopAnalysis}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-red-400 font-bold text-[11px] border border-zinc-700 transition"
            >
              Abort Thread
            </button>
          </div>

          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] text-zinc-400 pt-1">
            <div>PROGRESS: <strong className="text-zinc-100">{activeJob.progress.toFixed(1)}%</strong></div>
            <div>FRAMES: <strong className="text-zinc-100">{activeJob.processed_frames} / {activeJob.total_frames}</strong></div>
            <div>THROUGHPUT: <strong className="text-emerald-400">{activeJob.fps_measured} FPS</strong></div>
            <div>TRACKS: <strong className="text-zinc-100">{activeJob.person_count}</strong></div>
            <div>VIOLATIONS: <strong className="text-red-400">{activeJob.incident_count}</strong></div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Source Selector & Execution Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Video List */}
        <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-xs font-mono">
            <span className="font-semibold text-zinc-200">Ingest Media Library</span>
            <span className="text-zinc-500">{videos.length} feeds</span>
          </div>

          {videos.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono space-y-2">
              <p>No video sources ingested.</p>
              <button
                onClick={handleGenerateSample}
                className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 text-xs"
              >
                Generate Synthetic Feed
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => setSelectedVideoId(vid.id)}
                  className={`p-2.5 rounded border text-xs cursor-pointer transition font-mono ${
                    selectedVideoId === vid.id
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1">
                    <span className="truncate max-w-[160px]">{vid.filename}</span>
                    <span className="text-[10px] text-emerald-400">{vid.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{vid.duration_seconds}s ({vid.total_frames} frames)</span>
                    <span>{vid.width}x{vid.height} @ {vid.fps.toFixed(0)}fps</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Execution Configuration */}
        <div className="lg:col-span-2 p-4 rounded bg-zinc-900/90 border border-zinc-800 space-y-4">
          <div className="pb-2 border-b border-zinc-800/80 text-xs font-mono">
            <span className="font-semibold text-zinc-200">Execution Parameters & Analysis Pipeline</span>
          </div>

          {selectedVideo ? (
            <div className="space-y-3.5 text-xs font-mono">
              <div className="p-3 rounded bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500">TARGET SOURCE METADATA</span>
                <div className="text-xs font-bold text-zinc-100">{selectedVideo.filename}</div>
                <div className="grid grid-cols-4 gap-2 text-zinc-400 text-[10px] pt-1">
                  <div>RESOLUTION: <span className="text-zinc-200">{selectedVideo.width}x{selectedVideo.height}</span></div>
                  <div>FPS: <span className="text-zinc-200">{selectedVideo.fps.toFixed(1)}</span></div>
                  <div>FRAMES: <span className="text-zinc-200">{selectedVideo.total_frames}</span></div>
                  <div>FILE SIZE: <span className="text-zinc-200">{(selectedVideo.filesize_bytes / 1024 / 1024).toFixed(1)} MB</span></div>
                </div>
              </div>

              {/* Active Zones Monitored */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase">ENFORCED PERIMETERS ({zones.filter(z => z.is_active).length})</span>
                <div className="grid grid-cols-2 gap-2">
                  {zones.filter(z => z.is_active).map(z => (
                    <div key={z.id} className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                        <span className="text-zinc-200 font-medium">{z.name}</span>
                      </div>
                      <span className="text-zinc-500 text-[10px]">Dwell: {z.dwell_time_seconds}s</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Launch Button */}
              <div className="pt-2 font-sans">
                <button
                  onClick={handleStartAnalysis}
                  disabled={isStartingJob || activeJob?.status === 'RUNNING'}
                  className="w-full py-2.5 rounded bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  {isStartingJob ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Launch Computer Vision Job</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-zinc-500 text-xs font-mono">
              Select an ingested feed to inspect parameters.
            </div>
          )}

          {/* Job History */}
          <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs font-mono">
            <span className="text-[10px] text-zinc-500 uppercase">BATCH WORKER HISTORY</span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="py-1.5 px-2">JOB ID</th>
                    <th className="py-1.5 px-2">STATUS</th>
                    <th className="py-1.5 px-2">PROGRESS</th>
                    <th className="py-1.5 px-2">VIOLATIONS</th>
                    <th className="py-1.5 px-2">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {jobs.slice(0, 4).map(j => (
                    <tr key={j.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-2 text-zinc-300">{j.id.substring(0, 14)}</td>
                      <td className="py-2 px-2">
                        <span className={`text-[10px] font-bold ${
                          j.status === 'COMPLETED' ? 'text-emerald-400' :
                          j.status === 'RUNNING' ? 'text-amber-400' :
                          'text-zinc-500'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="py-2 px-2">{j.progress.toFixed(0)}%</td>
                      <td className="py-2 px-2 text-red-400 font-bold">{j.incident_count}</td>
                      <td className="py-2 px-2 text-zinc-500">{new Date(j.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
