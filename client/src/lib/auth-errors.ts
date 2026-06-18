export function normalizeAuthErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Authentication failed';
}

export function isExpectedUserAuthError(message: string) {
  const normalized = message.trim().toLowerCase();

  return [
    'invalid login credentials',
    'invalid credentials',
    'invalid_admin_credentials',
    'admin_access_not_granted',
    'email not confirmed',
    'invalid_grant',
    'user not found',
  ].some((value) => normalized.includes(value));
}

export function getUserLoginMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('invalid_grant')
  ) {
    return 'Wrong email or password.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  return 'We could not sign you in.';
}

export function getAdminLoginMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes('invalid_admin_credentials') ||
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('invalid_grant')
  ) {
    return 'Wrong admin email or password.';
  }

  if (normalized.includes('admin_access_not_granted')) {
    return 'Your account does not have admin access.';
  }

  return 'We could not sign you in to the admin dashboard.';
}
