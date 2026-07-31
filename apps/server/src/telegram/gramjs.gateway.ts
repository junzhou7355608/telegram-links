import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, TelegramClient, utils } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { extractPlainHttpUrls } from '../common/link-values';
import type {
  GatewayChat,
  GatewayChatType,
  GatewayMessage,
  MessageRange,
  SendCodeResult,
  SignInResult,
  TelegramUserProfile,
} from './telegram.gateway';
import { TelegramGateway } from './telegram.gateway';

function errorCode(error: unknown): string | undefined {
  return (error as { errorMessage?: string }).errorMessage;
}

function entityValue(entity: unknown, key: string): unknown {
  return (entity as Record<string, unknown>)[key];
}

export function extractMessageUrls(message: Api.Message): string[] {
  const urls = new Set(extractPlainHttpUrls(message.message ?? ''));
  const entities = message.getEntitiesText() as [unknown, string][];

  for (const [entity, text] of entities) {
    if (entity instanceof Api.MessageEntityTextUrl) {
      urls.add(entity.url);
    } else if (entity instanceof Api.MessageEntityUrl) {
      urls.add(text);
    }
  }

  for (const row of message.buttons ?? []) {
    for (const button of row) {
      if (button.url) {
        urls.add(button.url);
      }
    }
  }

  return [...urls];
}

@Injectable()
export class GramJsGateway extends TelegramGateway {
  private client: TelegramClient | null = null;
  private readonly chatMetadata = new Map<string, GatewayChat>();
  private readonly entities = new Map<string, Api.TypeInputPeer>();

  constructor(private readonly configService: ConfigService) {
    super();
  }

  isConfigured(): boolean {
    return Boolean(this.apiId && this.apiHash);
  }

  async connectWithSession(session: string): Promise<boolean> {
    await this.replaceClient(session);
    return this.requireClient().checkAuthorization();
  }

  async resetSession(): Promise<void> {
    await this.replaceClient('');
  }

  async checkAuthorization(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    return this.client.checkAuthorization();
  }

  async sendCode(phoneNumber: string): Promise<SendCodeResult> {
    const client = await this.ensureClient();
    return client.sendCode(this.credentials, phoneNumber, false);
  }

