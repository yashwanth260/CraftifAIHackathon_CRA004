import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Camera,
  Maximize2,
  Volume2,
  VolumeX,
  Sliders,
  Shield,
  Layers,
  Grid,
  Square,
  AlertTriangle,
  Clock,
  Eye,
  Video,
  CheckCircle2,
  XCircle,
  HardHat,
  RefreshCw,
  Bell
} from 'lucide-react';
import { Incident, RestrictedZone, api } from '../api';

interface LiveMonitoringPageProps {
  incidents: Incident[];
  zones: RestrictedZone[];
  onRefresh?: () => void;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({ incidents, zones, onRefresh }) => {
  const [selectedCamera, setSelectedCamera] = useState('CAM-LIVE [Live Camera Demo · Helmet AI]');
  const [showOverlays, setShowOverlays] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [gridMode, setGridMode] = useState<'single' | 'quad'>('single');
  const [liveClock, setLiveClock] = useState(new Date().toISOString().substring(11, 19));

  // Live Camera Demo States
  const [demoPpeMode, setDemoPpeMode] = useState<'NO_HELMET' | 'WEARING_HELMET' | 'AUTO'>('NO_HELMET');
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isLoggingIncident, setIsLoggingIncident] = useState(false);
  const [incidentLogMsg, setIncidentLogMsg] = useState<string | null>(null);
  const [liveDetection, setLiveDetection] = useState<{
    has_person: boolean;
    has_helmet: boolean;
    signal: 'RED_ALERT' | 'GREEN_PASS';
    confidence: number;
    reason: string;
  }>({
    has_person: true,
    has_helmet: false,
    signal: 'RED_ALERT',
    confidence: 0.94,
    reason: 'CRITICAL HAZARD: Operator observed without mandatory OSHA 1910.135 safety hard hat.'
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Play synthetic audio alarm
  const playAlarmSound = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio context blocked by browser autoplay policy
    }
  };

