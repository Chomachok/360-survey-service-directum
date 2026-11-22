const roleClaim = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

export const getTokenRoles = (token = localStorage.getItem('authToken')): string[] => {
  if (!token) return []
  try {
    const payload = token.split('.')[1]
    if (!payload) return []
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const claims = JSON.parse(atob(normalized)) as Record<string, unknown>
    const roleValues = [claims.role, claims.roles, claims[roleClaim]]
    return roleValues.flatMap((value) => {
      if (typeof value === 'string') return [value]
      if (Array.isArray(value)) return value.filter((role): role is string => typeof role === 'string')
      return []
    })
  } catch {
    return []
  }
}

export const hasSystemAdministratorRole = () => getTokenRoles().includes('SystemAdministrator')
