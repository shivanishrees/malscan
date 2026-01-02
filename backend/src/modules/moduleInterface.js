/**
 * Module Interface Contract
 * All analysis modules MUST implement this interface
 */

/**
 * Input schema for analysis modules
 * @typedef {Object} ModuleInput
 * @property {string} analysis_id - UUID for tracking
 * @property {string} file_hash - SHA-256 hash of the file
 * @property {string} file_name - Original filename
 * @property {number} file_size - File size in bytes
 * @property {string} file_type - MIME type
 * @property {Object} [metadata] - Optional contextual data
 */

/**
 * Output schema for analysis modules
 * @typedef {Object} ModuleOutput
 * @property {string} module_name - Identifier (e.g., "static_analysis")
 * @property {'COMPLETED'|'FAILED'|'TIMEOUT'} status - Execution status
 * @property {number|null} risk_score - Risk score 0-100, null if failed
 * @property {number} confidence - Confidence level 0.0-1.0
 * @property {string[]} flags - Array of detected indicators
 * @property {Object} [details] - Module-specific data
 * @property {number} execution_time_ms - Execution time in milliseconds
 * @property {string} [error_message] - Error message if status is FAILED
 */

/**
 * Base class for analysis modules
 */
export class AnalysisModule {
  constructor(moduleName, config = {}) {
    this.moduleName = moduleName;
    this.config = config;
  }

  /**
   * Execute the analysis
   * @param {ModuleInput} input - Input parameters
   * @returns {Promise<ModuleOutput>} Analysis result
   */
  async execute(input) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Validate input
   * @param {ModuleInput} input
   * @returns {boolean}
   */
  validateInput(input) {
    const required = ['analysis_id', 'file_hash', 'file_name', 'file_size', 'file_type'];
    return required.every(field => input[field] !== undefined && input[field] !== null);
  }

  /**
   * Create a standardized output
   */
  createOutput(status, riskScore, confidence, flags, details = null, errorMessage = null) {
    return {
      module_name: this.moduleName,
      status,
      risk_score: riskScore,
      confidence,
      flags: flags || [],
      details,
      execution_time_ms: 0, // Will be set by orchestrator
      error_message: errorMessage
    };
  }
}

/**
 * Module registry for dynamic registration
 */
class ModuleRegistry {
  constructor() {
    this.modules = new Map();
  }

  /**
   * Register a module
   * @param {string} moduleName
   * @param {AnalysisModule} moduleInstance
   */
  register(moduleName, moduleInstance) {
    if (!(moduleInstance instanceof AnalysisModule)) {
      throw new Error('Module must extend AnalysisModule base class');
    }
    this.modules.set(moduleName, moduleInstance);
    console.log(`Module registered: ${moduleName}`);
  }

  /**
   * Unregister a module
   */
  unregister(moduleName) {
    this.modules.delete(moduleName);
    console.log(`Module unregistered: ${moduleName}`);
  }

  /**
   * Get a module by name
   */
  get(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Get all registered modules
   */
  getAll() {
    return Array.from(this.modules.values());
  }

  /**
   * Get all module names
   */
  getModuleNames() {
    return Array.from(this.modules.keys());
  }

  /**
   * Check if module is registered
   */
  has(moduleName) {
    return this.modules.has(moduleName);
  }
}

// Export singleton registry
export const moduleRegistry = new ModuleRegistry();
