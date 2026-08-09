import React, { useState, useEffect } from 'react';
import { userService } from '../api/services';
import { Employee } from '../types';
import { Map, Coffee, Activity, Users, Search } from 'lucide-react';

export default function WarehouseMap() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await userService.getEmployees();
        // filter out offline
        setEmployees(data.filter(e => e.status !== 'OFFLINE'));
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmployees();
    const interval = setInterval(fetchEmployees, 3000);
    return () => clearInterval(interval);
  }, []);

  // Group by location
  const locationGroups: Record<string, Employee[]> = {};
  
  employees.forEach(emp => {
    let loc = emp.currentLocation || 'Unknown';
    if (emp.status === 'BREAK') loc = 'CAFETERIA';
    else if (emp.status === 'IDLE') loc = 'IDLE (Base)';
    
    if (!locationGroups[loc]) locationGroups[loc] = [];
    locationGroups[loc].push(emp);
  });

  const cafeteriaWorkers = locationGroups['CAFETERIA'] || [];
  const idleWorkers = locationGroups['IDLE (Base)'] || [];
  const unknownWorkers = locationGroups['Unknown'] || [];
  const notAssignedWorkers = locationGroups['N/A'] || [];
  
  // Get warehouse floor locations (everything else)
  const floorLocations = Object.keys(locationGroups).filter(
    loc => !['CAFETERIA', 'IDLE (Base)', 'Unknown', 'N/A'].includes(loc)
  );

  const filteredLocations = floorLocations.filter(loc => 
    loc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    locationGroups[loc].some(e => e.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Deterministic coordinate generator based on location string hash
  const getCoordinates = (loc: string) => {
    let hash = 0;
    for (let i = 0; i < loc.length; i++) {
      hash = loc.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Convert to percentage coordinates (between 10% and 90% to avoid edges)
    const x = 10 + (Math.abs(hash) % 80);
    const y = 10 + (Math.abs(hash >> 8) % 80);
    return { left: `${x}%`, top: `${y}%` };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      {/* Page Header */}
      <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ color: 'var(--text-main)', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Warehouse Map
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Real-time facility topology & worker locations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.5rem 1rem' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search worker or location..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: '600px' }}>
        {/* Main Floor Map */}
        <div className="card" style={{ flex: 3, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Map size={18} style={{ color: '#38bdf8' }} />
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Warehouse Floor Layout</h2>
          </div>
          
          <div style={{ flex: 1, position: 'relative', background: 'linear-gradient(180deg, #0a0b12 0%, #0d111a 100%)' }}>
            {/* Grid Background Pattern */}
            <div style={{ 
              position: 'absolute', inset: 0, opacity: 0.1,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
            
            {/* Location Nodes */}
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Scanning telemetry...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                No active workers on the floor.
              </div>
            ) : (
              filteredLocations.map(loc => {
                const pos = getCoordinates(loc);
                const workers = locationGroups[loc];
                const activeWorkers = workers.filter(w => w.status !== 'IDLE');
                
                if (activeWorkers.length === 0) return null;

                return (
                  <div key={loc} className="map-node group" style={{ position: 'absolute', ...pos, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                    <div className="map-node-pulse" style={{
                      position: 'absolute', inset: -8, borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.2)', animation: 'pulse 2s infinite'
                    }} />
                    <div style={{
                      position: 'relative', width: '32px', height: '32px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #38bdf8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 0 15px rgba(56, 189, 248, 0.3)', cursor: 'pointer'
                    }}>
                      <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold' }}>{activeWorkers.length}</span>
                    </div>
                    
                    {/* Tooltip */}
                    <div className="map-tooltip" style={{
                      position: 'absolute', top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px',
                      padding: '12px', minWidth: '180px', pointerEvents: 'none',
                      opacity: 0, transition: 'opacity 0.2s', backdropFilter: 'blur(8px)', zIndex: 20
                    }}>
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Zone {loc}
                      </div>
                      {activeWorkers.map(w => (
                        <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span className={`dot dot-online`} style={{ width: 6, height: 6 }} />
                          <span style={{ color: 'white' }}>{w.fullName}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: 'auto' }}>
                            {w.pickingProgress ? `${Math.round(w.pickingProgress)}%` : w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Side Panels */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Cafeteria */}
          <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Coffee size={18} style={{ color: '#f59e0b' }} />
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Cafeteria / Break Room</h2>
            </div>
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {cafeteriaWorkers.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>Empty</div>
              ) : (
                cafeteriaWorkers.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {w.fullName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>{w.fullName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{w.role}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Idle / Base */}
          <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} style={{ color: 'var(--text-muted)' }} />
              <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Base (Idle Workers)</h2>
            </div>
            <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
              {idleWorkers.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 0' }}>No idle workers</div>
              ) : (
                idleWorkers.map(w => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {w.fullName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', color: 'white', fontWeight: 500 }}>{w.fullName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Awaiting Tasks</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .map-node:hover .map-tooltip {
          opacity: 1 !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}} />
    </div>
  );
}
