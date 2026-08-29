import type { TaskCategory, CognitiveLoad, Splittability } from "./types.js";

/**
 * 任务类别目录（datasets/task-category-catalog 的原型内联版）：
 * 冷启动基线时长 + 关键词映射。正式版走版本化数据集发布。
 */
export const CATALOG_VERSION = "catalog-proto-1";

interface CatalogEntry {
  keywords: string[];
  baseEstimateMs: number;
  rangeRatio: [number, number]; // [low, high] 相对 base
  cognitiveLoad: CognitiveLoad;
  splittability: Splittability;
}

const MIN = 60_000;

export const CATEGORY_CATALOG: Record<TaskCategory, CatalogEntry> = {
  WRITING:      { keywords: ["写", "撰写", "文档", "方案", "报告", "总结"], baseEstimateMs: 60 * MIN, rangeRatio: [0.7, 1.5], cognitiveLoad: "HIGH", splittability: "SPLITTABLE" },
  CODING:       { keywords: ["开发", "实现", "修复", "代码", "接口", "bug", "调试"], baseEstimateMs: 90 * MIN, rangeRatio: [0.6, 1.8], cognitiveLoad: "HIGH", splittability: "SPLITTABLE" },
  DESIGN:       { keywords: ["设计", "原型", "视觉", "ui", "图标"], baseEstimateMs: 90 * MIN, rangeRatio: [0.7, 1.6], cognitiveLoad: "HIGH", splittability: "SPLITTABLE" },
  RESEARCH:     { keywords: ["调研", "研究", "分析", "梳理", "评估"], baseEstimateMs: 60 * MIN, rangeRatio: [0.6, 2.0], cognitiveLoad: "HIGH", splittability: "SPLITTABLE" },
  COMMUNICATION:{ keywords: ["回复", "邮件", "沟通", "联系", "确认"], baseEstimateMs: 20 * MIN, rangeRatio: [0.5, 1.5], cognitiveLoad: "LOW", splittability: "ATOMIC" },
  MEETING:      { keywords: ["会议", "例会", "评审会", "对齐", "面试"], baseEstimateMs: 45 * MIN, rangeRatio: [0.8, 1.3], cognitiveLoad: "MEDIUM", splittability: "ATOMIC" },
  ADMIN:        { keywords: ["报销", "填写", "整理", "登记", "排期"], baseEstimateMs: 30 * MIN, rangeRatio: [0.6, 1.4], cognitiveLoad: "LOW", splittability: "SPLITTABLE" },
  REVIEW:       { keywords: ["评审", "审核", "review", "检查", "校对"], baseEstimateMs: 40 * MIN, rangeRatio: [0.6, 1.5], cognitiveLoad: "MEDIUM", splittability: "SPLITTABLE" },
  LEARNING:     { keywords: ["学习", "教程", "阅读", "了解"], baseEstimateMs: 60 * MIN, rangeRatio: [0.7, 2.0], cognitiveLoad: "MEDIUM", splittability: "SPLITTABLE" },
  OTHER:        { keywords: [], baseEstimateMs: 45 * MIN, rangeRatio: [0.5, 2.0], cognitiveLoad: "MEDIUM", splittability: "REQUIRES_REVIEW" },
};

export function classifyByKeywords(title: string): TaskCategory {
  const lower = title.toLowerCase();
  let best: TaskCategory = "OTHER";
  let bestScore = 0;
  for (const [cat, entry] of Object.entries(CATEGORY_CATALOG) as [TaskCategory, CatalogEntry][]) {
    const score = entry.keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  return best;
}
