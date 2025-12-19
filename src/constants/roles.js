export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  TEAM_LEAD: 'TEAM_LEAD',
  MANAGER: 'MANAGER',
  HR: 'HR',
}

export const ROLE_ORDER = [
  ROLES.EMPLOYEE,
  ROLES.TEAM_LEAD,
  ROLES.MANAGER,
  ROLES.HR,
]

export const hasMinRole = (userRole, requiredRole) => {
  return (
    ROLE_ORDER.indexOf(userRole) >=
    ROLE_ORDER.indexOf(requiredRole)
  )
}
