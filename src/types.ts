export interface PC {
  id: string;
  name: string;
  mac: string;
  ip: string;
  port: number;
  color: string;
  position: { x: number; y: number };
}

export const PCS: Record<string, PC> = {
  'pc-a': {
    id: 'pc-a',
    name: 'PC Alice',
    mac: 'AA:AA:AA:AA:AA:AA',
    ip: '192.168.1.10',
    port: 1,
    color: 'pink',
    position: { x: 15, y: 30 },
  },
  'pc-b': {
    id: 'pc-b',
    name: 'PC Bob',
    mac: 'BB:BB:BB:BB:BB:BB',
    ip: '192.168.1.20',
    port: 2,
    color: 'blue',
    position: { x: 85, y: 30 },
  },
  'pc-c': {
    id: 'pc-c',
    name: 'PC Charlie',
    mac: 'CC:CC:CC:CC:CC:CC',
    ip: '192.168.1.30',
    port: 3,
    color: 'green',
    position: { x: 50, y: 85 },
  },
};

export const SWITCH_POS = { x: 50, y: 40 };

export type SatTable = Record<string, number>;

export type StepType = 
  | 'INIT' 
  | 'TX_PC_SW' 
  | 'LEARN' 
  | 'LOOKUP' 
  | 'TX_SW_PC_UNICAST' 
  | 'TX_SW_PC_BROADCAST' 
  | 'RX_OK' 
  | 'RX_DROP';

export interface SimulationStep {
  type: StepType;
  message: string;
  title: string;
  action?: () => void;
  packets?: { id: string; from: {x:number, y:number}; to: {x:number, y:number}; color: string; label?: string }[];
  highlightPort?: number;
  highlightMac?: string;
}
