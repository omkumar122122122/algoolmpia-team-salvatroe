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
  async generateBrief(id, format = 'pdf') {
    const token = apiClient.getAuthToken();
    const response = await fetch(`${apiClient.baseURL}/adoptions/${id}/brief?format=${format}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        Accept: format === 'html' ? 'text/html' : 'application/pdf',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('Unauthorized access to legal record');
      }
      if (response.status === 404) {
        throw new Error('Adoption legal record not found');
      }
      if (response.status === 400) {
        throw new Error('Invalid legal record ID parameter');
      }
      throw new Error('Unable to generate review brief');
    }

    let filename = `legal-review-brief-${id}.${format}`;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
      if (matches && matches[1]) {
        filename = matches[1].replace(/['"]/g, '').trim();
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  async getBriefData(id) {
    return unwrap(await apiClient.get(`/adoptions/${id}/brief/data`));
  },
};
