import { Type, type Static } from '@sinclair/typebox'
import {
  DurationMsSchema,
  EntityIdSchema,
  ProbabilitySchema,
  RevisionSchema,
  UtcTimestampSchema
} from './common.js'

export const TaskCategorySchema = Type.Union([
  Type.Literal('WRITING'),
  Type.Literal('CODING'),
  Type.Literal('DESIGN'),
  Type.Literal('RESEARCH'),
  Type.Literal('COMMUNICATION'),
  Type.Literal('MEETING'),
  Type.Literal('ADMIN'),
  Type.Literal('REVIEW'),
  Type.Literal('LEARNING'),
  Type.Literal('OTHER')
])

export const CognitiveLoadSchema = Type.Union([
  Type.Literal('LOW'),
  Type.Literal('MEDIUM'),
  Type.Literal('HIGH')
])
export const ProposalStatusSchema = Type.Union([
  Type.Literal('PENDING'),
  Type.Literal('ACCEPTED'),
  Type.Literal('REJECTED'),
  Type.Literal('SUPERSEDED')
])
export const TaskAnalysisProposalSchema = Type.Object(
  {
    id: EntityIdSchema,
    taskId: EntityIdSchema,
    taskType: TaskCategorySchema,
    estimatedDurationMs: DurationMsSchema,
    cognitiveLoad: CognitiveLoadSchema,
    confidence: ProbabilitySchema,
    rationale: Type.String({ minLength: 1, maxLength: 1000 }),
    modelVersion: Type.String({ minLength: 1, maxLength: 128 }),
    policyVersion: Type.String({ minLength: 1, maxLength: 64 }),
    status: ProposalStatusSchema,
    revision: RevisionSchema,
    createdAt: UtcTimestampSchema
  },
  { additionalProperties: false }
)

export type TaskAnalysisProposal = Static<typeof TaskAnalysisProposalSchema>
export type ProposalStatus = Static<typeof ProposalStatusSchema>
export type TaskCategory = Static<typeof TaskCategorySchema>
