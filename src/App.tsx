import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, Server, Send, Info, RefreshCw, Play, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from './utils';
import { PCS, SWITCH_POS, type SatTable, type SimulationStep, type PC } from './types';

export default function App() {
  const [satTable, setSatTable] = useState<SatTable>({});
  const [srcId, setSrcId] = useState<string>('pc-a');
  const [dstId, setDstId] = useState<string>('pc-b');
  
  const [simState, setSimState] = useState<'IDLE' | 'RUNNING' | 'FINISHED'>('IDLE');
  const [sequence, setSequence] = useState<SimulationStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Derived state for current step
  const currentStep = sequence[currentStepIdx];

  const handleReset = () => {
    setSatTable({});
    setSimState('IDLE');
    setSequence([]);
    setCurrentStepIdx(0);
  };

  const generateSequence = (source: PC, dest: PC) => {
    const seq: SimulationStep[] = [];
    const frameColor = source.color;

    // 1. INIT
    seq.push({
      type: 'INIT',
      title: 'Préparation de la trame',
      message: `${source.name} (${source.ip}) veut communiquer avec ${dest.name} (${dest.ip}). Il consulte sa table ARP pour trouver l'adresse MAC de destination (${dest.mac}) et prépare sa trame Ethernet.`,
    });

    // 2. TX to Switch
    seq.push({
      type: 'TX_PC_SW',
      title: 'Envoi au Switch',
      message: `La trame est envoyée sur le câble jusqu'au port ${source.port} du switch.`,
      packets: [{ id: 'p1', from: source.position, to: SWITCH_POS, color: frameColor, label: 'Trame' }]
    });

    // 3. LEARN
    seq.push({
      type: 'LEARN',
      title: 'Apprentissage (Learning)',
      message: `Le switch reçoit la trame. Il regarde l'adresse MAC SOURCE (${source.mac}). Il note dans sa table SAT que cette adresse (liée à l'IP ${source.ip}) se trouve sur le port ${source.port}.`,
      highlightPort: source.port,
      action: () => {
        setSatTable(prev => ({ ...prev, [source.mac]: source.port }));
      }
    });

    // 4. LOOKUP & FORWARD
    // We need to check the table state AS IT WILL BE at this point in the simulation.
    // Since we just learned the source, we only need to check if we ALREADY know the dest.
    const knownDestPort = satTable[dest.mac];

    if (knownDestPort) {
      // UNICAST
      seq.push({
        type: 'LOOKUP',
        title: 'Recherche (Forwarding)',
        message: `Le switch regarde l'adresse MAC DESTINATION (${dest.mac}). Il consulte sa table SAT et voit qu'elle est associée au port ${knownDestPort}.`,
        highlightMac: dest.mac
      });

      seq.push({
        type: 'TX_SW_PC_UNICAST',
        title: 'Transmission Unicast',
        message: `Le switch connaît la destination ! Il envoie la trame UNIQUEMENT sur le port ${knownDestPort}. C'est un envoi "Unicast".`,
        packets: [{ id: 'p2', from: SWITCH_POS, to: dest.position, color: frameColor, label: 'Trame' }]
      });

      seq.push({
        type: 'RX_OK',
        title: 'Réception',
        message: `${dest.name} reçoit la trame, vérifie que l'adresse MAC destination correspond à la sienne, et l'accepte.`,
        highlightPort: dest.port
      });

    } else {
      // BROADCAST / FLOODING
      seq.push({
        type: 'LOOKUP',
        title: 'Recherche (Forwarding)',
        message: `Le switch regarde l'adresse MAC DESTINATION (${dest.mac}). Il consulte sa table SAT... et ne la trouve pas !`,
      });

      const otherPcs = Object.values(PCS).filter(p => p.id !== source.id);
      
      seq.push({
        type: 'TX_SW_PC_BROADCAST',
        title: 'Inondation (Flooding)',
        message: `Comme il ne sait pas où est la destination, le switch copie la trame et l'envoie sur TOUS les autres ports actifs (sauf celui d'où elle vient). C'est l'inondation.`,
        packets: otherPcs.map((p, i) => ({
          id: `p-flood-${i}`,
          from: SWITCH_POS,
          to: p.position,
          color: frameColor,
          label: 'Copie'
        }))
      });

      seq.push({
        type: 'RX_DROP',
        title: 'Réception et Filtrage',
        message: `${dest.name} reconnaît son adresse MAC et accepte la trame. Les autres PC voient que ce n'est pas pour eux et détruisent la trame.`,
      });
    }

    return seq;
  };

  const startSimulation = () => {
    if (srcId === dstId) {
      alert("La source et la destination doivent être différentes.");
      return;
    }
    const seq = generateSequence(PCS[srcId], PCS[dstId]);
    setSequence(seq);
    setCurrentStepIdx(0);
    setSimState('RUNNING');
  };

  const nextStep = () => {
    if (currentStepIdx < sequence.length - 1) {
      // Execute action of current step before moving to next
      if (sequence[currentStepIdx].action) {
        sequence[currentStepIdx].action();
      }
      setCurrentStepIdx(prev => prev + 1);
    } else {
      // Execute last action if any
      if (sequence[currentStepIdx].action) {
        sequence[currentStepIdx].action();
      }
      setSimState('FINISHED');
    }
  };

  // Helper to get color classes
  const getColorClasses = (colorName: string) => {
    const map: Record<string, string> = {
      pink: 'bg-pink-100 border-pink-400 text-pink-800',
      blue: 'bg-blue-100 border-blue-400 text-blue-800',
      green: 'bg-emerald-100 border-emerald-400 text-emerald-800',
    };
    return map[colorName] || 'bg-gray-100 border-gray-400 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 shadow-sm flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
            <Server size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Simulateur de Switch</h1>
            <p className="text-xs text-slate-500">Comprendre la table SAT et l'inondation</p>
          </div>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
        >
          <RefreshCw size={14} />
          Réinitialiser
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Visualization */}
        <div className="flex-1 relative bg-slate-50/50 p-2 overflow-hidden min-h-[350px] lg:min-h-0 border-r border-slate-200 flex items-center justify-center">
          
          {/* Network Area */}
          <div className="relative w-full max-w-2xl aspect-[4/3] max-h-full">
            
            {/* Cables (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {Object.values(PCS).map(pc => (
                <line
                  key={`line-${pc.id}`}
                  x1={`${SWITCH_POS.x}%`}
                  y1={`${SWITCH_POS.y}%`}
                  x2={`${pc.position.x}%`}
                  y2={`${pc.position.y}%`}
                  stroke={currentStep?.highlightPort === pc.port ? "#6366f1" : "#cbd5e1"}
                  strokeWidth={currentStep?.highlightPort === pc.port ? "3" : "2"}
                  strokeDasharray="4 4"
                  className="transition-all duration-500"
                />
              ))}
            </svg>

            {/* Switch */}
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
              style={{ left: `${SWITCH_POS.x}%`, top: `${SWITCH_POS.y}%` }}
            >
              <div className={cn(
                "w-16 h-16 bg-indigo-600 rounded-xl shadow-lg flex items-center justify-center text-white border-2 border-indigo-200 transition-transform duration-300",
                (currentStep?.type === 'LEARN' || currentStep?.type === 'LOOKUP') && "scale-110 ring-4 ring-indigo-300 ring-opacity-50"
              )}>
                <Server size={28} />
              </div>
              <span className="mt-1.5 font-bold text-indigo-900 bg-white/80 px-1.5 py-0.5 rounded text-[10px] shadow-sm backdrop-blur-sm">Switch Central</span>
            </div>

            {/* PCs */}
            {Object.values(PCS).map(pc => (
              <div 
                key={pc.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                style={{ left: `${pc.position.x}%`, top: `${pc.position.y}%` }}
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg shadow-md flex items-center justify-center border-2 transition-all duration-300",
                  getColorClasses(pc.color),
                  currentStep?.type === 'RX_OK' && currentStep.highlightPort === pc.port && "ring-4 ring-green-400 scale-110",
                  currentStep?.type === 'RX_DROP' && dstId !== pc.id && srcId !== pc.id && "opacity-50 grayscale"
                )}>
                  <Monitor size={24} />
                </div>
                <div className="mt-1.5 bg-white/90 p-1.5 rounded shadow-sm border border-slate-200 text-center backdrop-blur-sm leading-tight">
                  <div className="font-bold text-[11px]">{pc.name}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">{pc.ip}</div>
                  <div className="text-[9px] text-slate-400 font-mono">{pc.mac}</div>
                  <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">Port {pc.port}</div>
                </div>

                {/* ARP Table */}
                <div className="mt-1.5 bg-white/95 rounded shadow-sm border border-slate-200 text-left backdrop-blur-sm w-36 overflow-hidden">
                  <div className="bg-slate-100 text-[8px] font-bold text-slate-600 px-1.5 py-0.5 border-b border-slate-200 text-center uppercase tracking-wider">Table ARP</div>
                  <table className="w-full text-[8px] font-mono">
                    <tbody className="divide-y divide-slate-100">
                      {Object.values(PCS).filter(p => p.id !== pc.id).map(otherPc => (
                        <tr key={otherPc.id} className={cn(
                          "transition-colors",
                          currentStep?.type === 'INIT' && srcId === pc.id && dstId === otherPc.id ? "bg-yellow-200 font-bold text-slate-900" : "text-slate-500"
                        )}>
                          <td className="px-1.5 py-0.5">{otherPc.ip}</td>
                          <td className="px-1.5 py-0.5 text-right opacity-75">{otherPc.mac.substring(9)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Status Icons for RX step */}
                <AnimatePresence>
                  {currentStep?.type === 'RX_DROP' && dstId !== pc.id && srcId !== pc.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="absolute -top-2 -right-2 text-red-500 bg-white rounded-full shadow-sm"
                    >
                      <XCircle size={18} />
                    </motion.div>
                  )}
                  {(currentStep?.type === 'RX_OK' || (currentStep?.type === 'RX_DROP' && dstId === pc.id)) && dstId === pc.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="absolute -top-2 -right-2 text-green-500 bg-white rounded-full shadow-sm"
                    >
                      <CheckCircle2 size={18} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* Animated Packets */}
            <AnimatePresence>
              {currentStep?.packets?.map(packet => (
                <motion.div
                  key={packet.id}
                  initial={{ 
                    left: `${packet.from.x}%`, 
                    top: `${packet.from.y}%`,
                    opacity: 0,
                    scale: 0.5
                  }}
                  animate={{ 
                    left: `${packet.to.x}%`, 
                    top: `${packet.to.y}%`,
                    opacity: 1,
                    scale: 1
                  }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center"
                >
                  <div className={cn(
                    "w-5 h-3 rounded-sm shadow-md border border-black/10",
                    packet.color === 'pink' ? 'bg-pink-400' : packet.color === 'blue' ? 'bg-blue-400' : 'bg-emerald-400'
                  )} />
                  {packet.label && (
                    <span className="text-[9px] font-bold mt-0.5 bg-white/80 px-1 rounded shadow-sm">{packet.label}</span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

          </div>
        </div>

        {/* Right Panel: Controls & State */}
        <div className="w-full lg:w-[320px] bg-white flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20">
          
          {/* Controls */}
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <Send size={16} className="text-indigo-500" />
              Nouvelle communication
            </h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Source</label>
                <select 
                  value={srcId} 
                  onChange={e => setSrcId(e.target.value)}
                  disabled={simState !== 'IDLE'}
                  className="w-full p-1.5 text-sm border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                  {Object.values(PCS).map(pc => (
                    <option key={pc.id} value={pc.id}>{pc.name} (Port {pc.port})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Destination</label>
                <select 
                  value={dstId} 
                  onChange={e => setDstId(e.target.value)}
                  disabled={simState !== 'IDLE'}
                  className="w-full p-1.5 text-sm border border-slate-300 rounded-md bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                  {Object.values(PCS).map(pc => (
                    <option key={pc.id} value={pc.id}>{pc.name} (Port {pc.port})</option>
                  ))}
                </select>
              </div>

              {simState === 'IDLE' ? (
                <button 
                  onClick={startSimulation}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={16} />
                  Démarrer
                </button>
              ) : simState === 'FINISHED' ? (
                <button 
                  onClick={() => { setSimState('IDLE'); setSequence([]); }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} />
                  Nouvel envoi
                </button>
              ) : null}
            </div>
          </div>

          {/* SAT Table */}
          <div className="p-4 flex-1 overflow-auto bg-slate-50/50">
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              <Server size={16} className="text-indigo-500" />
              Table SAT du Switch
            </h2>
            
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="px-3 py-2 border-b border-slate-200">Adresse MAC</th>
                    <th className="px-3 py-2 border-b border-slate-200 text-center">Port</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(satTable).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-center text-xs text-slate-400 italic">
                        La table est vide.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(satTable).map(([mac, port]) => {
                      return (
                        <tr 
                          key={mac} 
                          className={cn(
                            "border-b border-slate-100 last:border-0 transition-colors duration-500",
                            currentStep?.highlightMac === mac ? "bg-yellow-100" : "hover:bg-slate-50"
                          )}
                        >
                          <td className="px-3 py-2 font-mono text-slate-700 text-[10px]">{mac}</td>
                          <td className="px-3 py-2 text-center font-bold text-indigo-600 text-xs">{port}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 p-2.5 bg-indigo-50 text-indigo-800 rounded-lg text-[11px] flex items-start gap-2 border border-indigo-200 leading-tight">
              <Info size={14} className="shrink-0 mt-0.5" />
              <p><strong>Note pédagogique :</strong> Le PC utilise sa <strong>table ARP</strong> pour trouver l'adresse MAC de destination à partir de l'IP. Le switch, opérant au niveau 2, ne lit <strong>que les adresses MAC</strong> pour remplir sa table SAT et diriger les trames.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Panel: Pedagogy / Step-by-step */}
      <div className="bg-white border-t border-slate-200 p-3 lg:p-4 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4">
          
          <div className="flex-1 w-full">
            {simState === 'IDLE' ? (
              <div className="text-center md:text-left text-sm text-slate-500 italic">
                Sélectionnez une source et une destination, puis cliquez sur "Démarrer" pour observer le comportement du switch.
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStepIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 lg:p-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Étape {currentStepIdx + 1} / {sequence.length}
                    </span>
                    <h3 className="font-bold text-sm text-indigo-900">{currentStep?.title}</h3>
                  </div>
                  <p className="text-slate-700 leading-snug text-xs lg:text-sm">
                    {currentStep?.message}
                  </p>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {simState === 'RUNNING' && (
            <button
              onClick={nextStep}
              className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-md shadow-emerald-500/30 transition-all flex items-center gap-1.5 transform hover:scale-105 active:scale-95"
            >
              Étape suivante
              <ChevronRight size={16} />
            </button>
          )}
          
          {simState === 'FINISHED' && (
            <div className="shrink-0 px-4 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-lg border border-slate-200 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Communication terminée
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500 z-30">
        <p>
          © 2026 Fabrice LALLEMAND avec l'aide de Gemini. Code source sous licence MIT —{' '}
          <a 
            href="https://github.com/fabricelallemand15/simulateur_switch" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium transition-colors"
          >
            🖥 Code source sur GitHub
          </a>.
        </p>
        <p className="mt-1">Utilisation, modification et distribution libres — attribution requise</p>
      </footer>
    </div>
  );
}
