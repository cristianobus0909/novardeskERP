import { create } from 'zustand';

interface CajaTurno {
  id: number;
  monto_apertura: number;
  fecha_apertura: string;
}

interface SumarioCaja {
  efectivo: number;
  debito: number;
  credito: number;
  transferencia: number;
  mercadopago: number;
}

interface CajaState {
  status: 'ABIERTA' | 'CERRADA' | 'LOADING';
  turno: CajaTurno | null;
  sumario: SumarioCaja | null;
  
  setStatus: (status: 'ABIERTA' | 'CERRADA') => void;
  setTurno: (turno: CajaTurno | null, sumario: SumarioCaja | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCajaStore = create<CajaState>((set) => ({
  status: 'LOADING',
  turno: null,
  sumario: null,

  setStatus: (status) => set({ status }),
  setTurno: (turno, sumario) => set({ turno, sumario, status: turno ? 'ABIERTA' : 'CERRADA' }),
  setLoading: (loading) => set({ status: loading ? 'LOADING' : 'CERRADA' }),
}));
