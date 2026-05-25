// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, MapPin, Clock, CreditCard, QrCode, ArrowRight, CheckCircle, Warning, NavigationArrow, Pulse, Timer, Users, Receipt, MagnifyingGlass } from '@phosphor-icons/react';
import { transportAPI } from '../../services/api';

const POLL_INTERVAL = 10000;

// Wait for Mappls SDK to be available on window (loaded dynamically)
function waitForMappls(maxWait = 10000) {
  return new Promise((resolve) => {
    if (window.mappls && typeof window.mappls.Map === 'function') { resolve(window.mappls); return; }

    const apiKey = import.meta.env.VITE_MAPPLS_KEY || import.meta.env.VITE_MAPPLS_API_KEY;
    if (apiKey && !document.getElementById('mappls-sdk-script')) {
      const script = document.createElement('script');
      script.id = 'mappls-sdk-script';
      script.src = `https://apis.mappls.com/advancedmaps/api/${apiKey}/map_sdk?layer=vector&v=3.0`;
      script.async = true;
      document.head.appendChild(script);
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (window.mappls && typeof window.mappls.Map === 'function') {
        clearInterval(interval);
        resolve(window.mappls);
      } else if (Date.now() - start > maxWait) {
        clearInterval(interval);
        resolve(null);
      }
    }, 200);
  });
}

