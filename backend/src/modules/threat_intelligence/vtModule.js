import { queryVirusTotal } from "./virusTotalService.js";
import { parseVTResult } from "./vtParser.js";

const vtModule = {
  moduleName: "virus_total",

  async execute(input) {
    const start = Date.now();

    try {
      const vtData = await queryVirusTotal(input.file_hash);

      if (vtData.notFound) {
        return {
          module_name: this.moduleName,
          status: "NOT_FOUND",
          risk_score: 10,
          confidence: 0.3,
          flags: ["VT_NO_RECORD"],
          explanation: "File hash not found in VirusTotal database",
          execution_time_ms: Date.now() - start
        };
      }

      const parsed = parseVTResult(vtData);

      let riskScore = 0;
      let flags = [];
      let explanation = "No known malicious detections";

      if (parsed.malicious >= 10) {
        riskScore = 90;
        flags.push("VT_HIGH_MALWARE");
        explanation = "Multiple antivirus engines detect this file as malicious";
      } else if (parsed.suspicious > 0) {
        riskScore = 50;
        flags.push("VT_SUSPICIOUS");
        explanation = "Some antivirus engines flagged this file as suspicious";
      }

      return {
        module_name: this.moduleName,
        status: "COMPLETED",
        risk_score: riskScore,
        confidence: parsed.confidence / 100,
        flags,
        explanation,
        engine_hits: parsed,
        execution_time_ms: Date.now() - start
      };

    } catch (err) {
      return {
        module_name: this.moduleName,
        status: "FAILED",
        risk_score: null,
        confidence: 0,
        flags: ["VT_ERROR"],
        error_message: err.message,
        execution_time_ms: Date.now() - start
      };
    }
  }
};

export default vtModule;
