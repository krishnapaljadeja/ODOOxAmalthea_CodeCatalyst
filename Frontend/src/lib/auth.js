/**
 * Auth helper functions
 */

/**
 * Store tokens in localStorage
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('accessToken', accessToken)
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken)
  }
}

/**
 * Get access token from localStorage
 * @returns {string|null} Access token or null
 */
export function getAccessToken() {
  return localStorage.getItem('accessToken')
}

/**
 * Get refresh token from localStorage
 * @returns {string|null} Refresh token or null
 */
export function getRefreshToken() {
  return localStorage.getItem('refreshToken')
}

/**
 * Clear tokens from localStorage
 */
export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if access token exists
 */
export function isAuthenticated() {
  return !!getAccessToken()
}

