"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw != null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeToStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota excedida ou storage indisponível */
  }
}

/**
 * Estado sincronizado com localStorage.
 *
 * Arquitectura sem loops:
 *
 * • initialValue é guardado numa ref e NUNCA entra nas deps de efeitos.
 *   Literais de array/objeto criam referência nova a cada render e
 *   causariam loops se entrassem nas deps.
 *
 * • O estado é inicializado de forma preguiçosa (callback do useState)
 *   para ler o localStorage de forma síncrona antes do primeiro paint,
 *   sem precisar de useEffect.
 *
 * • Existe apenas UM useEffect, com deps [key, state].
 *   — Não chama setState → não pode causar loop por si mesmo.
 *   — Quando a key muda, lê o novo valor e chama setStateRaw FORA do
 *     efeito de gravação, através de um efeito separado dedicado APENAS
 *     à mudança de key (deps: [key]), que não grava nada.
 *
 * • O efeito de leitura (key change) usa uma ref para não re-correr
 *   quando a key é a mesma string (mesmo que seja uma nova referência
 *   de template literal criada a cada render).
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T
): readonly [T, (value: T | ((prev: T) => T)) => void] {
  // Ref estável para o fallback — nunca entra nas deps.
  const fallbackRef = useRef<T>(initialValue);

  // Leitura síncrona antes do primeiro paint.
  const [state, setStateRaw] = useState<T>(() =>
    readFromStorage(key, fallbackRef.current)
  );

  // Ref que rastreia a última key processada.
  const activeKeyRef = useRef<string>(key);

  // Efeito 1 — LEITURA: só corre quando a key muda de valor.
  // Não escreve no localStorage, não tem `state` nas deps.
  // Usar ref de comparação evita que template literals idênticos
  // (mas com referências diferentes) disparem o efeito em loop.
  useEffect(() => {
    if (activeKeyRef.current === key) return;
    activeKeyRef.current = key;
    const next = readFromStorage(key, fallbackRef.current);
    setStateRaw(next);
    // `next` será gravado pelo Efeito 2 no ciclo seguinte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Efeito 2 — GRAVAÇÃO: corre quando key ou state mudam.
  // NUNCA chama setState → não pode causar loop.
  // Usa activeKeyRef para garantir que grava na key activa
  // (já atualizada pelo Efeito 1) e não na key anterior.
  const stateRef = useRef<T>(state);
  stateRef.current = state;

  useEffect(() => {
    // Se a key mudou mas o Efeito 1 ainda não correu neste ciclo,
    // activeKeyRef.current já foi atualizado pelo Efeito 1 acima.
    // Usamos `key` diretamente (não activeKeyRef) para garantir
    // que gravamos na key correcta após a leitura.
    writeToStorage(key, stateRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStateRaw((prev) =>
      typeof value === "function" ? (value as (p: T) => T)(prev) : value
    );
  }, []);

  return [state, setValue] as const;
}