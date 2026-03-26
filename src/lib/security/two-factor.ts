// ─── Two-Factor Authentication (TOTP) ──────────────────────
// Google Authenticator compatible TOTP with backup codes

import * as OTPAuth from "otpauth";
import * as QRCode from "qrcode";
import bcryptjs from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const APP_NAME = "İhalePro";
const BCRYPT_ROUNDS = 12;

// ─── Setup 2FA ──────────────────────────────────────────────

export async function setup2FA(userId: string): Promise<{
  secret: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new Error("Kullanıcı bulunamadı");

  // Generate TOTP secret
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  const secret = totp.secret.base32;
  const otpauthUri = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

  // Generate 10 backup codes
  const backupCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    backupCodes.push(code);
    hashedCodes.push(await bcryptjs.hash(code, BCRYPT_ROUNDS));
  }

  // Store (not yet enabled — needs verification)
  await prisma.twoFactorAuth.upsert({
    where: { userId },
    create: {
      userId,
      secret,
      isEnabled: false,
      backupCodes: hashedCodes,
    },
    update: {
      secret,
      isEnabled: false,
      backupCodes: hashedCodes,
      verifiedAt: null,
    },
  });

  return { secret, qrCodeDataUrl, backupCodes };
}

// ─── Verify & Enable 2FA ────────────────────────────────────

export async function verify2FA(userId: string, token: string): Promise<boolean> {
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId } });
  if (!tfa) throw new Error("2FA kurulumu bulunamadı");

  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(tfa.secret),
  });

  const delta = totp.validate({ token, window: 1 });
  if (delta === null) return false;

  // Enable 2FA after first successful verification
  if (!tfa.isEnabled) {
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: { isEnabled: true, verifiedAt: new Date() },
    });
  }

  return true;
}

// ─── Validate Token (login flow) ────────────────────────────

export async function validate2FAToken(userId: string, token: string): Promise<boolean> {
  const tfa = await prisma.twoFactorAuth.findUnique({ where: { userId } });
  if (!tfa || !tfa.isEnabled) return true; // 2FA not enabled = pass

  // Try TOTP first
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(tfa.secret),
  });

  const delta = totp.validate({ token, window: 1 });
  if (delta !== null) return true;

  // Try backup codes
  for (let i = 0; i < tfa.backupCodes.length; i++) {
    const match = await bcryptjs.compare(token.toUpperCase(), tfa.backupCodes[i]);
    if (match) {
      // Remove used backup code
      const updatedCodes = [...tfa.backupCodes];
      updatedCodes.splice(i, 1);
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: { backupCodes: updatedCodes },
      });
      return true;
    }
  }

  return false;
}

// ─── Check if 2FA is enabled ────────────────────────────────

export async function is2FAEnabled(userId: string): Promise<boolean> {
  const tfa = await prisma.twoFactorAuth.findUnique({
    where: { userId },
    select: { isEnabled: true },
  });
  return tfa?.isEnabled === true;
}

// ─── Disable 2FA ────────────────────────────────────────────

export async function disable2FA(userId: string, token: string): Promise<boolean> {
  const valid = await validate2FAToken(userId, token);
  if (!valid) return false;

  await prisma.twoFactorAuth.delete({ where: { userId } });
  return true;
}

// ─── Regenerate Backup Codes ────────────────────────────────

export async function regenerateBackupCodes(userId: string, token: string): Promise<string[] | null> {
  const valid = await validate2FAToken(userId, token);
  if (!valid) return null;

  const backupCodes: string[] = [];
  const hashedCodes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    backupCodes.push(code);
    hashedCodes.push(await bcryptjs.hash(code, BCRYPT_ROUNDS));
  }

  await prisma.twoFactorAuth.update({
    where: { userId },
    data: { backupCodes: hashedCodes },
  });

  return backupCodes;
}
