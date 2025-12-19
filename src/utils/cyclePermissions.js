/**
 * Permission utilities for role-based access control
 * 
 * Role Permissions (as per latest API docs):
 * - EMPLOYEE: Read-only access to cycles, nominations, rankings
 * - TEAM_LEAD: Can submit nominations only
 * - MANAGER: Can submit nominations, approve/reject nominations (with ratings), compute rankings
 * - HR: Full system access: manage cycles (create/update/delete/finalize), manage criteria, manage users, approve nominations, compute rankings
 */

import { ROLES } from '../constants/roles'

/**
 * Check if user can create a new cycle
 * Allowed: HR only
 * NOT allowed: EMPLOYEE, TEAM_LEAD, MANAGER
 */
export const canCreateCycle = (role) =>
  role === ROLES.HR

/**
 * Check if user can edit a cycle
 * Allowed: HR only (for DRAFT cycles, or OPEN/CLOSED cycles for status changes)
 * NOT allowed: EMPLOYEE, TEAM_LEAD, MANAGER
 */
export const canEditCycle = (cycle, role) =>
  role === ROLES.HR && (cycle.status === 'DRAFT' || cycle.status === 'OPEN' || cycle.status === 'CLOSED')

/**
 * Check if user can delete a cycle
 * Allowed: HR only (only DRAFT cycles with no nominations)
 * NOT allowed: EMPLOYEE, TEAM_LEAD, MANAGER
 */
export const canDeleteCycle = (cycle, role) =>
  cycle.status === 'DRAFT' && role === ROLES.HR

/**
 * Check if user can submit a nomination
 * Allowed: TEAM_LEAD, MANAGER, HR (only for OPEN cycles)
 * NOT allowed: EMPLOYEE
 */
export const canSubmitNomination = (cycle, role) =>
  cycle.status === 'OPEN' &&
  [ROLES.TEAM_LEAD, ROLES.MANAGER, ROLES.HR].includes(role)

/**
 * Check if user can approve/reject nominations
 * Allowed: MANAGER, HR
 * NOT allowed: EMPLOYEE, TEAM_LEAD
 */
export const canApprove = (nomination, role) =>
  nomination.status === 'PENDING' &&
  [ROLES.MANAGER, ROLES.HR].includes(role)

/**
 * Check if user can compute rankings
 * Allowed: MANAGER, HR (only for CLOSED cycles)
 * NOT allowed: EMPLOYEE, TEAM_LEAD
 */
export const canComputeRankings = (cycle, role) =>
  cycle.status === 'CLOSED' &&
  [ROLES.MANAGER, ROLES.HR].includes(role)

/**
 * Check if user can finalize a cycle
 * Allowed: HR only
 * NOT allowed: EMPLOYEE, TEAM_LEAD, MANAGER
 */
export const canFinalize = (cycle, role) =>
  cycle.status === 'CLOSED' && role === ROLES.HR

/**
 * Check if user can manage criteria (create/update/delete)
 * Allowed: HR only
 * NOT allowed: EMPLOYEE, TEAM_LEAD, MANAGER
 */
export const canManageCriteria = (cycle, role) =>
  cycle.status === 'DRAFT' && role === ROLES.HR

/**
 * Check if user can manage users (create/update/delete/activate/deactivate)
 * Allowed: HR only
 * NOT allowed: EMPLOYEE, TEAM_LEAD, MANAGER
 */
export const canManageUsers = (role) =>
  role === ROLES.HR
