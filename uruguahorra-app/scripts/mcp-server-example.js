#!/usr/bin/env node

/**
 * Basic MCP Server Example for UruguAhorra Voice Transactions
 * 
 * This is a simple example of how to implement an MCP server
 * that the voice transaction system can communicate with.
 * 
 * Install dependencies:
 * npm install express cors helmet compression morgan
 * 
 * Run:
 * node scripts/mcp-server-example.js
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.MCP_PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Mock database (in production, connect to your actual database)
const mockCategories = [
  { id: '1', name: 'Alimentación', emoji: '🍽️', type: 'expense', color: '#FF6B6B' },
  { id: '2', name: 'Transporte', emoji: '🚗', type: 'expense', color: '#4ECDC4' },
  { id: '3', name: 'Entretenimiento', emoji: '🎬', type: 'expense', color: '#45B7D1' },
  { id: '4', name: 'Salario', emoji: '💰', type: 'income', color: '#96CEB4' },
  { id: '5', name: 'Freelance', emoji: '💻', type: 'income', color: '#FCEA2B' },
  { id: '6', name: 'Supermercado', emoji: '🛒', type: 'expense', color: '#FF9FF3' },
  { id: '7', name: 'Farmacia', emoji: '💊', type: 'expense', color: '#A8E6CF' },
  { id: '8', name: 'Ropa', emoji: '👕', type: 'expense', color: '#FFB3BA' },
];

let mockTransactions = [];
let transactionIdCounter = 1;

// Health check endpoint
app.get('/mcp/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['create_expense', 'create_income', 'get_categories', 'get_user_stats']
  });
});

// Get available tools
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'create_expense',
        description: 'Create a new expense transaction',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID' },
            amount: { type: 'number', description: 'Amount' },
            description: { type: 'string', description: 'Description' },
            category_id: { type: 'string', description: 'Category ID' },
            category_name: { type: 'string', description: 'Category name' }
          },
          required: ['user_id', 'amount']
        }
      },
      {
        name: 'create_income',
        description: 'Create a new income transaction',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID' },
            amount: { type: 'number', description: 'Amount' },
            description: { type: 'string', description: 'Description' },
            category_id: { type: 'string', description: 'Category ID' },
            category_name: { type: 'string', description: 'Category name' }
          },
          required: ['user_id', 'amount']
        }
      },
      {
        name: 'get_categories',
        description: 'Get transaction categories',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['expense', 'income'], description: 'Filter by type' }
          }
        }
      },
      {
        name: 'get_user_stats',
        description: 'Get user statistics',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User ID' },
            period: { type: 'string', enum: ['week', 'month', 'year'], description: 'Time period' }
          },
          required: ['user_id']
        }
      }
    ]
  });
});

// Create expense transaction
app.post('/mcp/tools/create_expense', (req, res) => {
  try {
    const { arguments: args } = req.body;
    const { user_id, amount, description, category_id, category_name, notes, location } = args;

    if (!user_id || !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ARGS', message: 'user_id and amount are required' }
      });
    }

    // Find category
    let category = null;
    if (category_id) {
      category = mockCategories.find(c => c.id === category_id);
    } else if (category_name) {
      category = mockCategories.find(c => 
        c.name.toLowerCase().includes(category_name.toLowerCase()) && c.type === 'expense'
      );
    }

    const transaction = {
      id: (transactionIdCounter++).toString(),
      user_id,
      amount: Math.abs(amount),
      type: 'expense',
      description: description || 'Gasto por voz',
      category_id: category?.id || null,
      category_name: category?.name || category_name || 'Sin categoría',
      category_emoji: category?.emoji || '💳',
      notes,
      location,
      transaction_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    mockTransactions.push(transaction);

    console.log(`📤 Created expense: $${amount} - ${description || 'Gasto por voz'}`);

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Create income transaction
app.post('/mcp/tools/create_income', (req, res) => {
  try {
    const { arguments: args } = req.body;
    const { user_id, amount, description, category_id, category_name, notes, source } = args;

    if (!user_id || !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ARGS', message: 'user_id and amount are required' }
      });
    }

    // Find category
    let category = null;
    if (category_id) {
      category = mockCategories.find(c => c.id === category_id);
    } else if (category_name) {
      category = mockCategories.find(c => 
        c.name.toLowerCase().includes(category_name.toLowerCase()) && c.type === 'income'
      );
    }

    const transaction = {
      id: (transactionIdCounter++).toString(),
      user_id,
      amount: Math.abs(amount),
      type: 'income',
      description: description || 'Ingreso por voz',
      category_id: category?.id || null,
      category_name: category?.name || category_name || 'Ingresos varios',
      category_emoji: category?.emoji || '💰',
      notes,
      source,
      transaction_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };

    mockTransactions.push(transaction);

    console.log(`📥 Created income: $${amount} - ${description || 'Ingreso por voz'}`);

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Get categories
app.post('/mcp/tools/get_categories', (req, res) => {
  try {
    const { arguments: args } = req.body || {};
    const { type } = args || {};

    let categories = mockCategories;
    
    if (type) {
      categories = mockCategories.filter(c => c.type === type);
    }

    console.log(`📋 Retrieved ${categories.length} categories${type ? ` (type: ${type})` : ''}`);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Get user stats
app.post('/mcp/tools/get_user_stats', (req, res) => {
  try {
    const { arguments: args } = req.body;
    const { user_id, period = 'month' } = args;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ARGS', message: 'user_id is required' }
      });
    }

    const userTransactions = mockTransactions.filter(t => t.user_id === user_id);
    
    const stats = {
      user_id,
      period,
      total_transactions: userTransactions.length,
      total_expenses: userTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      total_income: userTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      balance: userTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) -
               userTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      categories_used: [...new Set(userTransactions.map(t => t.category_name))],
      last_transaction: userTransactions[userTransactions.length - 1] || null
    };

    console.log(`📊 Retrieved stats for user ${user_id} (${period}): ${userTransactions.length} transactions`);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
});

// Get all transactions (for debugging)
app.get('/mcp/debug/transactions', (req, res) => {
  res.json({
    transactions: mockTransactions,
    total: mockTransactions.length
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎤 MCP Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/mcp/health`);
  console.log(`🔧 Available tools: http://localhost:${PORT}/mcp/tools`);
  console.log(`🐛 Debug transactions: http://localhost:${PORT}/mcp/debug/transactions`);
  console.log('');
  console.log('Ready to process voice transactions! 🎯');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});