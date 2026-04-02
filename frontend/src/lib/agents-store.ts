import type { AgentPersonality } from '@/types';

export interface DeployedAgent {
  id: string;
  name: string;
  personality: AgentPersonality;
  status: 'pending' | 'active' | 'paused' | 'stopped';
  plan: string;
  walletAddress: string | null;
  deployMethod: 'wallet' | 'gas-balance';
  pnl: number;
  pnlPercent: number;
  totalTrades: number;
  winRate: number;
  assets: string[];
  createdAt: number;
  strategy?: string;
  published?: boolean;
  publishedAt?: number;
  subscribers?: number;
  description?: string;
  price?: number;
}

const STORAGE_KEY = 'cladex_deployed_agents';

export function getDeployedAgents(): DeployedAgent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map((a: Record<string, unknown>) => ({
      ...a,
      assets: Array.isArray(a.assets) ? a.assets : [],
      name: a.name || 'Agent',
      personality: (typeof a.personality === 'string' ? a.personality.toLowerCase() : 'sage'),
      status: a.status || 'pending',
      plan: a.plan || '',
      pnl: a.pnl ?? 0,
      pnlPercent: a.pnlPercent ?? 0,
      totalTrades: a.totalTrades ?? 0,
      winRate: a.winRate ?? 0,
    })) as DeployedAgent[];
  } catch { return []; }
}

export function saveDeployedAgents(agents: DeployedAgent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export function addDeployedAgent(agent: DeployedAgent) {
  const agents = getDeployedAgents();
  agents.unshift(agent);
  saveDeployedAgents(agents);
  window.dispatchEvent(new CustomEvent('cladex_agents_updated'));
}

export function updateAgentStatus(id: string, status: DeployedAgent['status']) {
  const agents = getDeployedAgents().map(a =>
    a.id === id ? { ...a, status } : a
  );
  saveDeployedAgents(agents);
  window.dispatchEvent(new CustomEvent('cladex_agents_updated'));
}

export function publishAgent(id: string, description: string, price: number) {
  const agents = getDeployedAgents().map(a =>
    a.id === id ? { ...a, published: true, publishedAt: Date.now(), subscribers: 0, description, price } : a
  );
  saveDeployedAgents(agents);
  window.dispatchEvent(new CustomEvent('cladex_agents_updated'));
}

export function unpublishAgent(id: string) {
  const agents = getDeployedAgents().map(a =>
    a.id === id ? { ...a, published: false } : a
  );
  saveDeployedAgents(agents);
  window.dispatchEvent(new CustomEvent('cladex_agents_updated'));
}

export function removeDeployedAgent(id: string) {
  const agents = getDeployedAgents().filter(a => a.id !== id);
  saveDeployedAgents(agents);
  window.dispatchEvent(new CustomEvent('cladex_agents_updated'));
}
