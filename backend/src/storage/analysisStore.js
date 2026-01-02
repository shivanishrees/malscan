import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AnalysisStore {
  constructor() {
    // In-memory store for active analyses
    this.activeAnalyses = new Map();
    
    // Path to JSON storage
    this.dataDir = path.join(__dirname, '../../data/analyses');
    
    // TTL for cleanup (1 hour)
    this.ttl = 3600000;
    
    // Start cleanup job
    this.startCleanupJob();
  }

  /**
   * Create a new analysis entry
   */
  async create(analysisData) {
    const analysisWithTTL = {
      ...analysisData,
      ttl: Date.now() + this.ttl
    };

    // Store in memory
    this.activeAnalyses.set(analysisData.analysis_id, analysisWithTTL);

    // Persist to JSON (async, non-blocking)
    this.persistToJSON(analysisData.analysis_id, analysisData).catch(err => {
      console.error(`Failed to persist analysis ${analysisData.analysis_id}:`, err);
    });

    return analysisData;
  }

  /**
   * Update existing analysis
   */
  async update(analysisId, updates) {
    const existing = this.activeAnalyses.get(analysisId);
    
    if (!existing) {
      // Try loading from JSON
      const fromJSON = await this.loadFromJSON(analysisId);
      if (!fromJSON) {
        throw new Error(`Analysis not found: ${analysisId}`);
      }
      existing.data = fromJSON;
    }

    const updated = {
      ...existing,
      ...updates,
      ttl: Date.now() + this.ttl // Refresh TTL
    };

    this.activeAnalyses.set(analysisId, updated);

    // Update JSON
    this.persistToJSON(analysisId, updated).catch(err => {
      console.error(`Failed to update analysis ${analysisId}:`, err);
    });

    return updated;
  }

  /**
   * Get analysis by ID
   */
  async get(analysisId) {
    // Check in-memory first
    if (this.activeAnalyses.has(analysisId)) {
      return this.activeAnalyses.get(analysisId);
    }

    // Try loading from JSON
    const fromJSON = await this.loadFromJSON(analysisId);
    if (fromJSON) {
      // Load back into memory
      this.activeAnalyses.set(analysisId, {
        ...fromJSON,
        ttl: Date.now() + this.ttl
      });
      return fromJSON;
    }

    return null;
  }

  /**
   * Delete analysis
   */
  async delete(analysisId) {
    this.activeAnalyses.delete(analysisId);
    
    try {
      const filePath = path.join(this.dataDir, `${analysisId}.json`);
      await fs.unlink(filePath);
    } catch (err) {
      // File might not exist, ignore
    }
  }

  /**
   * Persist analysis to JSON file
   */
  async persistToJSON(analysisId, data) {
    try {
      const filePath = path.join(this.dataDir, `${analysisId}.json`);
      
      // Remove TTL before saving
      const { ttl, ...dataToSave } = data;
      
      await fs.writeFile(
        filePath,
        JSON.stringify(dataToSave, null, 2),
        'utf-8'
      );
    } catch (err) {
      throw new Error(`Failed to persist to JSON: ${err.message}`);
    }
  }

  /**
   * Load analysis from JSON file
   */
  async loadFromJSON(analysisId) {
    try {
      const filePath = path.join(this.dataDir, `${analysisId}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  /**
   * Start automatic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [id, analysis] of this.activeAnalyses) {
        if (analysis.ttl < now) {
          this.activeAnalyses.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired analyses from memory`);
      }

      // Clean old JSON files
      this.cleanOldJSONFiles().catch(err => {
        console.error('Error cleaning old JSON files:', err);
      });
    }, 900000); // Every 15 minutes
  }

  /**
   * Clean JSON files older than 24 hours
   */
  async cleanOldJSONFiles() {
    try {
      const files = await fs.readdir(this.dataDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.dataDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} old JSON files`);
      }
    } catch (err) {
      console.error('Error during JSON cleanup:', err);
    }
  }

  /**
   * Graceful shutdown - flush all to JSON
   */
  async shutdown() {
    console.log('Flushing in-memory analyses to JSON...');
    const promises = [];

    for (const [id, analysis] of this.activeAnalyses) {
      promises.push(this.persistToJSON(id, analysis));
    }

    await Promise.allSettled(promises);
    console.log('Shutdown complete');
  }

  /**
   * Get store statistics
   */
  getStats() {
    return {
      active_analyses: this.activeAnalyses.size,
      memory_usage: process.memoryUsage()
    };
  }
}

// Export singleton instance
export default new AnalysisStore();
