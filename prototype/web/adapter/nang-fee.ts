/**
 * 窝囊费计算 —— 公式与 `packages/domain/src/nang-fee.ts` 一致（rate = 日薪 / 标准计薪时长）。
 *
 * prototype 逻辑层没有经济模块，而 monorepo 的 @not/domain 在 pnpm workspace 里，
 * 这个 npm 包链不过去，所以在此内联同一份公式。接入 monorepo 时应直接 import @not/domain 删掉本文件。
 *
 * DEMO_DAILY_SALARY_MINOR 是演示配置，正式版来自「工作设置」页（PRD 03）。
 */

/** 分（CNY 最小单位） */
export type MoneyMinor = number

/** 演示日薪：¥880.00 */
export const DEMO_DAILY_SALARY_MINOR: MoneyMinor = 88_000

export function calculateNangFeeRate(dailySalaryMinor: MoneyMinor, standardPaidMs: number): number {
  if (standardPaidMs <= 0) throw new Error('standardPaidMs must be positive')
  return dailySalaryMinor / standardPaidMs
}

export function accrue(
  durationMs: number,
  dailySalaryMinor: MoneyMinor,
  standardPaidMs: number
): { deltaEquivalentMs: number; displayDeltaMinor: MoneyMinor } {
  const rate = calculateNangFeeRate(dailySalaryMinor, standardPaidMs)
  return {
    deltaEquivalentMs: durationMs,
    displayDeltaMinor: Math.round(durationMs * rate)
  }
}

/** 分 → "¥88.00" */
export function formatMoney(minor: MoneyMinor): string {
  return `¥${(minor / 100).toFixed(2)}`
}
