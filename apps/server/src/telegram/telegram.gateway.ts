export interface TelegramUserProfile {
  displayName: string;
  phoneNumber?: string;
  telegramUserId: string;
  username?: string;
}

export type GatewayChatType = 'saved' | 'private' | 'group' | 'channel';

export interface GatewayChat {
  telegramPeerId: string;
  title: string;
  type: GatewayChatType;
  username?: string;
}

export interface GatewayMessage {
  context: GatewayMessageContext;
  messageId: number;
  messageUrl?: string;
  senderName?: string;
  senderTelegramId?: string;
  sentAt: Date;
  text: string;
  urls: string[];
}

export interface GatewayContextMessage {
  sentAt: Date;
  senderName?: string;
  text: string;
}

export interface GatewayMessageContext {
  forwardSource?: string;
  next?: GatewayContextMessage;
  previous: GatewayContextMessage[];
  reply?: GatewayContextMessage;
}

export interface MessageRange {
  from?: Date;
  minId?: number;
  to?: Date;
}

export interface SendCodeResult {
  isCodeViaApp: boolean;
  phoneCodeHash: string;
}

export type SignInResult =
  | { status: 'authorized'; user: TelegramUserProfile }
  | { status: 'passwordRequired' };

export abstract class TelegramGateway {
  abstract checkAuthorization(): Promise<boolean>;
  abstract connectWithSession(session: string): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract getCurrentUser(): Promise<TelegramUserProfile>;
  abstract getDialogs(): Promise<GatewayChat[]>;
  abstract getMessages(
    telegramPeerId: string,
    range: MessageRange,
  ): AsyncIterable<GatewayMessage>;
  abstract getSession(): string;
  abstract isConfigured(): boolean;
  abstract logOut(): Promise<void>;
  abstract resetSession(): Promise<void>;
  abstract sendCode(phoneNumber: string): Promise<SendCodeResult>;
  abstract signInWithCode(
    phoneNumber: string,
    phoneCodeHash: string,
    phoneCode: string,
  ): Promise<SignInResult>;
  abstract signInWithPassword(password: string): Promise<TelegramUserProfile>;
}
