"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook personalizado que funciona como o useState, mas persiste o valor
 * no localStorage do navegador.
 * 
 * @param key Chave única para identificar este estado no localStorage.
 * @param defaultValue Valor inicial usado no primeiro render (Server-Side).
 * @returns Uma tuple [valor, setter], igual ao useState.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Estado em memória, inicializado com o valor padrão para evitar erros de hidratação
  const [state, setState] = useState<T>(defaultValue);

  // Efeito executado apenas no cliente: carrega o valor guardado no localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        // Se existir, atualiza o estado com o valor guardado
        setState(JSON.parse(stored));
      }
    } catch (error) {
      // Se algo correr mal (ex: JSON inválido), mantém o valor padrão
      console.warn(`Erro ao ler localStorage key "${key}":`, error);
    }
  }, [key]);

  // Efeito executado sempre que o estado muda: guarda no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      // Se o localStorage estiver cheio ou inacessível, avisa
      console.warn(`Erro ao guardar localStorage key "${key}":`, error);
    }
  }, [key, state]);

  // Setter com suporte a função (prev => newValue), igual ao useState
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        return next;
      });
    },
    []
  );

  return [state, setValue];
}