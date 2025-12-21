import express from 'express';
import cors from 'cors';
import orchestrator from './core/orchestrator.js';
import analysisStore from './storage/analysisStore.js';
import { moduleRegistry } from './modules/moduleInterface.js';
import { registerMockModules } from './modules/mockModules.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * POST /api/analyze
 * Initiate file analysis
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { file_hash, file_name, file_size, file_type, metadata } = req.body;

    // Validate request
    const validation = orchestrator.validateAnalysisRequest({
      file_hash,
      file_name,
      file_size,
      file_type
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
        timestamps: {
          error_at: new Date().toISOString()
        }
      });
    }

    // Initiate analysis
    const result = await orchestrator.initiateAnalysis({
      file_hash,
      file_name,
      file_size,
      file_type,
      metadata
    });

    res.status(202).json(result);

  } catch (err) {
    console.error('Error in POST /api/analyze:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORCHESTRATION_FAILURE',
        message: 'Internal system error during analysis orchestration'
      },
      timestamps: {
        error_at: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/status/:analysis_id
 * Get analysis status and results
 */
app.get('/api/status/:analysis_id', async (req, res) => {
  try {
    const { analysis_id } = req.params;

    const result = await orchestrator.getAnalysisStatus(analysis_id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);

  } catch (err) {
    console.error('Error in GET /api/status:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORCHESTRATION_FAILURE',
        message: 'Internal system error retrieving analysis status'
      },
      timestamps: {
        error_at: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/stats
 * Get system statistics (for monitoring)
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = orchestrator.getStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Error in GET /api/stats:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYSTEM_ERROR',
        message: 'Failed to retrieve system statistics'
      }
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`
    },
    timestamps: {
      error_at: new Date().toISOString()
    }
  });
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    },
    timestamps: {
      error_at: new Date().toISOString()
    }
  });
});

/**
 * Initialize and start server
 */
async function startServer() {
  try {
    console.log('🚀 Initializing MalScan Backend Orchestration Engine...');
    
    // Register mock analysis modules
    registerMockModules(moduleRegistry);
    
    // Wait for scoring config to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Registered modules: ${moduleRegistry.getModuleNames().join(', ')}`);
      console.log(`🔒 Zero Trust Policy: All files untrusted by default`);
      console.log('\nAPI Endpoints:');
      console.log(`  POST   http://localhost:${PORT}/api/analyze`);
      console.log(`  GET    http://localhost:${PORT}/api/status/:analysis_id`);
      console.log(`  GET    http://localhost:${PORT}/api/stats`);
      console.log(`  GET    http://localhost:${PORT}/health`);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    await analysisStore.shutdown();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    process.exit(1);
  }
}

// Start the server
startServer();
