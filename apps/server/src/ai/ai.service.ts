import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiProvider, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { SessionCryptoService } from '../telegram/session-crypto.service';
import {
  AiGateway,
  AiGatewayError,
  type AiClassificationInput,
  type AiClassificationResult,
  type AiModel,
  type AiRuntime,
  type AiTaxonomyItem,
} from './ai.gateway';

const SETTINGS_ID = 'default';

export interface ApplyAiSuggestionsInput {
  analysisId: string;
  applyCategory: boolean;
  applyProject: boolean;
  tagNames: string[];
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

@Injectable()
export class AiService {
  constructor(
    private readonly crypto: SessionCryptoService,
    private readonly gateway: AiGateway,
    private readonly prisma: PrismaService,
  ) {}

  async getSettings() {
    const settings = await this.prisma.aiSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const configured = Boolean(
      settings?.apiKeyCiphertext && settings.apiKeyIv && settings.apiKeyAuthTag,
    );
    return {
      configured,
      lastValidatedAt: settings?.lastValidatedAt?.toISOString() ?? null,
      provider: 'kimi' as const,
      ready: configured && Boolean(settings?.selectedModel),
      selectedModel: settings?.selectedModel ?? null,
    };
  }

  async setKey(apiKeyInput: string) {
    const apiKey = apiKeyInput.trim();
    if (!apiKey) {
      throw new BadRequestException({
        code: 'AI_API_KEY_REQUIRED',
        message: '请输入 Kimi API Key。',
      });
    }
    const models = await this.safeListModels(apiKey);
    if (models.length === 0) {
      throw new BadRequestException({
        code: 'AI_MODELS_EMPTY',
        message: 'Kimi 未返回可用模型。',
      });
    }
    const current = await this.prisma.aiSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const encrypted = this.crypto.encrypt(apiKey);
    const selectedModel = models.some(
      (model) => model.id === current?.selectedModel,
    )
      ? current?.selectedModel
      : null;
    await this.prisma.aiSettings.upsert({
      create: {
        apiKeyAuthTag: encrypted.authTag,
        apiKeyCiphertext: encrypted.ciphertext,
        apiKeyIv: encrypted.iv,
        id: SETTINGS_ID,
        lastValidatedAt: new Date(),
        provider: AiProvider.KIMI,
        selectedModel,
      },
      update: {
        apiKeyAuthTag: encrypted.authTag,
        apiKeyCiphertext: encrypted.ciphertext,
        apiKeyIv: encrypted.iv,
        lastValidatedAt: new Date(),
        provider: AiProvider.KIMI,
        selectedModel,
      },
      where: { id: SETTINGS_ID },
    });
    return this.getSettings();
  }

  async clearKey(): Promise<void> {
    await this.prisma.aiSettings.upsert({
      create: { id: SETTINGS_ID },
      update: {
        apiKeyAuthTag: null,
        apiKeyCiphertext: null,
        apiKeyIv: null,
        lastValidatedAt: null,
        selectedModel: null,
      },
      where: { id: SETTINGS_ID },
    });
  }

  async listModels(): Promise<AiModel[]> {
    const apiKey = await this.requireApiKey();
    const models = await this.safeListModels(apiKey);
    await this.prisma.aiSettings.update({
      data: { lastValidatedAt: new Date() },
      where: { id: SETTINGS_ID },
    });
    return models;
  }

  async setModel(modelIdInput: string) {
    const modelId = modelIdInput.trim();
    const models = await this.listModels();
    if (!models.some(({ id }) => id === modelId)) {
      throw new BadRequestException({
        code: 'AI_MODEL_NOT_AVAILABLE',
        message: '选择的 Kimi 模型当前不可用。',
      });
    }
    await this.prisma.aiSettings.update({
      data: { selectedModel: modelId },
      where: { id: SETTINGS_ID },
    });
    return this.getSettings();
  }

  async requireReady(modelSnapshot?: string): Promise<AiRuntime> {
    const settings = await this.prisma.aiSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    const apiKey = await this.requireApiKey(settings);
    const selectedModel = modelSnapshot ?? settings?.selectedModel;
    if (!selectedModel) {
      throw new ServiceUnavailableException({
        code: 'AI_MODEL_NOT_SELECTED',
        message: '请先在 AI 设置中选择扫描模型。',
      });
    }
    const models = await this.safeListModels(apiKey);
    const model = models.find(({ id }) => id === selectedModel);
    if (!model) {
      throw new ServiceUnavailableException({
        code: 'AI_MODEL_NOT_AVAILABLE',
        message: '已选择的 Kimi 模型当前不可用，请重新选择。',
      });
    }
    await this.prisma.aiSettings.update({
      data: { lastValidatedAt: new Date() },
      where: { id: SETTINGS_ID },
    });
    return { apiKey, model, provider: 'kimi' };
  }

  classify(
    runtime: AiRuntime,
    input: AiClassificationInput,
  ): Promise<AiClassificationResult> {
    return this.gateway.classify(runtime, input).catch((error: unknown) => {
      throw this.toHttpException(error);
    });
  }

