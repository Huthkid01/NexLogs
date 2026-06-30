export function normalizeAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Authentication failed';
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

export function getUserSignUpMessage(message: string) {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  if (normalized.includes('error sending confirmation email') || normalized.includes('error sending email')) {
    return 'Account setup failed while sending the verification email. Contact support@nexlogs.store.';
  }

  if (normalized.includes('database error saving new user')) {
    return 'We could not finish setting up your account. Please try again or contact support.';
  }

  if (normalized.includes('password')) {
    return message;
  }

  if (normalized.includes('email')) {
    return message;
  }

  return message || 'We could not create your account.';
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

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }

  return 'We could not sign you in to the admin dashboard.';
}