  async signInWithCode(
    phoneNumber: string,
    phoneCodeHash: string,
    phoneCode: string,
  ): Promise<SignInResult> {
    const client = this.requireClient();
    try {
      const result = await client.invoke(
        new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode }),
      );
      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        throw new Error('TELEGRAM_SIGN_UP_NOT_SUPPORTED');
      }
      return { status: 'authorized', user: this.toProfile(result.user) };
    } catch (error) {
      if (errorCode(error) === 'SESSION_PASSWORD_NEEDED') {
        return { status: 'passwordRequired' };
      }
      throw error;
    }
  }

  async signInWithPassword(password: string): Promise<TelegramUserProfile> {
    const user = await this.requireClient().signInWithPassword(
      this.credentials,
      {
        onError: (error) => {
          throw error;
        },
        password: () => Promise.resolve(password),
      },
    );
    return this.toProfile(user);
  }

  async getCurrentUser(): Promise<TelegramUserProfile> {
    return this.toProfile(await this.requireClient().getMe());
  }

  getSession(): string {
    const saved = this.requireClient().session.save();
    return typeof saved === 'string' ? saved : '';
  }

  async getDialogs(): Promise<GatewayChat[]> {
    const dialogs = await this.requireClient().getDialogs({});
    this.chatMetadata.clear();
    this.entities.clear();

    const chats = dialogs.flatMap((dialog) => {
      if (!dialog.id || !dialog.entity) {
        return [];
      }
      const telegramPeerId = dialog.id.toString();
      this.entities.set(telegramPeerId, dialog.inputEntity);
      const self = entityValue(dialog.entity, 'self') === true;
      const type: GatewayChatType = self
        ? 'saved'
        : dialog.isUser
          ? 'private'
          : dialog.isGroup
            ? 'group'
            : 'channel';
      const username = entityValue(dialog.entity, 'username');

      return [
        {
          telegramPeerId,
          title: dialog.title ?? dialog.name ?? telegramPeerId,
          type,
          ...(typeof username === 'string' ? { username } : {}),
        },
      ];
    });
    for (const chat of chats) {
      this.chatMetadata.set(chat.telegramPeerId, chat);
    }
    return chats;
  }

  async *getMessages(
    telegramPeerId: string,
    range: MessageRange,
  ): AsyncIterable<GatewayMessage> {
    const entity = this.entities.get(telegramPeerId);
    if (!entity) {
      throw new Error(`TELEGRAM_CHAT_NOT_RESOLVED:${telegramPeerId}`);
    }

    const messages = this.requireClient().iterMessages(entity, {
      limit: undefined,
      minId: range.minId ?? 0,
      offsetDate: range.to ? Math.floor(range.to.getTime() / 1000) : undefined,
      waitTime: 1,
    });

    for await (const message of messages) {
      if (!(message instanceof Api.Message)) {
        continue;
      }
      const sentAt = new Date(message.date * 1000);
      if (range.to && sentAt > range.to) {
        continue;
      }
      if (range.from && sentAt < range.from) {
        break;
      }

      const urls = extractMessageUrls(message);
      yield {
        messageId: Number(message.id),
        messageUrl: this.messageUrl(telegramPeerId, message.id),
        senderName: message.postAuthor,
        senderTelegramId: message.senderId?.toString(),
        sentAt,
        text: message.message ?? '',
        urls,
      };
    }
  }

  async logOut(): Promise<void> {
    if (this.client) {
      await this.client.invoke(new Api.auth.LogOut());
    }
    await this.disconnect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.chatMetadata.clear();
      this.entities.clear();
    }
  }

  private get apiId(): number | undefined {
    const raw = this.configService.get<string>('TELEGRAM_API_ID');
    if (!raw) {
      return undefined;
    }
    const value = Number.parseInt(raw, 10);
    return Number.isSafeInteger(value) ? value : undefined;
  }

  private get apiHash(): string | undefined {
    return this.configService.get<string>('TELEGRAM_API_HASH') || undefined;
  }

  private get credentials() {
    const apiId = this.apiId;
    const apiHash = this.apiHash;
    if (!apiId || !apiHash) {
      throw new Error('TELEGRAM_NOT_CONFIGURED');
    }
    return { apiHash, apiId };
  }

  private async ensureClient(): Promise<TelegramClient> {
    if (!this.client) {
      await this.replaceClient('');
    }
    return this.requireClient();
  }

  private requireClient(): TelegramClient {
    if (!this.client) {
      throw new Error('TELEGRAM_CLIENT_NOT_CONNECTED');
    }
    return this.client;
  }

  private async replaceClient(session: string): Promise<void> {
    await this.disconnect();
    const { apiHash, apiId } = this.credentials;
    this.client = new TelegramClient(
      new StringSession(session),
      apiId,
      apiHash,
      { connectionRetries: 5, floodSleepThreshold: 60 },
    );
    await this.client.connect();
  }

  private toProfile(user: Api.TypeUser): TelegramUserProfile {
    if (!(user instanceof Api.User)) {
      throw new Error('TELEGRAM_USER_PROFILE_UNAVAILABLE');
    }
    return {
      displayName: utils.getDisplayName(user),
      phoneNumber: user.phone,
      telegramUserId: user.id.toString(),
      username: user.username,
    };
  }

  private messageUrl(telegramPeerId: string, messageId: number) {
    const chat = this.chatMetadata.get(telegramPeerId);
    if (chat?.username) {
      return `https://t.me/${chat.username}/${messageId}`;
    }
    if (telegramPeerId.startsWith('-100')) {
      return `https://t.me/c/${telegramPeerId.slice(4)}/${messageId}`;
    }
    return undefined;
  }
}
