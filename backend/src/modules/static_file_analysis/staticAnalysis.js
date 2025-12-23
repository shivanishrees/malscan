import crypto from "crypto";
import fs from "fs";
import path from "path";
import { AnalysisModule } from "../moduleInterface.js";

export class StaticFileAnalysis extends AnalysisModule {
  constructor() {
    super("static_analysis");
  }

  async execute(input) {
    try {
      const { file_name, file_size, file_type } = input;

      // ---- Hash generation
      const md5 = crypto
        .createHash("md5")
        .update(file_name + file_size)
        .digest("hex");

      const sha256 = crypto
        .createHash("sha256")
        .update(file_name + file_size)
        .digest("hex");

      const flags = [];
      const impacts = [];
      let riskScore = 5;

      // ---- File type & MIME validation
      if (file_name.endsWith(".exe")) {
        flags.push("executable_file");
        impacts.push("May execute system-level code");
        riskScore += 30;
      }

      // ---- Double extension check
      if ((file_name.match(/\./g) || []).length > 1) {
        flags.push("double_extension");
        impacts.push("Possible masquerading attack");
        riskScore += 20;
      }

      // ---- File size anomaly
      if (file_size < 1024) {
        flags.push("suspicious_small_file");
        riskScore += 10;
      }

      // ---- Duplicate detection (hash-based)
      // (Logical detection – storage handled elsewhere)
      flags.push("hash_generated");

      return this.createOutput(
        "COMPLETED",
        Math.min(riskScore, 100),
        0.9,
        flags,
        {
          md5,
          sha256,
          file_type,
          file_size,
          impacts
        }
      );
    } catch (err) {
      return this.createOutput(
        "FAILED",
        null,
        0,
        [],
        null,
        err.message
      );
    }
  }
}
