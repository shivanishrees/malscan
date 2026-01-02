import { AnalysisModule } from './moduleInterface.js';
import { StaticFileAnalysis } from "./static_file_analysis/staticAnalysis.js";

/**
 * Mock Static Analysis Module
 * Simulates file structure and entropy analysis
 */


/**
 * Mock Threat Intelligence Module
 * Simulates external threat database lookup
 */
export class MockThreatIntelligence extends AnalysisModule {
  constructor() {
    super('threat_intelligence');
  }

  async execute(input) {
    if (!this.validateInput(input)) {
      return this.createOutput('FAILED', null, 0, [], null, 'Invalid input');
    }

    // Simulate API call delay
    await this.delay(800);

    const { file_hash, file_name } = input;

    // Mock threat database lookup
    const knownThreats = [
      'malicious',
      'trojan',
      'virus',
      'ransomware',
      'dangerous'
    ];

    const isMalicious = knownThreats.some(threat => 
      file_name.toLowerCase().includes(threat)
    );

    let riskScore = 5;
    const flags = [];

    if (isMalicious) {
      riskScore = 90;
      flags.push('known_malicious_signature');
      flags.push('threat_db_match');
    } else {
      // Random community reputation
      const reputation = Math.random();
      if (reputation < 0.3) {
        riskScore = 50;
        flags.push('poor_community_reputation');
      } else if (reputation < 0.6) {
        riskScore = 25;
        flags.push('unknown_reputation');
      }
    }

    return this.createOutput(
      'COMPLETED',
      riskScore,
      0.90,
      flags,
      {
        database_version: '2025.12.21',
        total_sources: 4,
        detection_count: flags.length
      }
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Mock Behavioral Analysis Module
 * Simulates runtime behavior analysis
 */
export class MockBehavioralAnalysis extends AnalysisModule {
  constructor() {
    super('behavioral_analysis');
  }

  async execute(input) {
    if (!this.validateInput(input)) {
      return this.createOutput('FAILED', null, 0, [], null, 'Invalid input');
    }

    // Simulate longer processing time
    await this.delay(1500);

    const { file_type, file_name } = input;

    let riskScore = 15;
    const flags = [];

    // Check for suspicious patterns
    if (file_name.includes('crack') || file_name.includes('keygen')) {
      riskScore += 40;
      flags.push('suspicious_filename_pattern');
    }

    // Mock sandbox execution results
    const behaviors = [
      'file_system_access',
      'network_activity',
      'registry_modification',
      'process_creation'
    ];

    const suspiciousBehaviors = behaviors.filter(() => Math.random() > 0.7);
    
    if (suspiciousBehaviors.length > 0) {
      riskScore += suspiciousBehaviors.length * 15;
      flags.push(...suspiciousBehaviors.map(b => `behavior_${b}`));
    }

    return this.createOutput(
      'COMPLETED',
      Math.min(riskScore, 100),
      0.75,
      flags,
      {
        sandbox_time: '5s',
        behaviors_detected: suspiciousBehaviors.length,
        api_calls_monitored: 234
      }
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Register all mock modules
 */
export function registerMockModules(registry) {
registry.register('static_analysis', new StaticFileAnalysis());
  registry.register('threat_intelligence', new MockThreatIntelligence());
  registry.register('behavioral_analysis', new MockBehavioralAnalysis());
  console.log('All mock modules registered');
}