  async taxonomy(): Promise<{
    categories: AiTaxonomyItem[];
    projects: AiTaxonomyItem[];
    tags: AiTaxonomyItem[];
  }> {
    const [projects, categories, tags] = await Promise.all([
      this.prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.tag.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);
    return { categories, projects, tags };
  }

  async latestAnalysis(linkId: string) {
    const analysis = await this.prisma.aiAnalysis.findFirst({
      orderBy: { createdAt: 'desc' },
      where: { linkId },
    });
    if (!analysis) {
      return null;
    }
    return {
      appliedAt: analysis.appliedAt?.toISOString() ?? null,
      confidence: analysis.confidence,
      createdAt: analysis.createdAt.toISOString(),
      id: analysis.id,
      model: analysis.model,
      provider: 'kimi' as const,
      rationale: analysis.rationale,
      suggestedCategoryName: analysis.suggestedCategoryName,
      suggestedProjectName: analysis.suggestedProjectName,
      suggestedTagNames: stringArray(analysis.suggestedTagNames),
    };
  }

  async applySuggestions(linkId: string, input: ApplyAiSuggestionsInput) {
    const analysis = await this.prisma.aiAnalysis.findFirst({
      where: { id: input.analysisId, linkId },
    });
    if (!analysis) {
      throw new NotFoundException({
        code: 'AI_ANALYSIS_NOT_FOUND',
        message: '未找到该链接的 AI 识别记录。',
      });
    }
    const allowedTags = new Map(
      stringArray(analysis.suggestedTagNames).map((name) => [
        normalizeName(name),
        name,
      ]),
    );
    const requestedTags = [
      ...new Set(input.tagNames.map((name) => name.trim())),
    ]
      .filter(Boolean)
      .map((name) => allowedTags.get(normalizeName(name)))
      .filter((name): name is string => Boolean(name));
    if (
      requestedTags.length !== new Set(input.tagNames.map(normalizeName)).size
    ) {
      throw new BadRequestException({
        code: 'INVALID_AI_SUGGESTION',
        message: '只能应用当前 AI 识别记录中的建议。',
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      const project =
        input.applyProject && analysis.suggestedProjectName
          ? await transaction.project.upsert({
              create: {
                name: analysis.suggestedProjectName,
                normalizedName: normalizeName(analysis.suggestedProjectName),
              },
              update: {},
              where: {
                normalizedName: normalizeName(analysis.suggestedProjectName),
              },
            })
          : null;
      const category =
        input.applyCategory && analysis.suggestedCategoryName
          ? await transaction.category.upsert({
              create: {
                name: analysis.suggestedCategoryName,
                normalizedName: normalizeName(analysis.suggestedCategoryName),
              },
              update: {},
              where: {
                normalizedName: normalizeName(analysis.suggestedCategoryName),
              },
            })
          : null;
      const tags = await Promise.all(
        requestedTags.map((name) =>
          transaction.tag.upsert({
            create: { name, normalizedName: normalizeName(name) },
            update: {},
            where: { normalizedName: normalizeName(name) },
          }),
        ),
      );
      await transaction.link.update({
        data: {
          categoryId: category?.id,
          projectId: project?.id,
          tags: tags.length
            ? {
                connectOrCreate: tags.map(({ id }) => ({
                  create: { tagId: id },
                  where: { linkId_tagId: { linkId, tagId: id } },
                })),
              }
            : undefined,
        },
        where: { id: linkId },
      });
      await transaction.aiAnalysis.update({
        data: {
          appliedAt: new Date(),
          appliedResult: {
            ...(analysis.appliedResult as Prisma.JsonObject),
            confirmedSuggestionIds: {
              categoryId: category?.id ?? null,
              projectId: project?.id ?? null,
              tagIds: tags.map(({ id }) => id),
            },
          },
        },
        where: { id: analysis.id },
      });
    });
  }

  private async requireApiKey(
    settingsInput?: Awaited<
      ReturnType<PrismaService['aiSettings']['findUnique']>
    >,
  ): Promise<string> {
    const settings =
      settingsInput === undefined
        ? await this.prisma.aiSettings.findUnique({
            where: { id: SETTINGS_ID },
          })
        : settingsInput;
    if (
      !settings?.apiKeyCiphertext ||
      !settings.apiKeyIv ||
      !settings.apiKeyAuthTag
    ) {
      throw new ServiceUnavailableException({
        code: 'AI_NOT_CONFIGURED',
        message: '请先在 AI 设置中保存 Kimi API Key。',
      });
    }
    try {
      return this.crypto.decrypt({
        authTag: settings.apiKeyAuthTag,
        ciphertext: settings.apiKeyCiphertext,
        iv: settings.apiKeyIv,
      });
    } catch {
      throw new ServiceUnavailableException({
        code: 'AI_KEY_DECRYPT_FAILED',
        message: '无法读取已保存的 Kimi API Key，请重新配置。',
      });
    }
  }

  private async safeListModels(apiKey: string): Promise<AiModel[]> {
    try {
      return await this.gateway.listModels(apiKey);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown) {
    if (error instanceof AiGatewayError) {
      if (error.code === 'auth') {
        return new BadRequestException({
          code: 'AI_API_KEY_INVALID',
          message: 'Kimi API Key 无效。',
        });
      }
      return new BadGatewayException({
        code:
          error.code === 'rateLimit'
            ? 'AI_RATE_LIMITED'
            : error.code === 'response'
              ? 'AI_INVALID_RESPONSE'
              : 'AI_PROVIDER_UNAVAILABLE',
        message: error.message,
      });
    }
    return new BadGatewayException({
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: 'Kimi 服务暂时不可用。',
    });
  }
}
