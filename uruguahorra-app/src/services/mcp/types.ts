export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, MCPParameter>;
    required?: string[];
  };
}

export interface MCPParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: any[];
  items?: MCPParameter;
  properties?: Record<string, MCPParameter>;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  toolUsed?: string;
}

export interface MCPServerConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  enableFallback: boolean;
}

export interface TransactionMCPTools {
  create_expense: MCPTool;
  create_income: MCPTool;
  get_categories: MCPTool;
  get_user_stats: MCPTool;
}

export interface CreateExpenseArgs {
  user_id: string;
  amount: number;
  description?: string;
  category_id?: string;
  category_name?: string;
  notes?: string;
  location?: string;
}

export interface CreateIncomeArgs {
  user_id: string;
  amount: number;
  description?: string;
  category_id?: string;
  category_name?: string;
  notes?: string;
  source?: string;
}

export interface GetCategoriesArgs {
  type?: 'expense' | 'income' | 'transfer';
}

export interface GetUserStatsArgs {
  user_id: string;
  period?: 'week' | 'month' | 'year';
}

export const MCP_TOOLS: TransactionMCPTools = {
  create_expense: {
    name: 'create_expense',
    description: 'Create a new expense transaction for the user',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'ID of the user creating the expense',
        },
        amount: {
          type: 'number',
          description: 'Amount of the expense (must be positive)',
        },
        description: {
          type: 'string',
          description: 'Description of the expense',
        },
        category_id: {
          type: 'string',
          description: 'ID of the expense category',
        },
        category_name: {
          type: 'string',
          description:
            'Name of the expense category if category_id is not provided',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the expense',
        },
        location: {
          type: 'string',
          description: 'Location where the expense occurred',
        },
      },
      required: ['user_id', 'amount'],
    },
  },

  create_income: {
    name: 'create_income',
    description: 'Create a new income transaction for the user',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'ID of the user creating the income',
        },
        amount: {
          type: 'number',
          description: 'Amount of the income (must be positive)',
        },
        description: {
          type: 'string',
          description: 'Description of the income source',
        },
        category_id: {
          type: 'string',
          description: 'ID of the income category',
        },
        category_name: {
          type: 'string',
          description:
            'Name of the income category if category_id is not provided',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the income',
        },
        source: {
          type: 'string',
          description: 'Source of the income (employer, client, etc.)',
        },
      },
      required: ['user_id', 'amount'],
    },
  },

  get_categories: {
    name: 'get_categories',
    description: 'Get available transaction categories',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter categories by type',
          enum: ['expense', 'income', 'transfer'],
        },
      },
      required: [],
    },
  },

  get_user_stats: {
    name: 'get_user_stats',
    description: 'Get user financial statistics',
    parameters: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'ID of the user',
        },
        period: {
          type: 'string',
          description: 'Time period for statistics',
          enum: ['week', 'month', 'year'],
        },
      },
      required: ['user_id'],
    },
  },
};
