/**
 * @not/contracts — Shared types, enums, and schemas
 * 
 * This is the single source of truth for:
 * - IPC message shapes (Electron ↔ Renderer)
 * - HTTP request/response types (Client ↔ API)
 * - WebSocket event schemas (Client ↔ Realtime)
 * - AI service I/O contracts
 * - Animation Manifest schema
 */

// ─── Enums ────────────────────────────────────────────────────

export enum TaskImportance {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELETED = 'DELETED',
}

export enum CognitiveLoad {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum ActivityType {
  TYPING = 'TYPING',
  MEETING = 'MEETING',
  BROWSING = 'BROWSING',
  IDLE = 'IDLE',
  AWAY = 'AWAY',
  BREAK = 'BREAK',
}

export enum PetAction {
  IDLE = 'IDLE',
  TYPING = 'TYPING',
  MEETING = 'MEETING',
  BROWSING = 'BROWSING',
  SUSPICIOUS_IDLE = 'SUSPICIOUS_IDLE',
  AWAY = 'AWAY',
  RUNNING_HOME = 'RUNNING_HOME',
}

// ─── Scalar Types ─────────────────────────────────────────────

/** Duration in milliseconds */
export type DurationMs = number;

/** Money in smallest unit (分 for CNY) */
export type MoneyMinor = number;

/** Equivalent milliseconds (internal accounting unit) */
export type EquivalentMs = number;

/** ISO 8601 date string (YYYY-MM-DD) */
export type ISODate = string;

/** Optimistic lock version */
export type Revision = number;

// ─── Core Interfaces ──────────────────────────────────────────

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueAt: string;
  importance: TaskImportance;
  status: TaskStatus;
  category?: string;
  estimatedDurationMs?: DurationMs;
  cognitiveLoad?: CognitiveLoad;
  splittability?: number;
  analysisProposalId?: string;
  fieldOrigins?: Record<string, 'USER' | 'AI_ACCEPTED'>;
  revision: Revision;
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleSettings {
  timeZone: string;
  workStart: string; // HH:mm:ss
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
}

export interface NangFeeWalletView {
  balanceEquivalentMs: EquivalentMs;
  display: {
    amountMinor: MoneyMinor;
    currency: 'CNY';
    formatted: string;
  };
  rate: {
    dailySalaryMinor: MoneyMinor;
    standardPaidMs: DurationMs;
    settingsRevision: Revision;
  };
  revision: Revision;
}

// ─── API Response Envelope ────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  meta?: { cursor?: string; total?: number };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ─── Realtime Events ──────────────────────────────────────────

export interface PresenceEvent {
  userId: string;
  status: 'online' | 'away' | 'offline';
  petAction: PetAction;
  updatedAt: string;
}

export interface PetActionEvent {
  userId: string;
  action: PetAction;
  timestamp: string;
}
