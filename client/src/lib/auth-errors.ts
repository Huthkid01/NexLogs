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
    return 'Account setup failed while sending the verification email. Contact support@nexlogs.site.';
  }

  if (normalized.includes('database error saving new user')) {
    return 'We could not finish setting up your account. Please try again or contact support.';
  }

  if (normalized.includes('password')) {
    return message;
  }

  if (normalized.includes('email')) {
    return 'Please enter a valid email address and try again.';
  }

  return 'We could not create your account. Please try again or contact support.';
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
    return 'Signed in, but this account is not an admin. In Supabase SQL, run: UPDATE profiles SET role = \'admin\' WHERE email = \'your@email.com\';';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Email not confirmed in Supabase. Ask support to confirm admin@nexlogs.com or use Forgot password.';
  }

  if (normalized.includes('admin_account_verification_failed')) {
    return 'Sign-in succeeded but no user session was returned. Try again or contact support.';
  }

  return 'We could not sign you in to the admin dashboard.';
}

/** Mask an email for user-facing notices, e.g. o********@gmail.com */
export function maskEmailAddress(email: string) {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const visible = local.slice(0, 1);
  const hiddenCount = Math.max(local.length - 1, 8);
  return `${visible}${'*'.repeat(hiddenCount)}@${domain}`;
}

export function getSignUpVerificationToast(email: string) {
  const masked = maskEmailAddress(email);
  return {
    title: 'Account created',
    description: `We sent a verification email to ${masked}. If it doesn’t appear within a few minutes, check your spam/junk folder.`,
  };
}
