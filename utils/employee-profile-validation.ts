/**
 * The profile editor accepts Indonesian mobile/office numbers in the forms
 * commonly entered by people: 0812..., +62812..., and separators such as
 * spaces, hyphens, or parentheses. The database migration mirrors these
 * checks so a direct RPC call cannot bypass the browser validation.
 */
export function hasEmployeeNameLetter(value: string) {
  return /\p{L}/u.test(value.trim())
}

export function isValidIndonesianPhone(value: string) {
  const phone = value.trim()
  if (!phone) return true

  if (!/^[0-9+()\s-]+$/.test(phone)) return false

  const normalized = phone.replace(/[\s()-]/g, '')
  if (!/^(0\d+|\+62\d+)$/.test(normalized)) return false

  const digits = normalized.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}
