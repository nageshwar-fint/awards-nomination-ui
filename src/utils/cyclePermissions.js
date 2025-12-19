import { ROLES } from '../constants/roles'

export const canCreateCycle = (role) =>
  [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.HR].includes(role)

export const canEditCycle = (cycle, role) =>
  cycle.status === 'DRAFT' &&
  [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.HR].includes(role)

export const canDeleteCycle = canEditCycle

export const canSubmitNomination = (cycle, role) =>
  cycle.status === 'OPEN' &&
  [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.HR].includes(role)

export const canApprove = (nomination, role) =>
  nomination.status === 'PENDING' &&
  [ROLES.MANAGER, ROLES.HR].includes(role)

export const canComputeRankings = (cycle, role) =>
  cycle.status === 'CLOSED' &&
  [ROLES.MANAGER, ROLES.HR].includes(role)

export const canFinalize = canComputeRankings
