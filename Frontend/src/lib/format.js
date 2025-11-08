import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(relativeTime)
dayjs.extend(customParseFormat)

/**
 * Format date to display format
 * @param {string|Date} date - Date to format
 * @param {string} format - Format string (default: 'MMM DD, YYYY')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'MMM DD, YYYY') {
  if (!date) return '-'
  return dayjs(date).format(format)
}

/**
 * Format date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  if (!date) return '-'
  return dayjs(date).format('MMM DD, YYYY HH:mm')
}

/**
 * Format time only
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  if (!date) return '-'
  return dayjs(date).format('HH:mm')
}

/**
 * Get relative time (e.g., "2 hours ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '-'
  return dayjs(date).fromNow()
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'USD') {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format percentage
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 2) {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}%`
}

/**
 * Format phone number
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhone(phone) {
  if (!phone) return '-'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

