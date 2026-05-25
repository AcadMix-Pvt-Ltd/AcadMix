// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus, MapPin, NavigationArrow, Cpu, Plus, Pencil, Play, Stop, FastForward,
  ArrowRight, CheckCircle, Warning, Clock, Users, CaretDown, Trash, X,
  SimCard, Hash, Car, CurrencyDollar, Path, Timer, Pulse, ArrowClockwise,
} from '@phosphor-icons/react';
import { transportAPI } from '../../services/api';
import { Toaster, toast } from 'sonner';

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLEET OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
const FleetOverview = () => {
  const [dashboard, setDashboard] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [dashRes, routeRes] = await Promise.all([
        transportAPI.dashboard(),
        transportAPI.adminRoutes(),
      ]);
      setDashboard(dashRes.data?.data);
      setRoutes(routeRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load fleet data');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleStartTrip = async (routeId, direction = 'morning') => {
    try {
      await transportAPI.startTrip({ route_id: routeId, direction });
      toast.success('Trip started!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start trip');
    }
  };

  const handleEndTrip = async (routeId) => {
    try {
      await transportAPI.endTrip({ route_id: routeId });
      toast.success('Trip ended');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to end trip');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Routes', value: dashboard?.total_routes || routes.length, icon: Path, color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500' },
    { label: 'Active Trips', value: dashboard?.active_trips || 0, icon: NavigationArrow, color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500' },
    { label: 'Students Enrolled', value: dashboard?.total_enrolled || 0, icon: Users, color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-500' },
    { label: 'Devices Online', value: dashboard?.devices_online || 0, icon: Cpu, color: 'bg-purple-50 dark:bg-purple-500/15 text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={i} variants={itemVariants} className="soft-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</span>
              <div className={`${s.color} p-2 rounded-xl`}><s.icon size={18} weight="duotone" /></div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Route Cards */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Bus size={20} weight="duotone" className="text-emerald-500" /> Fleet Status
        </h3>
        {routes.length === 0 ? (
          <div className="soft-card p-8 text-center">
            <Bus size={40} weight="duotone" className="text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-500">No routes configured</p>
            <p className="text-xs text-slate-400 mt-1">Create your first route in the Route Manager tab</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {routes.map(route => {
              const isActive = route.active_trip;
              return (
                <motion.div key={route.id} variants={itemVariants} className="soft-card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <Bus size={20} weight="duotone" className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-bold">{route.route_number}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                            {isActive ? '● LIVE' : '○ IDLE'}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{route.route_name || route.route_number}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">{route.vehicle_number || '—'}</p>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{route.enrolled || 0}/{route.capacity || '∞'} enrolled</p>
                      </div>
                      <div className="flex gap-1.5">
                        {!isActive ? (
                          <>
                            <button onClick={() => handleStartTrip(route.id, 'morning')}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 transition-colors">
                              <Play size={12} weight="fill" /> AM
                            </button>
                            <button onClick={() => handleStartTrip(route.id, 'evening')}
                              className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1 transition-colors">
                              <Play size={12} weight="fill" /> PM
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleEndTrip(route.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 transition-colors">
                            <Stop size={12} weight="fill" /> End
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stops preview */}
                  <div className="flex items-center gap-1.5 mt-3 overflow-x-auto hide-scrollbar">
                    {(route.stops || []).map((stop, i) => (
                      <React.Fragment key={i}>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">{stop.name || `S${i + 1}`}</span>
                        {i < (route.stops || []).length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════
const RouteManager = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    route_number: '', route_name: '', vehicle_number: '', capacity: 60,
    departure_time: '07:30', return_time: '17:15', fee_amount: 0,
    stops: [{ name: '', lat: null, lng: null }],
  });

  const loadRoutes = async () => {
    try {
      const { data } = await transportAPI.adminRoutes();
      setRoutes(data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadRoutes(); }, []);

  const addStop = () => setForm(f => ({ ...f, stops: [...f.stops, { name: '', lat: null, lng: null }] }));
  const removeStop = (idx) => setForm(f => ({ ...f, stops: f.stops.filter((_, i) => i !== idx) }));
  const updateStop = (idx, field, value) => {
    setForm(f => {
      const stops = [...f.stops];
      stops[idx] = { ...stops[idx], [field]: field === 'name' ? value : parseFloat(value) || null };
      return { ...f, stops };
    });
  };

  const handleSubmit = async () => {
    if (!form.route_number || !form.route_name) {
      toast.error('Route number and name are required');
      return;
    }
    if (form.stops.filter(s => s.name).length < 2) {
      toast.error('At least 2 stops required');
      return;
    }
    try {
      await transportAPI.createRoute({
        ...form,
        capacity: parseInt(form.capacity) || 60,
        fee_amount: parseFloat(form.fee_amount) || 0,
        stops: form.stops.filter(s => s.name),
      });
      toast.success('Route created!');
      setShowModal(false);
      setForm({
        route_number: '', route_name: '', vehicle_number: '', capacity: 60,
        departure_time: '07:30', return_time: '17:15', fee_amount: 0,
        stops: [{ name: '', lat: null, lng: null }],
      });
      loadRoutes();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create route');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <MapPin size={20} weight="duotone" className="text-indigo-500" /> Route Manager
        </h3>
        <button onClick={() => setShowModal(true)}
          className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
          <Plus size={14} weight="bold" /> New Route
        </button>
      </div>

      {/* Routes Table */}
      <div className="soft-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
                {['Route#', 'Name', 'Vehicle', 'Capacity', 'Enrolled', 'Departure', 'Return', 'Fee', 'Stops'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.map(r => (
                <tr key={r.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400 text-sm">{r.route_number}</td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 text-sm">{r.route_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{r.vehicle_number || '—'}</td>
                  <td className="py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">{r.capacity || '—'}</td>
                  <td className="py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">{r.enrolled || 0}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{r.departure_time || '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{r.return_time || '—'}</td>
                  <td className="py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">{r.fee_amount ? `₹${r.fee_amount.toLocaleString()}` : '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{(r.stops || []).length}</td>
                </tr>
              ))}
              {routes.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-sm font-bold text-slate-400">No routes yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Route Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[85vh] bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Create Route</h3>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Route Number *</label>
                    <input className="soft-input w-full" placeholder="R-01" value={form.route_number} onChange={e => setForm(f => ({ ...f, route_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Route Name *</label>
                    <input className="soft-input w-full" placeholder="Ameerpet – Campus" value={form.route_name} onChange={e => setForm(f => ({ ...f, route_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Vehicle Number</label>
                    <input className="soft-input w-full" placeholder="TS 09 AB 1234" value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Capacity</label>
                    <input className="soft-input w-full" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Departure</label>
                    <input className="soft-input w-full" type="time" value={form.departure_time} onChange={e => setForm(f => ({ ...f, departure_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Return</label>
                    <input className="soft-input w-full" type="time" value={form.return_time} onChange={e => setForm(f => ({ ...f, return_time: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Fee Amount (₹)</label>
                    <input className="soft-input w-full" type="number" value={form.fee_amount} onChange={e => setForm(f => ({ ...f, fee_amount: e.target.value }))} />
                  </div>
                </div>

                {/* Stops Builder */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Stops</label>
                    <button onClick={addStop} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"><Plus size={12} /> Add</button>
                  </div>
                  <div className="space-y-2">
                    {form.stops.map((stop, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <input className="soft-input flex-1" placeholder="Stop name" value={stop.name} onChange={e => updateStop(i, 'name', e.target.value)} />
                        <input className="soft-input w-24" placeholder="Lat" type="number" step="any" value={stop.lat || ''} onChange={e => updateStop(i, 'lat', e.target.value)} />
                        <input className="soft-input w-24" placeholder="Lng" type="number" step="any" value={stop.lng || ''} onChange={e => updateStop(i, 'lng', e.target.value)} />
                        {form.stops.length > 1 && (
                          <button onClick={() => removeStop(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500"><Trash size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleSubmit} className="btn-primary w-full !py-3 flex items-center justify-center gap-2">
                  <CheckCircle size={18} weight="bold" /> Create Route
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRIP CONTROL
// ═══════════════════════════════════════════════════════════════════════════════
const TripControl = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    transportAPI.adminRoutes().then(r => {
      const data = r.data?.data || [];
      setRoutes(data);
      if (data.length > 0) setSelectedRoute(data[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Poll live status
  useEffect(() => {
    if (!selectedRoute?.id) return;
    const poll = async () => {
      try {
        const { data } = await transportAPI.liveStatus(selectedRoute.id);
        setLiveStatus(data?.data);
      } catch { setLiveStatus(null); }
    };
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRoute?.id]);

  const handleAction = async (action, extra = {}) => {
    if (!selectedRoute) return;
    try {
      if (action === 'start') await transportAPI.startTrip({ route_id: selectedRoute.id, direction: extra.direction || 'morning' });
      else if (action === 'end') await transportAPI.endTrip({ route_id: selectedRoute.id });
      else if (action === 'clear') await transportAPI.clearStop({ route_id: selectedRoute.id, stop_index: extra.stopIndex });
      else if (action === 'sim-start') await transportAPI.simStart({ route_id: selectedRoute.id, direction: extra.direction || 'morning' });
      else if (action === 'sim-advance') await transportAPI.simAdvance({ route_id: selectedRoute.id });
      else if (action === 'sim-end') await transportAPI.simEnd({ route_id: selectedRoute.id });
      toast.success(`${action} successful`);
    } catch (err) {
      toast.error(err.response?.data?.detail || `${action} failed`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const stops = selectedRoute?.stops || [];
  const currentNode = liveStatus?.current_node;
  const isActive = liveStatus?.status === 'started' || liveStatus?.status === 'in_transit';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <NavigationArrow size={20} weight="duotone" className="text-amber-500" /> Trip Control
        </h3>
      </div>

      {/* Route Selector */}
      <div className="soft-card p-4">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Select Route</label>
        <select
          className="soft-input w-full"
          value={selectedRoute?.id || ''}
          onChange={e => {
            const r = routes.find(rt => rt.id === e.target.value);
            setSelectedRoute(r);
            setLiveStatus(null);
          }}
        >
          {routes.map(r => (
            <option key={r.id} value={r.id}>{r.route_number} — {r.route_name || r.route_number}</option>
          ))}
        </select>
      </div>

      {selectedRoute && (
        <>
          {/* Status + Actions */}
          <div className="soft-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <Bus size={20} weight="duotone" className="text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white">{selectedRoute.route_name || selectedRoute.route_number}</p>
                  <span className={`text-[10px] font-bold ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {isActive ? `● LIVE — Node ${(currentNode || 0) + 1}/${stops.length}` : '○ IDLE'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                {!isActive ? (
                  <>
                    <button onClick={() => handleAction('start', { direction: 'morning' })} className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><Play size={12} weight="fill" /> Start AM</button>
                    <button onClick={() => handleAction('start', { direction: 'evening' })} className="px-3 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1"><Play size={12} weight="fill" /> Start PM</button>
                  </>
                ) : (
                  <button onClick={() => handleAction('end')} className="px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1"><Stop size={12} weight="fill" /> End Trip</button>
                )}
              </div>
            </div>

            {/* Node Jumper */}
            {isActive && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Node Jumper — tap to clear each stop</p>
                <div className="flex flex-wrap gap-2">
                  {stops.map((stop, i) => {
                    const isVisited = currentNode != null && i <= currentNode;
                    const isCurrent = currentNode === i;
                    const isNext = currentNode != null && i === currentNode + 1;
                    return (
                      <button
                        key={i}
                        onClick={() => !isVisited && handleAction('clear', { stopIndex: i })}
                        disabled={isVisited}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isCurrent ? 'bg-emerald-500 text-white ring-2 ring-emerald-500/30' :
                          isVisited ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 opacity-60' :
                          isNext ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-200 cursor-pointer' :
                          'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer'
                        }`}
                      >
                        {isVisited && <CheckCircle size={12} weight="fill" />}
                        {isCurrent && <Pulse size={12} weight="bold" />}
                        {stop.name || `Stop ${i + 1}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Simulator */}
          <details className="soft-card">
            <summary className="p-4 cursor-pointer flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 select-none">
              <ArrowClockwise size={16} weight="duotone" className="text-indigo-500" />
              Simulator (no hardware needed)
              <CaretDown size={14} className="ml-auto" />
            </summary>
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              <button onClick={() => handleAction('sim-start', { direction: 'morning' })} className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1"><Play size={12} /> Sim Start</button>
              <button onClick={() => handleAction('sim-advance')} className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1"><FastForward size={12} /> Sim Advance</button>
              <button onClick={() => handleAction('sim-end')} className="px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1"><Stop size={12} /> Sim End</button>
            </div>
          </details>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEVICE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
const DeviceRegistry = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ imei: '', vehicle_number: '', sim_iccid: '', route_id: '' });
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    Promise.all([
      transportAPI.devices().then(r => setDevices(r.data?.data || [])),
      transportAPI.adminRoutes().then(r => setRoutes(r.data?.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    if (!form.imei || !form.vehicle_number) {
      toast.error('IMEI and Vehicle Number required');
      return;
    }
    try {
      await transportAPI.registerDevice(form);
      toast.success('Device registered');
      setShowForm(false);
      setForm({ imei: '', vehicle_number: '', sim_iccid: '', route_id: '' });
      const { data } = await transportAPI.devices();
      setDevices(data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-slate-400 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Cpu size={20} weight="duotone" className="text-slate-500" /> AIS 140 Device Registry
        </h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5">
          <Plus size={14} weight="bold" /> Register Device
        </button>
      </div>

      {/* Register Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="soft-card p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">IMEI *</label>
                  <input className="soft-input w-full" placeholder="359586015829802" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Vehicle Number *</label>
                  <input className="soft-input w-full" placeholder="TS 09 AB 1234" value={form.vehicle_number} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">SIM ICCID</label>
                  <input className="soft-input w-full" placeholder="8991000900000" value={form.sim_iccid} onChange={e => setForm(f => ({ ...f, sim_iccid: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Assign to Route</label>
                  <select className="soft-input w-full" value={form.route_id} onChange={e => setForm(f => ({ ...f, route_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.route_number} — {r.route_name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleRegister} className="btn-primary !py-2.5 flex items-center gap-2">
                <CheckCircle size={16} weight="bold" /> Register
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Devices Table */}
      <div className="soft-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
                {['IMEI', 'Vehicle', 'Route', 'Status', 'Last Ping'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono text-sm text-slate-700 dark:text-slate-300">{d.imei}</td>
                  <td className="py-3 px-4 font-bold text-sm text-slate-800 dark:text-slate-200">{d.vehicle_number}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{d.route_id?.slice(0, 8) || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.status || 'inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">{d.last_ping_at || 'Never'}</td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm font-bold text-slate-400">No devices registered</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AdminTransportPanel = () => {
  const [subTab, setSubTab] = useState('fleet');

  const tabs = [
    { id: 'fleet', label: 'Fleet Overview', icon: Bus },
    { id: 'routes', label: 'Route Manager', icon: MapPin },
    { id: 'control', label: 'Trip Control', icon: NavigationArrow },
    { id: 'devices', label: 'Devices', icon: Cpu },
  ];

  return (
    <div>
      <Toaster position="top-right" richColors />

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              subTab === t.id
                ? 'bg-white dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <t.icon size={16} weight="duotone" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {subTab === 'fleet' && <FleetOverview />}
      {subTab === 'routes' && <RouteManager />}
      {subTab === 'control' && <TripControl />}
      {subTab === 'devices' && <DeviceRegistry />}
    </div>
  );
};

export default AdminTransportPanel;
