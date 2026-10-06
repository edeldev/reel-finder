import { useState, useCallback } from 'react';
import { toast } from 'sonner';
export function useStorage<T>(key: string, initial: T, validate: (value: unknown) => value is T) {
 const [value,setValue] = useState<T>(()=>{try {const raw=localStorage.getItem(key);if (!raw) return initial;const parsed:unknown=JSON.parse(raw);return validate(parsed) ? parsed : initial;}catch{return initial;}});
 const update = useCallback((next:T | ((current:T)=>T))=>{setValue(current=>{const result=typeof next==='function' ? (next as (v:T)=>T)(current) : next;try{localStorage.setItem(key,JSON.stringify(result));}catch{toast.error('No se pudo guardar en este navegador. Revisa el espacio y los permisos.');}return result;});},[key]);
 return [value,update] as const;
}
