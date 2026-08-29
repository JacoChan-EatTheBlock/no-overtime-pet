# Windows platform ownership

This directory is owned by WS-01. Windows tray, transparent-window placement, launch-at-login, capability probing and DPAPI-backed `safeStorage` adapters belong here.

Renderer code must use the typed preload bridge from `packages/contracts/src/desktop-ipc.ts`; do not expose raw Win32 handles, arbitrary IPC, filesystem access, shell execution, window lists or screenshot buffers.
