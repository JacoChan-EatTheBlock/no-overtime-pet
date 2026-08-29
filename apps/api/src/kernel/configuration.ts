const DEFAULT_API_PORT = 28780

export function readApiPort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_API_PORT

  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535')
  }

  return port
}
