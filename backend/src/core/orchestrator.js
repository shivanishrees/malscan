import { v4 as uuidv4 } from 'uuid';
import analysisStore from '../storage/analysisStore.js';
import scoringEngine from './scoring.js';
import { moduleRegistry } from '../modules/moduleInterface.js';

class Orchestrator {
  constructor() {
    this.activeExecutions = new Map();
  }

  /**
   * Initiate a new file analysis
   * @param {Object} fileData - File metadata
   * @returns {Object} Initial analysis response
   */
  async initiateAnalysis(fileData) {
    // Generate unique analysis ID
    const analysisId = uuidv4();
    const now = new Date().toISOString();

    // Initialize Zero Trust state
    const initialAnalysis = {
      analysis_id: analysisId,
      file_reference: {
        file_hash: fileData.file_hash,
        file_name: fileData.file_name,
        file_size: fileData.file_size,
        file_type: fileData.file_type
      },
      analysis_status: 'PENDING',
      risk_score: null,
      confidence: 0.0,
      verdict: 'UNKNOWN',
      explanation: 'Analysis initiated. File is untrusted until analysis completes.',
      flags: [],
      module_results: {},
      timestamps: {
        initiated_at: now,
        completed_at: null
      }
    };

    // Store in database
    await analysisStore.create(initialAnalysis);

    // Start analysis execution asynchronously
    this.executeAnalysis(analysisId, fileData).catch(err => {
      console.error(`Analysis ${analysisId} failed:`, err);
    });

    return {
      success: true,
      analysis_id: analysisId,
      status: 'PENDING',
      message: 'Analysis initiated'
    };
  }

  /**
   * Execute analysis across all registered modules
   * @param {string} analysisId
   * @param {Object} fileData
   */
  async executeAnalysis(analysisId, fileData) {
    try {
      // Update status to IN_PROGRESS
      await analysisStore.update(analysisId, {
        analysis_status: 'IN_PROGRESS'
      });

      // Prepare module input
      const moduleInput = {
        analysis_id: analysisId,
        file_hash: fileData.file_hash,
        file_name: fileData.file_name,
        file_size: fileData.file_size,
        file_type: fileData.file_type,
        metadata: fileData.metadata || {}
      };

      // Get module configuration
      const moduleConfig = scoringEngine.getModuleConfig();
      const registeredModules = moduleRegistry.getAll();

      // Execute modules in parallel with timeout handling
      const modulePromises = registeredModules.map(module => 
        this.executeModuleWithTimeout(
          module,
          moduleInput,
          moduleConfig[module.moduleName]?.timeout_ms || 30000
        )
      );

      const moduleResults = await Promise.allSettled(modulePromises);

      // Process module results
      const processedResults = {};
      for (let i = 0; i < registeredModules.length; i++) {
        const module = registeredModules[i];
        const result = moduleResults[i];

        if (result.status === 'fulfilled') {
          processedResults[module.moduleName] = result.value;
        } else {
          // Module failed
          processedResults[module.moduleName] = {
            module_name: module.moduleName,
            status: 'FAILED',
            risk_score: null,
            confidence: 0,
            flags: [],
            error_message: result.reason?.message || 'Unknown error',
            execution_time_ms: 0
          };
        }

        // Update analysis with partial results
        await this.updateAnalysisWithModuleResult(
          analysisId,
          module.moduleName,
          processedResults[module.moduleName]
        );
      }

      // Calculate final risk score and verdict
      const scoringResult = scoringEngine.calculateRiskScore(processedResults);

      // Update final analysis state
      await analysisStore.update(analysisId, {
        analysis_status: 'COMPLETED',
        risk_score: scoringResult.risk_score,
        confidence: scoringResult.confidence,
        verdict: scoringResult.verdict,
        explanation: scoringResult.explanation,
        flags: scoringResult.flags,
        module_results: processedResults,
        timestamps: {
          initiated_at: (await analysisStore.get(analysisId)).timestamps.initiated_at,
          completed_at: new Date().toISOString()
        }
      });

      console.log(`Analysis ${analysisId} completed: ${scoringResult.verdict}`);

    } catch (err) {
      console.error(`Error executing analysis ${analysisId}:`, err);

      // Mark analysis as failed
      await analysisStore.update(analysisId, {
        analysis_status: 'FAILED',
        verdict: 'UNKNOWN',
        explanation: 'Analysis failed due to internal error. File should be treated as untrusted.',
        timestamps: {
          initiated_at: (await analysisStore.get(analysisId)).timestamps.initiated_at,
          completed_at: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Execute a single module with timeout
   */
  async executeModuleWithTimeout(module, input, timeoutMs) {
    const startTime = Date.now();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Module ${module.moduleName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([
        module.execute(input),
        timeoutPromise
      ]);

      // Add execution time
      result.execution_time_ms = Date.now() - startTime;
      return result;

    } catch (err) {
      // Handle timeout or failure
      if (err.message.includes('timed out')) {
        return {
          module_name: module.moduleName,
          status: 'TIMEOUT',
          risk_score: null,
          confidence: 0,
          flags: [],
          error_message: err.message,
          execution_time_ms: Date.now() - startTime
        };
      }

      throw err;
    }
  }

  /**
   * Update analysis with individual module result
   */
  async updateAnalysisWithModuleResult(analysisId, moduleName, result) {
    try {
      const currentAnalysis = await analysisStore.get(analysisId);
      if (!currentAnalysis) return;

      const updatedModuleResults = {
        ...currentAnalysis.module_results,
        [moduleName]: result
      };

      await analysisStore.update(analysisId, {
        module_results: updatedModuleResults
      });

    } catch (err) {
      console.error(`Failed to update analysis ${analysisId} with module result:`, err);
    }
  }

  /**
   * Get analysis status and results
   */
  async getAnalysisStatus(analysisId) {
    const analysis = await analysisStore.get(analysisId);

    if (!analysis) {
      return {
        success: false,
        error: {
          code: 'ANALYSIS_NOT_FOUND',
          message: `No analysis found with ID: ${analysisId}`
        },
        timestamps: {
          error_at: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      ...analysis
    };
  }

  /**
   * Validate analysis request
   */
  validateAnalysisRequest(data) {
    const required = ['file_hash', 'file_name', 'file_size', 'file_type'];
    const missing = required.filter(field => !data[field]);

    if (missing.length > 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_REQUEST',
          message: `Missing required field: ${missing[0]}`,
          details: {
            field: missing[0],
            reason: 'required'
          }
        }
      };
    }

    // Validate data types
    if (typeof data.file_hash !== 'string' || data.file_hash.length < 32) {
      return {
        valid: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid file_hash format',
          details: {
            field: 'file_hash',
            reason: 'must be valid hash string'
          }
        }
      };
    }

    if (typeof data.file_size !== 'number' || data.file_size < 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid file_size',
          details: {
            field: 'file_size',
            reason: 'must be positive number'
          }
        }
      };
    }

    return { valid: true };
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      active_executions: this.activeExecutions.size,
      registered_modules: moduleRegistry.getModuleNames(),
      storage_stats: analysisStore.getStats()
    };
  }
}

// Export singleton instance
export default new Orchestrator();
