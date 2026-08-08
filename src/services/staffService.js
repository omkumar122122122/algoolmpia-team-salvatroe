/**
 * Staff Service
 * API integration layer for staff management endpoints
 */

import { apiClient } from './apiClient';

// Helper: unwrap the TransformInterceptor envelope
// Backend always wraps responses as: { success, statusCode, data: <payload>, timestamp }
// We extract .data so callers receive the actual payload directly.
function unwrap(response) {
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    return response.data;
  }
  return response;
}

export const staffService = {
  /**
   * Get all staff members with filters and pagination
   * @param {Object} params - Query parameters (search, orphanageId, role, isActive, sortBy, sortOrder, page, limit)
   * @returns {Promise<{ data: Array, pagination: Object, summary: Object }>}
   */
  async getAll(params = {}) {
    // Clean params: remove undefined and empty strings
    const cleanParams = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== '')
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    const response = await apiClient.get('/staff', cleanParams);
    return unwrap(response);
  },

  /**
   * Get staff profile by ID
   * @param {string} id - Staff member ID
   * @returns {Promise<Object>} Staff profile data
   */
  async getById(id) {
    const response = await apiClient.get(`/staff/${id}`);
    return unwrap(response);
  },

  /**
   * Get staff by orphanage ID with filters
   * @param {string} orphanageId - Orphanage ID
   * @param {Object} params - Query parameters
   * @returns {Promise<{ data: Array, pagination: Object, summary: Object }>}
   */
  async getByOrphanage(orphanageId, params = {}) {
    const response = await apiClient.get('/staff', {
      ...params,
      orphanageId,
    });
    return unwrap(response);
  },

  /**
   * Get available (active) staff for a specific orphanage
   * @param {string} orphanageId - Orphanage ID
   * @returns {Promise<Array>} Array of active staff members
   */
  async getAvailable(orphanageId) {
    const response = await apiClient.get(`/staff/available/${orphanageId}`);
    return unwrap(response);
  },

  /**
   * Create a new staff member
   * @param {Object} staffData - Staff data (userId, orphanageId, role, designation, employeeId, joiningDate, notes)
   * @returns {Promise<Object>} Created staff response
   */
  async create(staffData) {
    const response = await apiClient.post('/staff', staffData);
    return unwrap(response);
  },

  /**
   * Update staff member information
   * @param {string} id - Staff member ID
   * @param {Object} updates - Fields to update (role, designation, employeeId, endDate, notes)
   * @returns {Promise<void>}
   */
  async update(id, updates) {
    const response = await apiClient.patch(`/staff/${id}`, updates);
    return unwrap(response);
  },

  /**
   * Deactivate a staff member (soft delete)
   * @param {string} id - Staff member ID
   * @returns {Promise<void>}
   */
  async deactivate(id) {
    const response = await apiClient.patch(`/staff/${id}/deactivate`);
    return unwrap(response);
  },

  /**
   * Reactivate a previously deactivated staff member
   * @param {string} id - Staff member ID
   * @returns {Promise<void>}
   */
  async reactivate(id) {
    const response = await apiClient.patch(`/staff/${id}/reactivate`);
    return unwrap(response);
  },
};