// ─── Mappls Map Component ───────────────────────────────────────────────────
const LiveMap = ({ stops, currentNode, myStopIndex, livePosition, isActive }) => {
  const mapRef = useRef(null);
  const busMarkerRef = useRef(null);
  const mapId = useRef(`mappls-map-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!stops || stops.length === 0) return;
    let cancelled = false;

    (async () => {
      const mapplsObj = await waitForMappls();
      if (cancelled) return;
      if (!mapplsObj) {
        console.error('Mappls SDK not loaded. Check script tag in index.html');
        setMapError(true);
        return;
      }

      // Compute center
      const validStops = stops.filter(s => s.lat && s.lng);
      const cLat = validStops.length > 0
        ? validStops.reduce((a, s) => a + s.lat, 0) / validStops.length
        : 17.0992; // GNI Ibrahimpatnam
      const cLng = validStops.length > 0
        ? validStops.reduce((a, s) => a + s.lng, 0) / validStops.length
        : 78.5747;

      try {
        const map = new mapplsObj.Map(mapId.current, {
          center: [cLat, cLng],
          zoom: 13,
          zoomControl: true,
          search: false,
        });

        mapRef.current = map;

        map.addListener('load', () => {
          if (cancelled) return;
          setMapReady(true);

          // Route polyline
          if (validStops.length > 1) {
            new mapplsObj.Polyline({
              map: map,
              path: validStops.map(s => ({ lat: s.lat, lng: s.lng })),
              strokeColor: '#6366f1',
              strokeOpacity: 0.8,
              strokeWeight: 4,
            });
          }

          // Stop markers
          stops.forEach((stop, i) => {
            if (!stop.lat || !stop.lng) return;
            new mapplsObj.Marker({
              map: map,
              position: { lat: stop.lat, lng: stop.lng },
              popupHtml: `<div style="padding:8px;font-weight:600">${stop.name || 'Stop ' + (i + 1)}${i === myStopIndex ? ' ⭐' : ''}</div>`,
            });
          });

          // Bus marker (active trip)
          if (isActive && livePosition?.lat && livePosition?.lng) {
            busMarkerRef.current = new mapplsObj.Marker({
              map: map,
              position: { lat: livePosition.lat, lng: livePosition.lng },
              html: `<div style="background:#10b981;border:3px solid #fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(16,185,129,0.5)">🚌</div>`,
              width: 32,
              height: 32,
            });
          }
        });
      } catch (err) {
        console.error('Mappls Map error:', err);
        if (!cancelled) setMapError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
      busMarkerRef.current = null;
    };
  }, [stops, myStopIndex]);

  // Update bus position on poll
  useEffect(() => {
    if (!busMarkerRef.current || !livePosition?.lat) return;
    try {
      busMarkerRef.current.setPosition({ lat: livePosition.lat, lng: livePosition.lng });
      mapRef.current?.panTo({ lat: livePosition.lat, lng: livePosition.lng });
    } catch {}
  }, [livePosition?.lat, livePosition?.lng]);

  if (mapError) {
    return (
      <div className="w-full h-[350px] rounded-2xl bg-red-50 dark:bg-red-500/5 flex items-center justify-center border border-red-200 dark:border-red-500/20">
        <div className="text-center p-6">
          <Warning size={40} weight="duotone" className="text-red-400 mx-auto mb-2" />
          <p className="font-bold text-red-600 dark:text-red-400 text-sm">Failed to load map</p>
          <p className="text-xs text-red-400 mt-1">Check your Mappls API key and internet connection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        id={mapId.current}
        className="w-full h-[350px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10"
        style={{ minHeight: '350px' }}
      />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-2xl">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-400">Loading map...</p>
          </div>
        </div>
      )}
      {isActive && currentNode != null && stops[currentNode] && (
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-[#1a202c]/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg border border-slate-100 dark:border-white/10 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            At {stops[currentNode].name || `Stop ${currentNode + 1}`}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const StudentTransport = () => {
  const [tab, setTab] = useState('tracker');
  const [enrollment, setEnrollment] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [busPass, setBusPass] = useState<any>(null);
  const [tripHistory, setTripHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const [stopSearch, setStopSearch] = useState('');
  const [chosenStopName, setChosenStopName] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data } = await transportAPI.myEnrollment();
        setEnrollment(data || null);
      } catch {}
      try {
        const { data } = await transportAPI.routes();
        setRoutes(Array.isArray(data) ? data : []);
      } catch {}
      setLoading(false);
    };
    loadData();
  }, []);

  // Poll live status
  const startPolling = useCallback(() => {
    if (!enrollment?.route_id) return;
    const poll = async () => {
      try {
        const { data } = await transportAPI.liveStatus(enrollment.route_id);
        setLiveStatus(data || null);
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
  }, [enrollment?.route_id]);

  useEffect(() => {
    if (tab === 'tracker' && enrollment) startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tab, enrollment, startPolling]);

  useEffect(() => {
    if (tab === 'pass' && enrollment) {
      transportAPI.busPass().then(r => setBusPass(r.data || null)).catch(() => {});
    }
  }, [tab, enrollment]);

  useEffect(() => {
    if (tab === 'history' && enrollment) {
      transportAPI.tripHistory().then(r => setTripHistory(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    }
  }, [tab, enrollment]);

  // ── useMemo hooks MUST be before any early returns to avoid Error #310 ──
  const allStops = React.useMemo(() => {
    const stopMap = new Map<string, any[]>();
    routes.forEach((route: any) => {
      (route.stops || []).forEach((stop: any, idx: number) => {
        const name = stop.name || `Stop ${idx + 1}`;
        if (!stopMap.has(name)) stopMap.set(name, []);
        stopMap.get(name)!.push({ route, stopIndex: idx });
      });
    });
    return Array.from(stopMap.entries()).map(([name, routeEntries]) => ({ name, routeEntries })).sort((a, b) => a.name.localeCompare(b.name));
  }, [routes]);

  const filteredStops = React.useMemo(() => {
    if (!stopSearch.trim()) return allStops;
    const q = stopSearch.toLowerCase();
    return allStops.filter(s => s.name.toLowerCase().includes(q));
  }, [allStops, stopSearch]);

  const matchingRoutes = React.useMemo(() => {
    if (!chosenStopName) return [];
    const entry = allStops.find(s => s.name === chosenStopName);
    return entry ? entry.routeEntries : [];
  }, [chosenStopName, allStops]);

  const handleEnroll = async () => {
    if (!selectedRoute || selectedStop === null) return;
    setEnrolling(true);
    try {
      await transportAPI.enroll({
        route_id: selectedRoute.id,
        boarding_stop_index: selectedStop,
      });
      // Refresh enrollment
      const { data: fresh } = await transportAPI.myEnrollment();
      setEnrollment(fresh || null);
      setSelectedRoute(null);
      setSelectedStop(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Enrollment failed');
    }
    setEnrolling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Bus size={24} weight="duotone" className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Campus Transport</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Find your bus stop & pick a route</p>
          </div>
        </div>

        {/* ── Step 1: Search & Select Stop ─── */}
        {!chosenStopName && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="soft-card p-5">
              <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Where do you board?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Search for your bus stop or pick from the list below</p>
              <div className="relative mb-4">
                <MagnifyingGlass size={16} weight="bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={stopSearch}
                  onChange={e => setStopSearch(e.target.value)}
                  placeholder="Search bus stop..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
                {filteredStops.length === 0 && (
                  <p className="text-sm text-center text-slate-400 py-6">No stops match "{stopSearch}"</p>
                )}
                {filteredStops.map(s => (
                  <button
                    key={s.name}
                    onClick={() => { setChosenStopName(s.name); setSelectedRoute(null); setSelectedStop(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left bg-slate-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <MapPin size={14} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{s.name}</p>
                      <p className="text-[11px] text-slate-400">{s.routeEntries.length} route{s.routeEntries.length !== 1 ? 's' : ''} available</p>
                    </div>
                    <ArrowRight size={14} weight="bold" className="text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Step 2: Pick Route for chosen stop ─── */}
        {chosenStopName && !selectedRoute && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => { setChosenStopName(null); setStopSearch(''); }}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-4 hover:underline"
            >
              ← Change stop
            </button>
            <div className="soft-card p-4 mb-4 bg-emerald-50/50 dark:bg-emerald-500/5 border-2 border-emerald-200 dark:border-emerald-500/20">
              <div className="flex items-center gap-2">
                <MapPin size={16} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">{chosenStopName}</p>
              </div>
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">Available Routes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Buses that stop at {chosenStopName}</p>
            <div className="grid gap-3">
              {matchingRoutes.map(({ route, stopIndex }) => (
                <motion.div
                  key={route.id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => { setSelectedRoute(route); setSelectedStop(stopIndex); }}
                  className="soft-card p-5 cursor-pointer border-2 border-transparent hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">{route.route_number}</span>
                        {route.vehicle_number && <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{route.vehicle_number}</span>}
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{route.route_name || route.route_number}</p>
                    </div>
                    <div className="text-right">
                      {route.fee_amount > 0 && <p className="text-lg font-extrabold text-slate-900 dark:text-white">₹{route.fee_amount?.toLocaleString()}</p>}
                      <p className="text-xs font-medium text-slate-500">{route.available != null ? `${route.available} seats left` : `${route.enrolled} enrolled`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    {route.departure_time && <span className="flex items-center gap-1"><Clock size={12} weight="bold" /> {route.departure_time}</span>}
                    {route.return_time && <span className="flex items-center gap-1"><Clock size={12} weight="bold" /> {route.return_time}</span>}
                    {route.capacity > 0 && <span className="flex items-center gap-1"><Users size={12} weight="bold" /> {route.capacity} seats</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(route.stops || []).map((stop, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        stop.name === chosenStopName
                          ? 'bg-emerald-200 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}>
                        {stop.name || `Stop ${i + 1}`}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Step 3: Confirm & Enroll ─── */}
        <AnimatePresence>
          {selectedRoute && selectedStop !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="soft-card p-5 border-2 border-emerald-400 dark:border-emerald-500/30">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-3">Confirm Enrollment</h3>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Route</p>
                    <p className="font-bold text-slate-800 dark:text-white">{selectedRoute.route_number}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Boarding Stop</p>
                    <p className="font-bold text-slate-800 dark:text-white">{chosenStopName}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Fee</p>
                    <p className="font-bold text-slate-800 dark:text-white">₹{selectedRoute.fee_amount?.toLocaleString() || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Schedule</p>
                    <p className="font-bold text-slate-800 dark:text-white">{selectedRoute.departure_time || '07:00'} – {selectedRoute.return_time || '17:30'}</p>
                  </div>
                </div>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="btn-primary w-full !py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {enrolling ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Enroll & Pay <ArrowRight size={16} weight="bold" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ─── Enrolled — Transport Dashboard ───────────────────────────────────────
  const stops = enrollment?.stops || [];
  const currentNode = liveStatus?.current_node;
  const isActive = liveStatus?.status === 'started' || liveStatus?.status === 'in_transit';
  const myStopIndex = enrollment?.boarding_stop_index;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
          }`}>
            <Bus size={24} weight="duotone" className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{enrollment.route_name || enrollment.route_number}</h2>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isActive ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
              }`}>
                {isActive ? '● LIVE' : '○ IDLE'}
              </span>
              {enrollment.vehicle_number && <span className="text-xs font-bold text-slate-500">{enrollment.vehicle_number}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-6">
        {[
          { id: 'tracker', label: 'Live Tracker', icon: NavigationArrow },
          { id: 'pass', label: 'Bus Pass', icon: QrCode },
          { id: 'history', label: 'History', icon: Receipt },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <t.icon size={16} weight="duotone" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TRACKER TAB ══════════════════════════════════════════════════════ */}
      {tab === 'tracker' && (
        <div className="space-y-4">
          {/* ETA Banner */}
          {isActive && liveStatus?.eta && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="soft-card p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Next Stop</p>
                <p className="text-base font-extrabold text-slate-900 dark:text-white">{liveStatus.eta.next_stop}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {liveStatus.eta.eta_min}<span className="text-sm font-bold ml-0.5">min</span>
                </p>
              </div>
            </motion.div>
          )}

          {/* ──── Mappls Map ─────────────────────────────────── */}
          <LiveMap
            stops={stops}
            currentNode={currentNode}
            myStopIndex={myStopIndex}
            livePosition={liveStatus?.position}
            isActive={isActive}
          />

          {/* Stop Timeline (compact, below map) */}
          <div className="soft-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Pulse size={16} weight="duotone" className="text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Route Stops</h3>
              {isActive && (
                <span className="ml-auto text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 hide-scrollbar">
              {stops.map((stop, i) => {
                const isVisited = currentNode != null && i <= currentNode;
                const isCurrent = currentNode === i;
                const isMyStop = i === myStopIndex;

                return (
                  <React.Fragment key={i}>
                    {/* Node dot */}
                    <div className="flex flex-col items-center flex-shrink-0 relative group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isCurrent ? 'bg-emerald-500 border-emerald-500 ring-2 ring-emerald-500/30 scale-125' :
                        isVisited ? 'bg-emerald-400 border-emerald-400' :
                        isMyStop ? 'bg-indigo-500 border-indigo-500' :
                        'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                      }`}>
                        {isCurrent && (
                          <svg width="10" height="10" viewBox="0 0 256 256" fill="white"><path d="M184,32H72A16,16,0,0,0,56,48V208a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V48A16,16,0,0,0,184,32Z"/></svg>
                        )}
                      </div>
                      <span className={`text-[9px] font-bold mt-1 whitespace-nowrap max-w-[60px] truncate ${
                        isCurrent ? 'text-emerald-600 dark:text-emerald-400' :
                        isMyStop ? 'text-indigo-600 dark:text-indigo-400' :
                        isVisited ? 'text-slate-400' :
                        'text-slate-500 dark:text-slate-400'
                      }`}>
                        {stop.name || `Stop ${i + 1}`}
                      </span>
                      {isMyStop && !isCurrent && <span className="absolute -top-2 -right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#1a202c]" />}
                    </div>

                    {/* Connector line */}
                    {i < stops.length - 1 && (
                      <div className={`h-0.5 flex-1 min-w-[16px] rounded-full transition-all ${
                        isVisited && currentNode != null && i < currentNode ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* My Stop + Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="soft-card p-4 flex items-center gap-3 border-l-4 border-indigo-500 sm:col-span-1">
              <MapPin size={18} weight="fill" className="text-indigo-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Your Stop</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{enrollment.boarding_stop_name}</p>
              </div>
            </div>
            <div className="soft-card p-4 text-center">
              <Clock size={18} weight="duotone" className="text-amber-500 mx-auto mb-0.5" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Morning</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{enrollment.departure_time || '07:00'}</p>
            </div>
            <div className="soft-card p-4 text-center">
              <Clock size={18} weight="duotone" className="text-purple-500 mx-auto mb-0.5" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Evening</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white">{enrollment.return_time || '17:00'}</p>
            </div>
          </div>

          {/* No active trip */}
          {!isActive && (
            <div className="soft-card p-6 text-center bg-slate-50 dark:bg-white/[0.02]">
              <Bus size={36} weight="duotone" className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No active trip right now</p>
              <p className="text-xs text-slate-400 mt-0.5">You'll get a push notification when your bus starts</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ BUS PASS TAB ═════════════════════════════════════════════════════ */}
      {tab === 'pass' && (
        <div className="space-y-4">
          {busPass ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="soft-card overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bus size={22} weight="duotone" />
                      <span className="text-sm font-bold opacity-80">AcadMix Transport</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-bold">DIGITAL PASS</span>
                  </div>
                  <p className="text-2xl font-extrabold mb-1">{busPass.student_name}</p>
                  <p className="text-sm opacity-70">{busPass.student_id}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Route</p>
                      <p className="font-bold text-slate-900 dark:text-white">{busPass.route_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Boarding Stop</p>
                      <p className="font-bold text-slate-900 dark:text-white">{busPass.boarding_stop}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Valid Until</p>
                      <p className="font-bold text-slate-900 dark:text-white">{busPass.valid_until}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Enrollment</p>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">{busPass.enrollment_id?.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center p-6 bg-slate-50 dark:bg-white/5 rounded-2xl">
                    <div className="text-center">
                      <QrCode size={80} weight="duotone" className="text-indigo-500 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-500">Scan for boarding verification</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="soft-card p-8 text-center">
              <CreditCard size={48} weight="duotone" className="text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-500">Loading bus pass...</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ HISTORY TAB ══════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div className="space-y-3">
          {tripHistory.length > 0 ? (
            tripHistory.map((trip, i) => (
              <motion.div
                key={trip.id || i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="soft-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      trip.direction === 'morning' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300'
                    }`}>
                      {trip.direction === 'morning' ? '🌅 Morning' : '🌆 Evening'}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{trip.date}</span>
                  </div>
                  {trip.duration_minutes != null && (
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                      <Timer size={12} /> {trip.duration_minutes} min
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Stops: {trip.stops_visited}/{trip.total_stops}</span>
                  {trip.max_speed_kmh > 0 && <span>Max: {trip.max_speed_kmh?.toFixed(0)} km/h</span>}
                  {trip.delay_minutes > 0 && (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <Warning size={12} /> {trip.delay_minutes}m late
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="soft-card p-8 text-center">
              <Receipt size={48} weight="duotone" className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="font-bold text-slate-500 dark:text-slate-400">No trip history yet</p>
              <p className="text-xs text-slate-400 mt-1">Trip records will appear after your first ride</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StudentTransport;
