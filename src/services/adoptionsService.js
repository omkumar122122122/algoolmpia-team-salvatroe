import { apiClient } from './apiClient';

const unwrap = (response) => response?.success ? response.data : response;

export const adoptionsService = {
  async verify(parentId, childId) { return unwrap(await apiClient.get('/adoptions/verify', { parentId, childId })); },
  async getAll(params = {}) { return unwrap(await apiClient.get('/adoptions', params)); },
  async create(data) { return unwrap(await apiClient.post('/adoptions', data)); },
  async uploadDocument(id, documentType, file) {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file);
    return unwrap(await apiClient.post(`/adoptions/${id}/documents`, form));
  },
  async updateStatus(id, data) { return unwrap(await apiClient.patch(`/adoptions/${id}/status`, data)); },
  async generateBrief(id) {
    const token = apiClient.getAuthToken();
    const response = await fetch(`${apiClient.baseURL}/adoptions/${id}/brief`, {
      method: 'GET',
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!response.ok) throw new Error('Failed to generate legal review brief');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-brief-${id}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
