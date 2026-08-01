import type { SendCodeResponseDto } from '@/api/types.gen';
import { atom } from 'jotai';

export type TelegramAuthChallenge = SendCodeResponseDto & {
  phoneNumber: string;
  stage: 'code' | 'password';
};

export const telegramAuthChallengeAtom = atom<TelegramAuthChallenge | null>(
  null,
);

export function createTelegramAuthChallenge(
  response: SendCodeResponseDto,
  phoneNumber: string,
): TelegramAuthChallenge {
  return { ...response, phoneNumber, stage: 'code' };
}

export function requireTelegramPassword(
  challenge: TelegramAuthChallenge,
): TelegramAuthChallenge {
  return { ...challenge, stage: 'password' };
}
