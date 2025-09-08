import { logger, LogModule } from '@/utils/logger';
import { TransactionsService } from '@/services/transactions.service';
import { AI_CONFIG } from '@/config/ai.config';
import {
  MCPTool,
  MCPToolCall,
  MCPResponse,
  MCPServerConfig,
  MCP_TOOLS,
  CreateExpenseArgs,
  CreateIncomeArgs,
  GetCategoriesArgs,
  GetUserStatsArgs,
} from './types';

export class MCPService {
  private static readonly DEFAULT_CONFIG: MCPServerConfig = {
    baseUrl: AI_CONFIG.MCP_BASE_URL,
    timeout: AI_CONFIG.MCP_TIMEOUT,
    retryAttempts: 2,
    enableFallback: AI_CONFIG.MCP_FALLBACK_ENABLED,
  };

  private static config: MCPServerConfig = { ...this.DEFAULT_CONFIG };

  /**
   * Configure MCP service
   */
  static configure(config: Partial<MCPServerConfig>): void {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    logger.info(LogModule.TRANSACTIONS, 'MCP Service configured', this.config);
  }

  /**
   * Get available MCP tools
   */
  static getAvailableTools(): MCPTool[] {
    return Object.values(MCP_TOOLS);
  }

  /**
   * Execute an MCP tool call
   */
  static async executeTool(toolCall: MCPToolCall): Promise<MCPResponse> {
    try {
      logger.info(LogModule.TRANSACTIONS, 'Executing MCP tool', toolCall);

      // Check if MCP server is available
      const isServerAvailable = await this.checkServerHealth();

      if (!isServerAvailable && this.config.enableFallback) {
        logger.warn(
          LogModule.TRANSACTIONS,
          'MCP server unavailable, using fallback'
        );
        return await this.executeFallback(toolCall);
      }

      if (!isServerAvailable) {
        throw new Error('MCP server is unavailable and fallback is disabled');
      }

      // Execute tool on MCP server
      return await this.executeOnServer(toolCall);
    } catch (error) {
      logger.error(LogModule.TRANSACTIONS, 'Error executing MCP tool', error);

      // Try fallback if enabled
      if (this.config.enableFallback) {
        logger.info(LogModule.TRANSACTIONS, 'Attempting fallback execution');
        return await this.executeFallback(toolCall);
      }

      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
        },
      };
    }
  }

  /**
   * Create expense using MCP or fallback
   */
  static async createExpense(args: CreateExpenseArgs): Promise<MCPResponse> {
    const toolCall: MCPToolCall = {
      name: 'create_expense',
      arguments: args,
    };

    return await this.executeTool(toolCall);
  }

  /**
   * Create income using MCP or fallback
   */
  static async createIncome(args: CreateIncomeArgs): Promise<MCPResponse> {
    const toolCall: MCPToolCall = {
      name: 'create_income',
      arguments: args,
    };

    return await this.executeTool(toolCall);
  }

  /**
   * Get categories using MCP or fallback
   */
  static async getCategories(
    args: GetCategoriesArgs = {}
  ): Promise<MCPResponse> {
    const toolCall: MCPToolCall = {
      name: 'get_categories',
      arguments: args,
    };

    return await this.executeTool(toolCall);
  }

  /**
   * Get user stats using MCP or fallback
   */
  static async getUserStats(args: GetUserStatsArgs): Promise<MCPResponse> {
    const toolCall: MCPToolCall = {
      name: 'get_user_stats',
      arguments: args,
    };

    return await this.executeTool(toolCall);
  }

  /**
   * Check if MCP server is healthy
   */
  private static async checkServerHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      logger.warn(
        LogModule.TRANSACTIONS,
        'MCP server health check failed',
        error
      );
      return false;
    }
  }

  /**
   * Execute tool call on MCP server
   */
  private static async executeOnServer(
    toolCall: MCPToolCall
  ): Promise<MCPResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(
        `${this.config.baseUrl}/tools/${toolCall.name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            arguments: toolCall.arguments,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `MCP server responded with ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        data: result.data,
        toolUsed: `mcp:${toolCall.name}`,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Execute tool using fallback (direct service calls)
   */
  private static async executeFallback(
    toolCall: MCPToolCall
  ): Promise<MCPResponse> {
    try {
      logger.info(
        LogModule.TRANSACTIONS,
        'Executing fallback for tool',
        toolCall.name
      );

      switch (toolCall.name) {
        case 'create_expense':
          return await this.fallbackCreateExpense(
            toolCall.arguments as CreateExpenseArgs
          );

        case 'create_income':
          return await this.fallbackCreateIncome(
            toolCall.arguments as CreateIncomeArgs
          );

        case 'get_categories':
          return await this.fallbackGetCategories(
            toolCall.arguments as GetCategoriesArgs
          );

        case 'get_user_stats':
          return await this.fallbackGetUserStats(
            toolCall.arguments as GetUserStatsArgs
          );

        default:
          throw new Error(
            `Fallback not implemented for tool: ${toolCall.name}`
          );
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FALLBACK_FAILED',
          message:
            error instanceof Error
              ? error.message
              : 'Fallback execution failed',
          details: error,
        },
      };
    }
  }

  /**
   * Fallback implementation for create_expense
   */
  private static async fallbackCreateExpense(
    args: CreateExpenseArgs
  ): Promise<MCPResponse> {
    const transaction = await TransactionsService.createTransaction(
      args.user_id,
      {
        amount: args.amount,
        type: 'expense',
        description: args.description,
        category_id: args.category_id,
        category_name: args.category_name,
        notes: args.notes,
        location: args.location,
        transaction_date: new Date().toISOString().split('T')[0],
      }
    );

    return {
      success: true,
      data: transaction,
      toolUsed: 'fallback:create_expense',
    };
  }

  /**
   * Fallback implementation for create_income
   */
  private static async fallbackCreateIncome(
    args: CreateIncomeArgs
  ): Promise<MCPResponse> {
    const transaction = await TransactionsService.createTransaction(
      args.user_id,
      {
        amount: args.amount,
        type: 'income',
        description: args.description,
        category_id: args.category_id,
        category_name: args.category_name,
        notes: args.notes,
        transaction_date: new Date().toISOString().split('T')[0],
      }
    );

    return {
      success: true,
      data: transaction,
      toolUsed: 'fallback:create_income',
    };
  }

  /**
   * Fallback implementation for get_categories
   */
  private static async fallbackGetCategories(
    args: GetCategoriesArgs
  ): Promise<MCPResponse> {
    let categories;

    if (args.type) {
      categories = await TransactionsService.getCategoriesByType(args.type);
    } else {
      categories = await TransactionsService.getCategories();
    }

    return {
      success: true,
      data: categories,
      toolUsed: 'fallback:get_categories',
    };
  }

  /**
   * Fallback implementation for get_user_stats
   */
  private static async fallbackGetUserStats(
    args: GetUserStatsArgs
  ): Promise<MCPResponse> {
    // For now, return current balance as basic stats
    const balance = await TransactionsService.getCurrentBalance(args.user_id);

    return {
      success: true,
      data: {
        balance,
        period: args.period || 'month',
      },
      toolUsed: 'fallback:get_user_stats',
    };
  }

  /**
   * Validate tool arguments
   */
  private static validateArguments(toolName: string, args: any): boolean {
    const tool = MCP_TOOLS[toolName as keyof typeof MCP_TOOLS];
    if (!tool) {
      return false;
    }

    const required = tool.parameters.required || [];
    return required.every((field) => args[field] !== undefined);
  }
}
