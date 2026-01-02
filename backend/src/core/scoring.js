import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScoringEngine {
  constructor() {
    this.config = null;
    this.loadConfig();
  }

  /**
   * Load scoring configuration
   */
  async loadConfig() {
    try {
      const configPath = path.join(__dirname, '../../data/config/scoring_config.json');
      const data = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(data);
      console.log('Scoring configuration loaded successfully');
    } catch (err) {
      console.error('Failed to load scoring config:', err);
      // Use default config
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      modules: {
        static_analysis: { weight: 0.35, critical: true },
        threat_intelligence: { weight: 0.40, critical: true },
        behavioral_analysis: { weight: 0.25, critical: false }
      },
      thresholds: {
        safe_max: 30,
        suspicious_min: 31,
        suspicious_max: 60,
        malicious_min: 61
      },
      confidence: {
        minimum_required: 0.3,
        critical_module_penalty: 0.2,
        non_critical_module_penalty: 0.05
      }
    };
  }

  /**
   * Calculate risk score from module results
   * @param {Object} moduleResults - Map of module_name -> module output
   * @returns {Object} { risk_score, confidence, verdict, explanation }
   */
  calculateRiskScore(moduleResults) {
    if (!this.config) {
      throw new Error('Scoring configuration not loaded');
    }

    const { modules: moduleConfig, thresholds, confidence: confidenceConfig } = this.config;

    // Step 1: Calculate weighted sum
    let weightedSum = 0;
    let totalActiveWeight = 0;
    let missingCriticalModules = 0;
    let missingNonCriticalModules = 0;
    const completedModules = [];
    const criticalFlags = [];

    for (const [moduleName, moduleConfig] of Object.entries(moduleConfig)) {
      if (!moduleConfig.enabled) continue;

      const moduleResult = moduleResults[moduleName];

      if (moduleResult && moduleResult.status === 'COMPLETED' && moduleResult.risk_score !== null) {
        // Module completed successfully
        weightedSum += moduleResult.risk_score * moduleConfig.weight;
        totalActiveWeight += moduleConfig.weight;
        completedModules.push(moduleName);

        // Collect critical flags
        if (moduleResult.flags) {
          criticalFlags.push(...moduleResult.flags);
        }
      } else {
        // Module missing, failed, or timed out
        if (moduleConfig.critical) {
          missingCriticalModules++;
        } else {
          missingNonCriticalModules++;
        }
      }
    }

    // Step 2: Normalize risk score
    let normalizedRiskScore = null;
    if (totalActiveWeight > 0) {
      normalizedRiskScore = Math.round(weightedSum / totalActiveWeight);
    }

    // Step 3: Calculate confidence
    const totalConfiguredWeight = Object.values(moduleConfig)
      .filter(m => m.enabled)
      .reduce((sum, m) => sum + m.weight, 0);

    let baseConfidence = totalActiveWeight / totalConfiguredWeight;
    let confidence = baseConfidence
      - (missingCriticalModules * confidenceConfig.critical_module_penalty)
      - (missingNonCriticalModules * confidenceConfig.non_critical_module_penalty);

    confidence = Math.max(0, Math.min(1, confidence)); // Clamp between 0 and 1

    // Step 4: Determine verdict
    const verdict = this.determineVerdict(
      normalizedRiskScore,
      confidence,
      criticalFlags,
      confidenceConfig.minimum_required,
      thresholds
    );

    // Step 5: Generate explanation
    const explanation = this.generateExplanation(
      verdict,
      normalizedRiskScore,
      confidence,
      completedModules,
      criticalFlags
    );

    return {
      risk_score: normalizedRiskScore,
      confidence: parseFloat(confidence.toFixed(2)),
      verdict,
      explanation,
      flags: [...new Set(criticalFlags)], // Remove duplicates
      module_summary: {
        completed: completedModules.length,
        total: Object.values(moduleConfig).filter(m => m.enabled).length,
        missing_critical: missingCriticalModules,
        missing_non_critical: missingNonCriticalModules
      }
    };
  }

  /**
   * Determine verdict based on risk score and confidence
   */
  determineVerdict(riskScore, confidence, criticalFlags, minConfidence, thresholds) {
    // Check for critical flags that override score
    const criticalFlagKeywords = ['malicious', 'trojan', 'ransomware', 'virus'];
    const hasCriticalFlag = criticalFlags.some(flag =>
      criticalFlagKeywords.some(keyword => flag.toLowerCase().includes(keyword))
    );

    if (hasCriticalFlag) {
      return 'MALICIOUS';
    }

    // Insufficient confidence
    if (riskScore === null || confidence < minConfidence) {
      return 'UNKNOWN';
    }

    // Apply threshold-based verdict
    if (riskScore >= 0 && riskScore <= thresholds.safe_max) {
      return 'SAFE';
    } else if (riskScore >= thresholds.suspicious_min && riskScore <= thresholds.suspicious_max) {
      return 'SUSPICIOUS';
    } else if (riskScore >= thresholds.malicious_min) {
      return 'MALICIOUS';
    }

    return 'UNKNOWN';
  }

  /**
   * Generate human-readable explanation
   */
  generateExplanation(verdict, riskScore, confidence, completedModules, flags) {
    const explanations = {
      SAFE: `File appears safe based on analysis. Risk score: ${riskScore}/100. No significant threats detected across ${completedModules.length} analysis module(s).`,
      SUSPICIOUS: `File shows suspicious characteristics. Risk score: ${riskScore}/100. Exercise caution. Detected ${flags.length} indicator(s) across ${completedModules.length} analysis module(s).`,
      MALICIOUS: `High-risk file detected. Risk score: ${riskScore}/100. Multiple threat indicators found across ${completedModules.length} analysis module(s). DO NOT open this file.`,
      UNKNOWN: confidence < 0.3
        ? `Insufficient data to determine risk. Analysis incomplete. Confidence: ${(confidence * 100).toFixed(0)}%. Treat as untrusted until full analysis completes.`
        : `Unable to determine risk level. No analysis data available. File should be treated as untrusted by default.`
    };

    return explanations[verdict] || explanations.UNKNOWN;
  }

  /**
   * Get module configuration
   */
  getModuleConfig() {
    return this.config?.modules || {};
  }

  /**
   * Get thresholds
   */
  getThresholds() {
    return this.config?.thresholds || {};
  }
}

// Export singleton instance
export default new ScoringEngine();
