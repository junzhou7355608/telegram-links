import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api, TelegramClient, utils } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { extractPlainHttpUrls } from '../common/link-values';
import type {
  GatewayChat,
  GatewayChatType,
  GatewayMessage,
  GatewayContextMessage,
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

function contextMessage(message: Api.Message): GatewayContextMessage {
  return {
    sentAt: new Date(message.date * 1000),
    senderName: message.postAuthor,
    text: message.message ?? '',
  };
}

function withinTenMinutes(left: Api.Message, right: Api.Message): boolean {
  return Math.abs(left.date - right.date) <= 10 * 60;
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

    const window: Api.Message[] = [];
    const emitted = new Set<number>();
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

      window.push(message);
      if (window.length >= 3) {
        const candidate = window.length === 3 ? window[0] : window[1];
        if (candidate && !emitted.has(candidate.id)) {
          yield await this.toGatewayMessage(
            telegramPeerId,
            entity,
            candidate,
            window,
          );
          emitted.add(candidate.id);
        }
      }
      if (window.length === 4) {
        window.shift();
      }
    }
    for (const message of window) {
      if (!emitted.has(message.id)) {
        yield await this.toGatewayMessage(
          telegramPeerId,
          entity,
          message,
          window,
        );
      }
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

  private async toGatewayMessage(
    telegramPeerId: string,
    entity: Api.TypeInputPeer,
    message: Api.Message,
    window: Api.Message[],
  ): Promise<GatewayMessage> {
    const urls = extractMessageUrls(message);
    const currentIndex = window.indexOf(message);
    const older = window
      .slice(currentIndex + 1, currentIndex + 3)
      .filter((item) => withinTenMinutes(item, message))
      .toReversed()
      .map(contextMessage);
    const newer = currentIndex > 0 ? window[currentIndex - 1] : undefined;
    const reply =
      urls.length > 0
        ? await this.replyContext(entity, message, window)
        : undefined;
    return {
      context: {
        forwardSource: this.forwardSource(message),
        next:
          newer && withinTenMinutes(newer, message)
            ? contextMessage(newer)
            : undefined,
        previous: older,
        reply,
      },
      messageId: Number(message.id),
      messageUrl: this.messageUrl(telegramPeerId, message.id),
      senderName: message.postAuthor,
      senderTelegramId: message.senderId?.toString(),
      sentAt: new Date(message.date * 1000),
      text: message.message ?? '',
      urls,
    };
  }

  private async replyContext(
    entity: Api.TypeInputPeer,
    message: Api.Message,
    window: Api.Message[],
  ): Promise<GatewayContextMessage | undefined> {
    const header = message.replyTo;
    if (!(header instanceof Api.MessageReplyHeader)) {
      return undefined;
    }
    if (header.quoteText) {
      return {
        sentAt: new Date(message.date * 1000),
        text: header.quoteText,
      };
    }
    if (!header.replyToMsgId) {
      return undefined;
    }
    const local = window.find((item) => item.id === header.replyToMsgId);
    if (local) {
      return contextMessage(local);
    }
    const [remote] = await this.requireClient().getMessages(entity, {
      ids: header.replyToMsgId,
    });
    return remote instanceof Api.Message ? contextMessage(remote) : undefined;
  }

  private forwardSource(message: Api.Message): string | undefined {
    const forward = message.fwdFrom;
    if (!forward) {
      return undefined;
    }
    const values = [
      entityValue(forward, 'fromName'),
      entityValue(forward, 'postAuthor'),
      entityValue(forward, 'fromId')?.toString(),
    ].filter(
      (value): value is string => typeof value === 'string' && Boolean(value),
    );
    return values[0];
  }
}
