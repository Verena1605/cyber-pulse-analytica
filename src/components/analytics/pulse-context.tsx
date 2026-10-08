import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { posts } from '@/data/analysis';
const PulseContext = createContext({ playing: true, setPlaying: (_value: boolean) => {}, cursor: 0 });
export function PulseProvider({children}: {children: ReactNode}) {
 const [playing, setPlaying] = useState(true); const [cursor, setCursor] = useState(0);
 useEffect(() => { if (!playing) return; const id=setInterval(() => setCursor(c => (c+1)%posts.length), 4200);return () => clearInterval(id);},[playing]);
 return <PulseContext.Provider value={{playing,setPlaying,cursor}}>{children}</PulseContext.Provider>;
}
export const usePulse = () => useContext(PulseContext);