  // Clock interval
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date().toISOString().substring(11, 19));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web camera activation / deactivation when CAM-LIVE is selected
  useEffect(() => {
    let active = true;

    if (selectedCamera.startsWith('CAM-LIVE')) {
      const startWebcam = async () => {
        try {
          setWebcamError(null);
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          });
          if (!active) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setIsWebcamActive(true);
        } catch (err: any) {
          console.warn('Webcam access not granted, using simulated video stream:', err.message);
          setIsWebcamActive(false);
          setWebcamError(err.message || 'Webcam unattached or permission denied. Running synthetic camera feed.');
        }
      };

      startWebcam();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsWebcamActive(false);
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [selectedCamera]);

  // Periodic frame inference when in live camera demo
  useEffect(() => {
    if (!selectedCamera.startsWith('CAM-LIVE')) return;

    const interval = setInterval(async () => {
      // Trigger sound beep if in NO_HELMET mode and not muted
      if (demoPpeMode === 'NO_HELMET' && !isMuted) {
        playAlarmSound();
      }

      // If webcam video is playing, capture frame and send to backend
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 320, 240);
            const b64 = canvas.toDataURL('image/jpeg', 0.65);
            const res = await api.analyzeLiveFrame({
              image_base64: b64,
              demo_ppe_mode: demoPpeMode,
              log_incident: false
            });

            if (res.success && res.detections.length > 0) {
              const d = res.detections[0];
              setLiveDetection({
                has_person: true,
                has_helmet: d.has_helmet,
                signal: d.signal,
                confidence: d.confidence,
                reason: d.reason
              });
            }
          }
        } catch (e) {
          // Frame capture fallback
        }
      } else {
        // Simulated frame fallback
        const hasHelmet = demoPpeMode === 'WEARING_HELMET';
        setLiveDetection({
          has_person: true,
          has_helmet: hasHelmet,
          signal: hasHelmet ? 'GREEN_PASS' : 'RED_ALERT',
          confidence: 0.94,
          reason: hasHelmet
            ? 'COMPLIANT: Hard hat verified on cranial vault (ANSI Z89.1).'
            : 'CRITICAL HAZARD: Operator observed without mandatory OSHA 1910.135 safety hard hat.'
        });
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [selectedCamera, demoPpeMode, isMuted]);

  // Handle manual incident logging from live camera
  const handleLogLiveViolation = async () => {
    try {
      setIsLoggingIncident(true);
      setIncidentLogMsg(null);

      let b64 = '';
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          b64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      } else {
        // Generate blank frame
        b64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
      }

      const res = await api.analyzeLiveFrame({
        image_base64: b64,
        demo_ppe_mode: demoPpeMode,
        log_incident: true,
        source_name: 'CAM-LIVE [Operator Webcam / Live AI Demo]'
      });

      setIncidentLogMsg(`VIOLATION RECORDED: ${res.logged_incident_id || 'OK'} added to Incident Logbook.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setIncidentLogMsg(`Failed to log: ${err.message}`);
    } finally {
      setIsLoggingIncident(false);
    }
  };

  const isLiveCam = selectedCamera.startsWith('CAM-LIVE');
  const isRedAlert = isLiveCam && (!liveDetection.has_helmet || demoPpeMode === 'NO_HELMET');

  const cameras = [
    {
      id: 'CAM-LIVE',
      name: 'CAM-LIVE [Live Camera Demo · Helmet AI]',
      ip: 'WEBCAM / USB',
      fps: '30.0',
      bitrate: 'RAW RGB',
      badge: 'LIVE DEMO'
    },
    { id: 'CAM-01', name: 'CAM-01 [Robotics Bay A]', ip: '192.168.1.101', fps: '30.0', bitrate: '3.8 Mbps' },
    { id: 'CAM-02', name: 'CAM-02 [Transit Corridor]', ip: '192.168.1.102', fps: '25.0', bitrate: '2.4 Mbps' },
    { id: 'CAM-03', name: 'CAM-03 [Loading Bay West]', ip: '192.168.1.103', fps: '30.0', bitrate: '4.1 Mbps' },
    { id: 'CAM-04', name: 'CAM-04 [Perimeter Curtain]', ip: '192.168.1.104', fps: '30.0', bitrate: '3.2 Mbps' },
  ];

  return (
    <div className="space-y-4">
      {/* Top CCTV Surveillance Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-zinc-800/80 gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center space-x-2">
            <span>Perimeter CCTV Matrix Console</span>
            {isLiveCam && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                LIVE DEMO ACTIVE
              </span>
            )}
          </h1>
          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
            Synchronous Low-Latency Stream Ingest · Real-Time Cranial Helmet Verification HUD · Optical Safety Alarms
          </div>
        </div>

        {/* Video Controls & Mode Toggles */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={() => setSelectedCamera('CAM-LIVE [Live Camera Demo · Helmet AI]')}
            className={`px-3 py-1 rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition ${
              isLiveCam
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>WEBCAM DEMO</span>
          </button>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5">
            <button
              onClick={() => setGridMode('single')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                gridMode === 'single' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setGridMode('quad')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                gridMode === 'quad' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              2x2 Quad
            </button>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded border transition ${
              isMuted
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                : 'bg-red-500/20 border-red-500/40 text-red-400'
            }`}
            title={isMuted ? 'Unmute Audio Alarms' : 'Mute Alarms'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Surveillance Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Viewport Container */}
        <div className="lg:col-span-3 space-y-3">
          {/* Interactive Live Demo Controller (Helmet Switcher & Incident Logger) */}
          {isLiveCam && (
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 space-y-2 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-800/80 pb-1.5">
                <div className="flex items-center space-x-2">
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-zinc-200">
                    Live Camera Demonstration Mode Controls
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400">
                  {isWebcamActive ? 'WEBCAM STREAM (640x480 @ 30 FPS)' : 'SYNTHETIC CAMERA FEED (STANDALONE)'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* 3-Way Mode Switcher */}
                <div className="flex items-center bg-zinc-950 p-1 rounded border border-zinc-800 gap-1">
                  <button
                    onClick={() => setDemoPpeMode('NO_HELMET')}
                    className={`px-3 py-1 rounded font-bold text-[11px] flex items-center space-x-1.5 transition ${
                      demoPpeMode === 'NO_HELMET'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>DEMO: NO HELMET (TRIGGER RED SIGNAL)</span>
                  </button>

                  <button
                    onClick={() => setDemoPpeMode('WEARING_HELMET')}
                    className={`px-3 py-1 rounded font-bold text-[11px] flex items-center space-x-1.5 transition ${
                      demoPpeMode === 'WEARING_HELMET'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DEMO: WEARING HELMET (GREEN SIGNAL)</span>
                  </button>

                  <button
                    onClick={() => setDemoPpeMode('AUTO')}
                    className={`px-3 py-1 rounded font-bold text-[11px] flex items-center space-x-1.5 transition ${
                      demoPpeMode === 'AUTO'
                        ? 'bg-amber-500 text-zinc-950 shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>AUTO AI SCAN</span>
                  </button>
                </div>

                {/* Instant Snapshot Record Button */}
                <button
                  onClick={handleLogLiveViolation}
                  disabled={isLoggingIncident}
                  className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-[11px] flex items-center space-x-1.5 transition shadow-sm"
                >
                  {isLoggingIncident ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>LOG VIOLATION TO AUDIT DB</span>
                </button>
              </div>

              {incidentLogMsg && (
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-amber-400 font-mono">
                  {incidentLogMsg}
                </div>
              )}
            </div>
          )}

          <div
            className={`relative aspect-video bg-[#050508] rounded border overflow-hidden shadow-2xl flex flex-col justify-between p-3 select-none transition-all ${
              isRedAlert
                ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.35)] ring-2 ring-red-500/40'
                : 'border-zinc-800'
            }`}
          >
            {/* Real Webcam Video Element */}
            {isLiveCam && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                  isWebcamActive ? 'opacity-90' : 'opacity-0 pointer-events-none'
                }`}
              />
            )}

            {/* Synthetic Video Canvas Fallback when camera is not granted or disabled */}
            {(!isLiveCam || !isWebcamActive) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 1000 562">
                  <rect width="1000" height="562" fill="#08080c" />
                  <defs>
                    <pattern id="cctvGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="1000" height="562" fill="url(#cctvGrid)" />

                  {/* Synthetic Worker Silhouette for Live Demo */}
                  <g transform="translate(430, 140)">
                    {/* Head / Helmet */}
                    <ellipse
                      cx="70"
                      cy="45"
                      rx="26"
                      ry="32"
                      fill={isRedAlert ? '#261214' : '#14291f'}
                      stroke={isRedAlert ? '#ef4444' : '#10b981'}
                      strokeWidth="2"
                    />

                    {/* Hard Hat if Compliant */}
                    {!isRedAlert && (
                      <path
                        d="M 40 45 C 40 18, 100 18, 100 45 Z"
                        fill="#f59e0b"
                        stroke="#fbbf24"
                        strokeWidth="2"
                      />
                    )}

                    {/* Torso */}
                    <path
                      d="M 30 85 L 110 85 L 125 240 L 15 240 Z"
                      fill="#18181b"
                      stroke={isRedAlert ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}
                      strokeWidth="2"
                    />

                    {/* Arms */}
                    <line x1="30" y1="90" x2="5" y2="210" stroke="#27272a" strokeWidth="12" strokeLinecap="round" />
                    <line x1="110" y1="90" x2="135" y2="210" stroke="#27272a" strokeWidth="12" strokeLinecap="round" />

                    {/* Legs */}
                    <line x1="45" y1="240" x2="40" y2="380" stroke="#27272a" strokeWidth="16" strokeLinecap="round" />
                    <line x1="95" y1="240" x2="100" y2="380" stroke="#27272a" strokeWidth="16" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
            )}

            {/* Tactical Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 1000 562">
                <line x1="485" y1="281" x2="515" y2="281" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1="500" y1="266" x2="500" y2="296" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              </svg>
            </div>

            {/* Top OSD Header */}
            <div className="flex items-center justify-between z-10 text-xs font-mono">
              <div className="flex items-center space-x-3 bg-black/70 px-2.5 py-1 rounded border border-white/10 backdrop-blur-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${isRedAlert ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
                <span className="text-zinc-200 font-bold tracking-wider">{selectedCamera}</span>
                <span className="text-zinc-500">|</span>
                <span className={isRedAlert ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                  {isRedAlert ? 'ALERT ACTIVE ●' : 'LIVE ●'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowOverlays(!showOverlays)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                    showOverlays
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold'
                      : 'bg-black/60 border-zinc-800 text-zinc-500'
                  }`}
                >
                  TARGET HUD: {showOverlays ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* CRITICAL RED INDICATION SIGNAL BANNER */}
            {isLiveCam && isRedAlert && showOverlays && (
              <div className="absolute top-12 left-0 right-0 mx-auto w-fit z-20 px-4 py-1.5 rounded bg-red-600 text-white font-mono font-bold text-xs tracking-wider flex items-center space-x-2 border-2 border-red-300 shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-bounce">
                <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                <span>RED INDICATION SIGNAL: NO SAFETY HELMET DETECTED (OSHA 1910.135)</span>
              </div>
            )}

            {/* GREEN COMPLIANCE SIGNAL BANNER */}
            {isLiveCam && !isRedAlert && showOverlays && (
              <div className="absolute top-12 left-0 right-0 mx-auto w-fit z-20 px-4 py-1.5 rounded bg-emerald-600 text-white font-mono font-bold text-xs tracking-wider flex items-center space-x-2 border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.7)]">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>GREEN INDICATION SIGNAL: SAFETY HELMET CONFIRMED [ANSI Z89.1]</span>
              </div>
            )}

            {/* Real-time Bounding Reticles for Live Camera */}
            {isLiveCam && showOverlays && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 1000 562">
                  {/* Person Bounding Box */}
                  <g transform="translate(380, 100)">
                    <rect
                      x="0"
                      y="0"
                      width="240"
                      height="400"
                      fill={isRedAlert ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.05)'}
                      stroke={isRedAlert ? '#ef4444' : '#10b981'}
                      strokeWidth={isRedAlert ? '2.5' : '2'}
                      strokeDasharray={isRedAlert ? '6 3' : 'none'}
                    />

                    {/* Corner Target Brackets */}
                    <path
                      d="M 0 25 L 0 0 L 25 0 M 215 0 L 240 0 L 240 25 M 0 375 L 0 400 L 25 400 M 215 400 L 240 400 L 240 375"
                      fill="none"
                      stroke={isRedAlert ? '#ef4444' : '#10b981'}
                      strokeWidth="3.5"
                    />

                    {/* Person Header Tag */}
                    <rect
                      x="0"
                      y="-24"
                      width="210"
                      height="24"
                      fill={isRedAlert ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)'}
                    />
                    <text
                      x="8"
                      y="-7"
                      fill="#ffffff"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isRedAlert ? 'TRK#LIVE-01 VIOLATION' : 'TRK#LIVE-01 COMPLIANT'}
                    </text>

                    {/* Head / Cranial Target Box */}
                    <rect
                      x="50"
                      y="15"
                      width="140"
                      height="120"
                      fill={isRedAlert ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)'}
                      stroke={isRedAlert ? '#ef4444' : '#10b981'}
                      strokeWidth="2"
                    />

                    {/* Cranial Tag */}
                    <rect
                      x="50"
                      y="140"
                      width="140"
                      height="22"
                      fill="rgba(0, 0, 0, 0.85)"
                      stroke={isRedAlert ? '#ef4444' : '#10b981'}
                      strokeWidth="1"
                    />
                    <text
                      x="58"
                      y="155"
                      fill={isRedAlert ? '#ef4444' : '#10b981'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {isRedAlert ? 'HELMET: MISSING' : 'HELMET: PRESENT'}
                    </text>
                  </g>
                </svg>
              </div>
            )}

            {/* Bottom OSD Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between z-10 text-[11px] font-mono text-zinc-300 bg-black/70 px-3 py-1.5 rounded border border-white/10 backdrop-blur-sm gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span>TIME: <strong className="text-zinc-100">{liveClock} UTC</strong></span>
                <span>INFERENCE: <strong className="text-amber-400">YOLOv8 + CRANIAL</strong></span>
                <span>
                  PPE STATUS:{' '}
                  <strong className={isRedAlert ? 'text-red-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
                    {isRedAlert ? 'RED ALERT (NO HELMET)' : 'COMPLIANT (VERIFIED)'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center space-x-3 text-zinc-400">
                <span>LATENCY: <strong className="text-emerald-400">18ms</strong></span>
                <span>SIGNAL: <strong className={isRedAlert ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isRedAlert ? 'RED INDICATION' : 'GREEN CLEAR'}
                </strong></span>
              </div>
            </div>
          </div>

          {/* Camera Selector Channel Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {cameras.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCamera(c.name)}
                className={`p-2 rounded border cursor-pointer transition text-xs font-mono relative ${
                  selectedCamera === c.name
                    ? 'bg-zinc-800 border-amber-500/80 text-zinc-100 ring-1 ring-amber-500/40'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-zinc-200">{c.id}</span>
                  <span className={c.id === 'CAM-LIVE' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {c.id === 'CAM-LIVE' ? 'ACTIVE' : 'ONLINE'}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {c.id === 'CAM-LIVE' ? 'Webcam Demo' : c.name.split('[')[1]?.replace(']', '') || c.name}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1">{c.ip} · {c.bitrate}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Alarm Log Strip */}
        <div className="space-y-3">
          <div className="p-3.5 rounded bg-zinc-900/90 border border-zinc-800 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2.5 text-xs font-mono">
                <span className="font-semibold text-zinc-200">Real-Time Ingestion Tape</span>
                <span className="text-zinc-500">Auto-scroll</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {/* Live Camera Alarm if in NO_HELMET mode */}
                {isLiveCam && isRedAlert && (
                  <div className="p-2.5 rounded bg-red-950/40 border border-red-500/60 text-xs font-mono space-y-1 animate-pulse">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-1.5 py-0.2 rounded font-bold bg-red-600 text-white">
                        RED ALERT
                      </span>
                      <span className="text-red-400">{liveClock}</span>
                    </div>
                    <div className="font-bold text-red-200 text-[11px]">
                      CAM-LIVE: NO SAFETY HELMET
                    </div>
                    <p className="text-[10px] text-red-300">
                      Operator observed in active area without required hard hat.
                    </p>
                  </div>
                )}

                {incidents.slice(0, 8).map((inc) => (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 text-xs font-mono space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-900/50' :
                        inc.severity === 'HIGH' ? 'bg-amber-950/60 text-amber-400 border border-amber-900/50' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className="text-zinc-500">
                        {new Date(inc.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="font-medium text-zinc-200 text-[11px] font-sans">
                      {inc.event_type.replace(/_/g, ' ')}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-sans line-clamp-2">
                      {inc.explanation}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[9px] text-zinc-500">
                      <span>TRK #{inc.track_id || 'N/A'}</span>
                      <span className="text-zinc-400">{inc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono text-center">
              LOW-LATENCY SSE EVENT SINK
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

