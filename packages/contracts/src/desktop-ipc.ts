import { Type, type Static } from '@sinclair/typebox'

export const DesktopIpcChannels = {
  getCapabilities: 'desktop:get-capabilities',
  minimizeMainWindow: 'shell:minimize-main-window',
  toggleMaximizeMainWindow: 'shell:toggle-maximize-main-window',
  hideMainWindow: 'shell:hide-main-window',
  showMainWindow: 'shell:show-main-window',
  setLaunchAtLogin: 'desktop:set-launch-at-login'
} as const

export const CapabilityStatusSchema = Type.Union([
  Type.Literal('AVAILABLE'),
  Type.Literal('DISABLED'),
  Type.Literal('UNAVAILABLE'),
  Type.Literal('BLOCKED')
])
export const DesktopCapabilitySnapshotSchema = Type.Object(
  {
    platform: Type.Literal('win32'),
    arch: Type.Literal('x64'),
    inputActivity: CapabilityStatusSchema,
    windowContext: CapabilityStatusSchema,
    screenCapture: CapabilityStatusSchema,
    safeStorage: CapabilityStatusSchema
  },
  { additionalProperties: false }
)

export type CapabilityStatus = Static<typeof CapabilityStatusSchema>
export type DesktopCapabilitySnapshot = Static<typeof DesktopCapabilitySnapshotSchema>
