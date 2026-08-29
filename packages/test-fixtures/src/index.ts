/**
 * @not/test-fixtures — Sanitized synthetic test data
 *
 * Use in unit, integration, and E2E tests.
 * All data is fictional — no real user information.
 */

import { TaskImportance, TaskStatus, CognitiveLoad } from '@not/contracts';
import type { Task } from '@not/contracts';

export const sampleTasks: Task[] = [
  {
    id: '01900000-0000-0000-0000-000000000001',
    userId: '01900000-0000-0000-0000-000000000100',
    title: '完成联机状态接口',
    dueAt: '2026-09-01T09:00:00.000Z',
    importance: TaskImportance.HIGH,
    status: TaskStatus.PENDING,
    category: 'CODING',
    estimatedDurationMs: 7200000,
    cognitiveLoad: CognitiveLoad.HIGH,
    splittability: 0.8,
    revision: 1,
    createdAt: '2026-08-29T02:00:00.000Z',
    updatedAt: '2026-08-29T02:00:00.000Z',
  },
  {
    id: '01900000-0000-0000-0000-000000000002',
    userId: '01900000-0000-0000-0000-000000000100',
    title: '写周报',
    dueAt: '2026-08-29T17:00:00.000Z',
    importance: TaskImportance.MEDIUM,
    status: TaskStatus.PENDING,
    category: 'WRITING',
    estimatedDurationMs: 1800000,
    cognitiveLoad: CognitiveLoad.LOW,
    splittability: 0.3,
    revision: 1,
    createdAt: '2026-08-29T02:00:00.000Z',
    updatedAt: '2026-08-29T02:00:00.000Z',
  },
];

export const sampleWorkSettings = {
  timeZone: 'Asia/Taipei',
  workStart: '09:00:00',
  workEnd: '18:00:00',
  lunchStart: '12:00:00',
  lunchEnd: '13:00:00',
  dailySalaryMinor: 80000, // ¥800.00
};
