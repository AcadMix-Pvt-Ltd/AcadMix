import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superadminAPI } from '../services/api';
import { toast } from 'sonner';
import {
  Building2, Bed, Plus, ChevronRight, Save,
  ArrowLeft
} from 'lucide-react';
import FloorBlueprintEditor from '../components/FloorBlueprintEditor';

// ═══════════════════════════════════════════════════════════════════════════════
// HOSTEL DESIGNER — Floor/Room/Bed Visual Layout Tool
// ═══════════════════════════════════════════════════════════════════════════════

type Step = 'colleges' | 'hostels' | 'rooms' | 'bed-editor';

export default function HostelDesigner() {
  const [step, setStep] = useState<Step>('colleges');
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | null>(null);
  const [selectedHostel, setSelectedHostel] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const queryClient = useQueryClient();
  void queryClient;

  const { data: colleges = [] } = useQuery({
    queryKey: ['colleges-list'],
    queryFn: async () => { const { data } = await superadminAPI.listColleges(); return data.data; },
  });

  const { data: hostels = [] } = useQuery({
    queryKey: ['hostels', selectedCollegeId],
    queryFn: async () => { const { data } = await superadminAPI.listHostels(selectedCollegeId!); return data.data; },
    enabled: !!selectedCollegeId,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms', selectedHostel?.id],
    queryFn: async () => { const { data } = await superadminAPI.listRooms(selectedHostel.id); return data.data; },
    enabled: !!selectedHostel,
  });

  const { data: bedData } = useQuery({
    queryKey: ['beds', selectedRoom?.id],
    queryFn: async () => { const { data } = await superadminAPI.getRoomBeds(selectedRoom.id); return data.data; },
    enabled: !!selectedRoom && step === 'bed-editor',
  });

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    const items: { label: string; onClick?: () => void }[] = [];
    if (step !== 'colleges') {
      const col = colleges.find((c: any) => c.id === selectedCollegeId);
      items.push({ label: col?.name || 'College', onClick: () => { setStep('colleges'); setSelectedCollegeId(null); setSelectedHostel(null); setSelectedRoom(null); } });
    }
    if (step === 'rooms' || step === 'bed-editor') {
      items.push({ label: selectedHostel?.name || 'Hostel', onClick: () => { setStep('hostels'); setSelectedHostel(null); setSelectedRoom(null); } });
    }
    if (step === 'bed-editor') {
      items.push({ label: `Room ${selectedRoom?.room_number}` });
    }
    return items;
  }, [step, colleges, selectedCollegeId, selectedHostel, selectedRoom]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <h1 className="page-title">Hostel Designer</h1>
        <p className="page-subtitle">Visual floor plan and bed layout editor</p>
        {breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: '0.8125rem' }}>
            <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => { setStep('colleges'); setSelectedCollegeId(null); setSelectedHostel(null); setSelectedRoom(null); }}>
              All Colleges
            </button>
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                {b.onClick ? (
                  <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={b.onClick}>{b.label}</button>
                ) : (
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="page-body">
        <AnimatePresence mode="wait">
          {/* Step 1: College Picker */}
          {step === 'colleges' && (
            <motion.div key="colleges" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {colleges.filter((c: any) => !c.is_deleted).map((c: any) => (
                  <div key={c.id} className="glass-card" style={{ cursor: 'pointer' }}
                    onClick={() => { setSelectedCollegeId(c.id); setStep('hostels'); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={18} style={{ color: 'var(--primary-light)' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.hostel_count} hostels</div>
                      </div>
                      <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Hostel List */}
          {step === 'hostels' && (
            <motion.div key="hostels" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {hostels.map((h: any) => (
                  <div key={h.id} className="glass-card" style={{ cursor: 'pointer' }}
                    onClick={() => { setSelectedHostel(h); setStep('rooms'); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bed size={18} style={{ color: '#A78BFA' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{h.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{h.gender_type} · {h.total_floors} floors</div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <MiniStat label="Rooms" value={h.room_count || 0} />
                      <MiniStat label="Capacity" value={h.total_capacity} />
                      <MiniStat label="Occupied" value={h.occupied || 0} />
                    </div>
                  </div>
                ))}
                {hostels.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No hostels yet for this college.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Floor Plan / Blueprint Editor */}
          {step === 'rooms' && selectedHostel && (
            <motion.div key="rooms" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <FloorBlueprintEditor
                hostelId={selectedHostel.id}
                hostelName={selectedHostel.name}
                totalFloors={selectedHostel.total_floors || 1}
                onRoomClick={(roomId, roomLabel) => {
                  if (roomId === 'NEW') {
                    toast.error('Please save the blueprint and link the room to a real record first.');
                    return;
                  }
                  // We need to set the selectedRoom object so the bed editor works
                  const roomObj = rooms.find((r: any) => r.id === roomId) || { id: roomId, room_number: roomLabel };
                  setSelectedRoom(roomObj);
                  setStep('bed-editor');
                }}
                onBack={() => setStep('hostels')}
              />
            </motion.div>
          )}

          {/* Step 4: Bed Grid Editor */}
          {step === 'bed-editor' && selectedRoom && (
            <motion.div key="bed-editor" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <BedGridEditor
                room={selectedRoom}
                initialBeds={bedData?.beds || []}
                onBack={() => setStep('rooms')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface-mid)', borderRadius: 8 }}>
      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{value}</div>
      <div style={{ fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// BED GRID EDITOR — Click-to-place bed designer
// ═══════════════════════════════════════════════════════════════════════════════

interface BedItem {
  identifier: string;
  grid_row: number;
  grid_col: number;
  category: string;
  is_premium: boolean;
  selection_fee: number;
}

function BedGridEditor({ room, initialBeds, onBack }: { room: any; initialBeds: any[]; onBack: () => void }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [beds, setBeds] = useState<BedItem[]>(() =>
    initialBeds.map((b: any) => ({
      identifier: b.bed_identifier || b.identifier,
      grid_row: b.grid_row, grid_col: b.grid_col,
      category: b.category || 'Standard',
      is_premium: b.is_premium || false,
      selection_fee: b.selection_fee || 0,
    }))
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const bedMap = useMemo(() => {
    const m = new Map<string, BedItem>();
    beds.forEach(b => m.set(`${b.grid_row}-${b.grid_col}`, b));
    return m;
  }, [beds]);

  const selected = selectedKey ? bedMap.get(selectedKey) : null;

  const toggleCell = useCallback((r: number, c: number) => {
    const key = `${r}-${c}`;
    if (bedMap.has(key)) {
      setSelectedKey(selectedKey === key ? null : key);
    } else {
      const letter = String.fromCharCode(64 + r);
      setBeds(prev => [...prev, { identifier: `${letter}${c}`, grid_row: r, grid_col: c, category: 'Standard', is_premium: false, selection_fee: 0 }]);
      setSelectedKey(key);
    }
  }, [bedMap, selectedKey]);

  const removeBed = useCallback((r: number, c: number) => {
    setBeds(prev => prev.filter(b => !(b.grid_row === r && b.grid_col === c)));
    setSelectedKey(null);
  }, []);

  const updateBed = useCallback((key: string, updates: Partial<BedItem>) => {
    setBeds(prev => prev.map(b => `${b.grid_row}-${b.grid_col}` === key ? { ...b, ...updates } : b));
  }, []);

  const saveMutation = useMutation({
    mutationFn: () => superadminAPI.saveRoomBeds(room.id, beds.map(b => ({
      identifier: b.identifier, grid_row: b.grid_row, grid_col: b.grid_col,
      category: b.category, is_premium: b.is_premium, selection_fee: b.selection_fee,
    }))),
    onSuccess: () => {
      toast.success(`Saved ${beds.length} beds`);
      queryClient.invalidateQueries({ queryKey: ['beds', room.id] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: () => toast.error('Failed to save beds'),
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
      {/* Left: Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn-ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem' }}>Room {room.room_number}</h2>
          <span className="badge badge-primary">{beds.length} beds</span>
        </div>

        {/* Dimension controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div>
            <span className="label">Rows</span>
            <select className="input select" style={{ width: 80 }} value={rows} onChange={e => setRows(+e.target.value)}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <span className="label">Cols</span>
            <select className="input select" style={{ width: 80 }} value={cols} onChange={e => setCols(+e.target.value)}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, padding: 20, background: 'var(--surface-low)', borderRadius: 16, border: '1px solid var(--border)' }}>
          {Array.from({ length: rows }, (_, rIdx) =>
            Array.from({ length: cols }, (_, cIdx) => {
              const r = rIdx + 1, c = cIdx + 1;
              const key = `${r}-${c}`;
              const bed = bedMap.get(key);
              const isActive = selectedKey === key;
              return (
                <motion.button
                  key={key}
                  onClick={() => toggleCell(r, c)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bed-cell ${bed ? (isActive ? 'selected' : bed.is_premium ? 'premium' : 'occupied') : ''}`}
                  style={{ minHeight: 80 }}
                >
                  {bed ? (
                    <>
                      <span style={{ fontSize: '1.25rem' }}>🛏️</span>
                      <span>{bed.identifier}</span>
                      {bed.is_premium && <span style={{ fontSize: '0.625rem' }}>★</span>}
                    </>
                  ) : (
                    <Plus size={18} />
                  )}
                </motion.button>
              );
            })
          )}
        </div>

        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 8 }}>
          Click empty cell to place • Click placed bed to edit
        </p>

        {/* Save button */}
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : `Save Layout (${beds.length} beds)`}
          </button>
        </div>
      </div>

      {/* Right: Properties panel */}
      <div>
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="props" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card" style={{ position: 'sticky', top: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Bed {selected.identifier}</h3>
                <button className="btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                  onClick={() => removeBed(selected.grid_row, selected.grid_col)}>
                  Remove
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">Identifier</label>
                  <input className="input" value={selected.identifier}
                    onChange={e => updateBed(selectedKey!, { identifier: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input select" value={selected.category}
                    onChange={e => updateBed(selectedKey!, { category: e.target.value })}>
                    {['Standard', 'Window', 'Aisle', 'Corner', 'Bunk-Upper', 'Bunk-Lower'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selected.is_premium}
                      onChange={e => updateBed(selectedKey!, { is_premium: e.target.checked, selection_fee: e.target.checked ? 500 : 0 })}
                      style={{ width: 16, height: 16, accentColor: 'var(--amber)' }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>★ Premium</span>
                  </label>
                </div>
                {selected.is_premium && (
                  <div>
                    <label className="label">Selection Fee (₹)</label>
                    <input type="number" className="input" value={selected.selection_fee}
                      onChange={e => updateBed(selectedKey!, { selection_fee: +e.target.value || 0 })} />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Bed size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Select a bed to edit</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
