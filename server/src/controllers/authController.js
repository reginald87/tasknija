import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  googleSchema,
  facebookSchema,
  githubSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../utils/validation.js';
import { config } from '../config/index.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  createUser,
  getAuthUserByEmail,
  comparePassword,
  hashPassword,
  generateResetToken,
  generateOtpCode,
  hashToken,
  findOrCreateOAuthUser,
  verifyGoogleIdToken,
} from '../utils/auth.js';
import { sendPasswordResetEmail, sendEmailOtp } from '../utils/email.js';
import { logger } from '../middleware/logger.js';
import { getVendorFeatures } from '../utils/subscriptionData.js';

const PASSWORD_RESET_REDIRECT =
  process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:5173/reset-password';

const EMAIL_OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Dev/test convenience: expose the code in API responses whenever we are not
// in production so local flows can complete verification without an inbox.
const IS_DEV = process.env.NODE_ENV !== 'production';

function genericRegisterMessage() {
  return {
    success: true,
    message:
      'If your email is new, please check your inbox to verify your account.'
  };
}

// Issue a fresh 6-digit email verification code for a profile, invalidating
// any previously-issued unused codes. Returns the plaintext code (only used
// for the email body / dev logging — never stored).
async function issueEmailOtp(profileId) {
  const code = generateOtpCode();
  const codeHash = hashToken(code);
  await prisma.emailOtp.updateMany({
    where: { user_id: profileId, purpose: 'email_verification', used_at: null },
    data: { used_at: new Date() },
  });
  await prisma.emailOtp.create({
    data: {
      user_id: profileId,
      purpose: 'email_verification',
      code_hash: codeHash,
      expires_at: new Date(Date.now() + EMAIL_OTP_TTL_MS),
    },
  });
  return code;
}

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { email, password, fullName, role, businessName, listingType, propertyType, bedrooms, isDirectFromOwner } = parsed.data;

    // Generic response on duplicate to avoid enumeration.
    const existing = await getAuthUserByEmail(email);
    if (existing) {
      return res.status(200).json(genericRegisterMessage());
    }

    const profile = await createUser({
      email,
      password,
      fullName,
      role,
      listingType,
      propertyType,
      bedrooms,
      isDirectFromOwner
    });

    // Send a 6-digit verification code (no-op/console if SMTP not configured).
    let devOtp;
    try {
      const code = await issueEmailOtp(profile.id);
      await sendEmailOtp({ email, fullName, code });
      if (IS_DEV) devOtp = code;
    } catch (mailErr) {
      req?.log?.warn?.({ err: mailErr }, 'verification email failed');
    }

    // Vendor approval flow: submit a vendor_verifications row for admin approval.
    if (role === 'vendor' && businessName) {
      try {
        await prisma.vendorVerification.create({
          data: { user_id: profile.id, business_name: businessName, status: 'pending' }
        });
      } catch (verifError) {
        req?.log?.warn?.({ err: verifError, userId: profile.id }, 'vendor_verifications insert failed');
      }
    }

    // Account is not usable until the email is verified (login is blocked).
    const body = genericRegisterMessage();
    if (devOtp) body.devOtp = devOtp;
    return res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { email, password } = parsed.data;

    const authUser = await getAuthUserByEmail(email);
    if (!authUser) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.'));
    }

    const ok = await comparePassword(password, authUser.passwordHash);
    if (!ok) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.'));
    }

    const profile = await prisma.profile.findUnique({ where: { id: authUser.id } });
    if (!profile) {
      return next(new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.'));
    }

    // Email must be verified before the account can sign in.
    if (!profile.is_verified) {
      return next(
        new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before signing in.', { email: profile.email })
      );
    }

    const accessToken = signAccessToken(profile);
    const refreshToken = signRefreshToken(profile);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: profile.id, email: profile.email },
        profile
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { email, code } = parsed.data;

    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) return next(new AppError(400, 'INVALID_OTP', 'Invalid or expired verification code.'));

    // Already verified (e.g. Google account) — just sign them in.
    if (profile.is_verified) {
      return res.json({
        success: true,
        data: {
          accessToken: signAccessToken(profile),
          refreshToken: signRefreshToken(profile),
          user: { id: profile.id, email: profile.email },
          profile
        }
      });
    }

    const codeHash = hashToken(code);
    const otp = await prisma.emailOtp.findFirst({
      where: {
        user_id: profile.id,
        purpose: 'email_verification',
        code_hash: codeHash,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
    if (!otp) return next(new AppError(400, 'INVALID_OTP', 'Invalid or expired verification code.'));

    await prisma.$transaction([
      prisma.emailOtp.update({ where: { id: otp.id }, data: { used_at: new Date() } }),
      prisma.profile.update({ where: { id: profile.id }, data: { is_verified: true } }),
    ]);

    const verifiedProfile = { ...profile, is_verified: true };
    return res.json({
      success: true,
      data: {
        accessToken: signAccessToken(verifiedProfile),
        refreshToken: signRefreshToken(verifiedProfile),
        user: { id: profile.id, email: profile.email },
        profile: verifiedProfile
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { email } = parsed.data;

    const profile = await prisma.profile.findUnique({ where: { email } });

    let devOtp;
    if (profile && !profile.is_verified) {
      try {
        const code = await issueEmailOtp(profile.id);
        await sendEmailOtp({ email, fullName: profile.full_name, code });
        if (IS_DEV) devOtp = code;
      } catch (mailErr) {
        req?.log?.warn?.({ err: mailErr }, 'resend verification email failed');
      }
    }

    // Always return the same generic response (no enumeration).
    const body = {
      success: true,
      message: 'If your email is new, a verification code has been sent to your inbox.'
    };
    // Dev/test only: expose the code so local flows can complete verification.
    if (devOtp) body.devOtp = devOtp;
    return res.json(body);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
    }

    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
    }

    // Surface the vendor's active plan entitlements so the client can gate
    // UI (analytics, priority_support, api_access, etc.) without re-deriving.
    const features = profile.role === 'vendor'
      ? Array.from(await getVendorFeatures(userId))
      : [];

    return res.json({
      success: true,
      data: {
        user: req.user,
        profile,
        features,
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    // JWT is stateless; client discards the token. Server is best-effort.
    return res.json({ success: true, message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { email } = parsed.data;

    const authUser = await getAuthUserByEmail(email);
    if (authUser) {
      const token = generateResetToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.passwordReset.create({
        data: { user_id: authUser.id, token_hash: tokenHash, expires_at: expiresAt }
      });
      const resetUrl = `${PASSWORD_RESET_REDIRECT}?token=${token}`;
      try {
        await sendPasswordResetEmail({ email, resetUrl });
      } catch (mailErr) {
        req?.log?.warn?.({ err: mailErr }, 'reset password email failed');
      }
    }

    // Always return the same generic response (no enumeration).
    return res.json({
      success: true,
      message:
        'If an account exists for that email, a reset link has been sent.'
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { token, newPassword } = parsed.data;

    const tokenHash = hashToken(token);
    const record = await prisma.passwordReset.findUnique({ where: { token_hash: tokenHash } });
    if (!record || record.used_at || record.expires_at < new Date()) {
      return next(new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid or expired reset link.'));
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.authUser.update({ where: { id: record.user_id }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { used_at: new Date() } })
    ]);

    return res.json({ success: true, message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const parsed = refreshTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { refreshToken: token } = parsed.data;

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return next(new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.'));
    }
    if (payload.type !== 'refresh') {
      return next(new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.'));
    }

    const profile = await prisma.profile.findUnique({ where: { id: payload.sub } });
    if (!profile) {
      return next(new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token.'));
    }

    const accessToken = signAccessToken(profile);
    const newRefreshToken = signRefreshToken(profile);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        user: { id: profile.id, email: profile.email }
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function googleAuth(req, res, next) {
  try {
    const parsed = googleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { idToken } = parsed.data;

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (verifyErr) {
      logger.warn?.({ err: verifyErr }, 'google id token verification failed');
      return next(new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Google sign-in failed.'));
    }

    const profile = await findOrCreateOAuthUser({
      email: payload.email,
      fullName: payload.name || null,
      avatarUrl: payload.picture || null,
      role: 'user',
    });

    const accessToken = signAccessToken(profile);
    const refreshToken = signRefreshToken(profile);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: profile.id, email: profile.email },
        profile,
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function facebookAuth(req, res, next) {
  try {
    const parsed = facebookSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { accessToken } = parsed.data;

    let profile;
    try {
      const fbRes = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.width(200)&access_token=${encodeURIComponent(accessToken)}`
      );
      if (!fbRes.ok) throw new Error('FACEBOOK_API_ERROR');
      const data = await fbRes.json();
      if (!data.email) throw new Error('FACEBOOK_NO_EMAIL');
      profile = {
        email: data.email,
        fullName: data.name || null,
        avatarUrl: data.picture?.data?.url || null,
      };
    } catch (err) {
      logger.warn?.({ err }, 'Facebook token verification failed');
      return next(new AppError(401, 'INVALID_FACEBOOK_TOKEN', 'Facebook sign-in failed.'));
    }

    const user = await findOrCreateOAuthUser({
      email: profile.email,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      role: 'user',
    });

    const jwtAccessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({
      success: true,
      data: {
        accessToken: jwtAccessToken,
        refreshToken,
        user: { id: user.id, email: user.email },
        profile: user,
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function githubAuth(req, res, next) {
  try {
    const parsed = githubSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'Invalid request payload',
          parsed.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
            code: i.code
          }))
        )
      );
    }
    const { code } = parsed.data;

    const githubClientId = config.githubClientId;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || '';

    if (!githubClientId || !githubClientSecret) {
      return next(new AppError(500, 'GITHUB_NOT_CONFIGURED', 'GitHub OAuth is not configured.'));
    }

    let accessToken;
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code,
        }),
      });
      if (!tokenRes.ok) throw new Error('GITHUB_TOKEN_EXCHANGE_FAILED');
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      if (!accessToken) throw new Error('GITHUB_NO_ACCESS_TOKEN');
    } catch (err) {
      logger.warn?.({ err }, 'GitHub token exchange failed');
      return next(new AppError(401, 'INVALID_GITHUB_CODE', 'GitHub sign-in failed.'));
    }

    let profile;
    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });
      if (!userRes.ok) throw new Error('GITHUB_API_ERROR');
      const userData = await userRes.json();
      profile = {
        email: userData.email || `${userData.id}@github.noreply`,
        fullName: userData.name || userData.login || null,
        avatarUrl: userData.avatar_url || null,
      };
    } catch (err) {
      logger.warn?.({ err }, 'GitHub user fetch failed');
      return next(new AppError(401, 'GITHUB_USER_FETCH_FAILED', 'GitHub sign-in failed.'));
    }

    const user = await findOrCreateOAuthUser({
      email: profile.email,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      role: 'user',
    });

    const jwtAccessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.json({
      success: true,
      data: {
        accessToken: jwtAccessToken,
        refreshToken,
        user: { id: user.id, email: user.email },
        profile: user,
      }
    });
  } catch (err) {
    next(err);
  }
}
