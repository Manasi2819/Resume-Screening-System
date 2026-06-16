import axios from 'axios'

const api = axios.create({
  baseURL: '/api',          // proxied to http://localhost:8000/api by Vite
  timeout: 180000,          // 3 min — BGE model is slow on first call
})

/**
 * Screen resumes against a JD.
 * @param {string} jdText   - Pasted JD text (empty string if using PDF)
 * @param {File|null} jdPdf - JD as PDF file (null if using text)
 * @param {File[]} resumeFiles - Array of resume PDF files
 */
export async function screenResumes(jdText, jdPdf, resumeFiles) {
  const formData = new FormData()
  formData.append('jd_text', jdText || '')
  if (jdPdf) {
    formData.append('jd_pdf', jdPdf)
  }
  resumeFiles.forEach((file) => formData.append('resumes', file))

  const response = await api.post('/screen', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function getResults(jobId) {
  const response = await api.get(`/jobs/${jobId}/results`)
  return response.data
}

export async function listJobs() {
  const response = await api.get('/jobs')
  return response.data
}

export async function getCandidate(candidateId) {
  const response = await api.get(`/candidates/${candidateId}`)
  return response.data
}

