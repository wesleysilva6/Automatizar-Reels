'use client';

// Perfis de exportação salvos localmente (localStorage). Cada perfil guarda o
// preset da plataforma (que define codec/fps/bitrate/áudio) e o modelo de nome.
// Campos de branding (logo/marca d'água/intro/outro) ficarão aqui quando o
// pipeline de branding for construído — não incluo agora para não fingir.

import { useSyncExternalStore } from 'react';
import { MODELO_PADRAO } from './nomes';

export interface PerfilExport {
  id: string;
  nome: string;
  presetId: string;
  modeloNome: string;
  criadoEm: number;
}

const CHAVE = 'novawave:perfis:v1';

function noNavegador(): boolean {
  return typeof window !== 'undefined';
}

function carregar(): PerfilExport[] {
  if (!noNavegador()) return [];
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const dados = bruto ? (JSON.parse(bruto) as PerfilExport[]) : [];
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

let estado: PerfilExport[] = carregar();
const ouvintes = new Set<() => void>();
const VAZIO: PerfilExport[] = [];

function definir(prox: PerfilExport[]): void {
  estado = prox;
  if (noNavegador()) window.localStorage.setItem(CHAVE, JSON.stringify(estado));
  for (const o of ouvintes) o();
}

function novoId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function criarPerfil(dados: { nome: string; presetId: string; modeloNome: string }): PerfilExport {
  const perfil: PerfilExport = {
    id: novoId(),
    nome: dados.nome.trim() || 'Meu perfil',
    presetId: dados.presetId,
    modeloNome: dados.modeloNome || MODELO_PADRAO,
    criadoEm: Date.now(),
  };
  definir([perfil, ...estado]);
  return perfil;
}

export function excluirPerfil(id: string): void {
  definir(estado.filter((p) => p.id !== id));
}

export function usePerfis(): PerfilExport[] {
  return useSyncExternalStore(
    (o) => {
      ouvintes.add(o);
      return () => ouvintes.delete(o);
    },
    () => estado,
    () => VAZIO,
  );
}
