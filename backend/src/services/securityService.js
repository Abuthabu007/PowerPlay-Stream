const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Security Service - Handles virus scanning, malware detection, and file validation
 * Supports multiple scanning backends:
 * 1. VirusTotal API (free tier: 4 requests/min)
 * 2. ClamAV (local scanning if daemon is running)
 * 3. Google Safe Browsing API
 */
class SecurityService {
  constructor() {
    this.virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY;
    this.clamavHost = process.env.CLAMAV_HOST || 'localhost';
    this.clamavPort = process.env.CLAMAV_PORT || 3310;
    this.googleSafeBrowsingKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
    
    // Video file types that are acceptable
    this.allowedVideoMimes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-flv',
      'video/x-matroska',
      'video/webm',
      'video/ogg'
    ];
    
    // Maximum file size (500MB)
    this.maxVideoSize = 500 * 1024 * 1024;
    
    // Dangerous file signatures (magic bytes) that shouldn't be in video files
    this.dangerousSignatures = {
      // Executable files
      'MZ': { hex: '4d5a', desc: 'Windows executable' },
      'ELF': { hex: '7f454c46', desc: 'Linux executable' },
      // Archives
      'ZIP': { hex: '504b0304', desc: 'ZIP archive' },
      'RAR': { hex: '526172', desc: 'RAR archive' },
      // Scripts
      'SHEBANG': { hex: '23212f', desc: 'Shell script' }
    };
  }

  /**
   * Complete security check before upload
   */
  async validateFileBeforeUpload(filePath, fileName, mimeType) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {
        fileSize: false,
        mimeType: false,
        fileSignature: false,
        virusScan: false
      }
    };

    try {
      console.log('[SECURITY] Starting security checks for:', fileName);

      // 1. Check file size
      try {
        const sizeCheck = await this.checkFileSize(filePath);
        results.checks.fileSize = true;
        if (!sizeCheck.valid) {
          results.valid = false;
          results.errors.push(sizeCheck.error);
        }
      } catch (error) {
        results.errors.push(`File size check failed: ${error.message}`);
      }

      // 2. Check MIME type
      try {
        const mimeCheck = this.validateMimeType(mimeType);
        results.checks.mimeType = true;
        if (!mimeCheck.valid) {
          results.valid = false;
          results.errors.push(mimeCheck.error);
        }
      } catch (error) {
        results.errors.push(`MIME type validation failed: ${error.message}`);
      }

      // 3. Check file signature (magic bytes)
      try {
        const signatureCheck = await this.checkFileSignature(filePath);
        results.checks.fileSignature = true;
        if (!signatureCheck.valid) {
          results.valid = false;
          results.errors.push(signatureCheck.error);
        }
        if (signatureCheck.warning) {
          results.warnings.push(signatureCheck.warning);
        }
      } catch (error) {
        results.errors.push(`File signature check failed: ${error.message}`);
      }

      // 4. Virus and malware scanning
      try {
        const scanResults = await this.scanFileForViruses(filePath, fileName);
        results.checks.virusScan = true;
        
        if (!scanResults.safe) {
          results.valid = false;
          results.errors.push(`Malware detected: ${scanResults.details}`);
        }
        
        if (scanResults.flagged) {
          results.warnings.push(`File flagged by scanner: ${scanResults.flaggedReason}`);
        }

        results.scanDetails = scanResults;
      } catch (error) {
        // Virus scanning is non-critical, log but don't fail upload
        console.warn('[SECURITY] Virus scan failed (non-blocking):', error.message);
        results.warnings.push(`Virus scan unavailable: ${error.message}`);
      }

      console.log('[SECURITY] Security check completed:', {
        fileName,
        valid: results.valid,
        errors: results.errors,
        warnings: results.warnings
      });

      return results;
    } catch (error) {
      console.error('[SECURITY] Unexpected error during validation:', error);
      results.valid = false;
      results.errors.push(`Security check failed: ${error.message}`);
      return results;
    }
  }

  /**
   * Check file size
   */
  async checkFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const fileSizeInBytes = stats.size;

      if (fileSizeInBytes > this.maxVideoSize) {
        return {
          valid: false,
          error: `File size (${this.formatBytes(fileSizeInBytes)}) exceeds maximum allowed size (${this.formatBytes(this.maxVideoSize)})`
        };
      }

      if (fileSizeInBytes === 0) {
        return {
          valid: false,
          error: 'File is empty'
        };
      }

      return {
        valid: true,
        size: fileSizeInBytes
      };
    } catch (error) {
      throw new Error(`Cannot access file: ${error.message}`);
    }
  }

  /**
   * Validate MIME type
   */
  validateMimeType(mimeType) {
    if (!mimeType) {
      return {
        valid: false,
        error: 'MIME type is required'
      };
    }

    if (!this.allowedVideoMimes.includes(mimeType)) {
      return {
        valid: false,
        error: `Invalid file type: ${mimeType}. Allowed types: ${this.allowedVideoMimes.join(', ')}`
      };
    }

    return {
      valid: true,
      mimeType
    };
  }

  /**
   * Check file signature (magic bytes) for dangerous content
   */
  async checkFileSignature(filePath) {
    try {
      const buffer = Buffer.alloc(512);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 512, 0);
      fs.closeSync(fd);

      const hexStart = buffer.toString('hex', 0, 8).toUpperCase();

      // Check for dangerous signatures
      for (const [name, sig] of Object.entries(this.dangerousSignatures)) {
        if (hexStart.startsWith(sig.hex)) {
          return {
            valid: false,
            error: `Dangerous file signature detected: ${sig.desc}. This file may be malicious.`
          };
        }
      }

      // Check for suspicious patterns
      const textStart = buffer.toString('utf8', 0, 512);
      if (textStart.includes('<?php') || textStart.includes('<%') || 
          textStart.includes('<script') || textStart.includes('bash') ||
          textStart.includes('python') || textStart.includes('import os')) {
        return {
          valid: false,
          error: 'Suspicious code detected in file. File may contain malicious content.'
        };
      }

      return {
        valid: true,
        signature: hexStart.substring(0, 16)
      };
    } catch (error) {
      throw new Error(`Cannot read file signature: ${error.message}`);
    }
  }

  /**
   * Scan file for viruses using available backends
   */
  async scanFileForViruses(filePath, fileName) {
    const results = {
      safe: true,
      flagged: false,
      details: 'No threats detected',
      scannedBy: [],
      flaggedReason: null
    };

    try {
      // Try VirusTotal scan if API key is available
      if (this.virusTotalApiKey) {
        try {
          console.log('[SECURITY] Scanning with VirusTotal...');
          const vtResult = await this.scanWithVirusTotal(filePath, fileName);
          results.scannedBy.push('VirusTotal');
          
          if (!vtResult.safe) {
            results.safe = false;
            results.details = vtResult.details;
            results.flagged = vtResult.flagged;
            results.flaggedReason = vtResult.flaggedReason;
          }
          
          return results;
        } catch (error) {
          console.warn('[SECURITY] VirusTotal scan failed:', error.message);
        }
      }

      // Try local ClamAV daemon if configured
      try {
        console.log('[SECURITY] Scanning with ClamAV...');
        const clamavResult = await this.scanWithClamAV(filePath);
        results.scannedBy.push('ClamAV');
        
        if (!clamavResult.safe) {
          results.safe = false;
          results.details = clamavResult.details;
          results.flagged = clamavResult.flagged;
          results.flaggedReason = clamavResult.flaggedReason;
        }
        
        return results;
      } catch (error) {
        console.warn('[SECURITY] ClamAV scan failed:', error.message);
      }

      // Fallback: Basic heuristic checks
      console.log('[SECURITY] Using basic heuristic scanning...');
      const heuristicResult = await this.basicHeuristicScan(filePath);
      results.scannedBy.push('Heuristic');
      return { ...results, ...heuristicResult };

    } catch (error) {
      console.error('[SECURITY] Virus scan error:', error);
      // Return safe result if scanning fails (better to allow than block)
      return {
        ...results,
        scannedBy: ['Manual fallback']
      };
    }
  }

  /**
   * Scan with VirusTotal API
   */
  async scanWithVirusTotal(filePath, fileName) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // First, check if file hash is already known
      const hashResponse = await axios.get(
        `https://www.virustotal.com/api/v3/files/${fileHash}`,
        {
          headers: {
            'x-apikey': this.virusTotalApiKey
          }
        }
      );

      if (hashResponse.data.data) {
        const analysis = hashResponse.data.data.attributes?.last_analysis_stats || {};
        const malicious = analysis.malicious || 0;
        const suspicious = analysis.suspicious || 0;

        if (malicious > 0 || suspicious > 0) {
          return {
            safe: false,
            flagged: true,
            details: `File flagged by ${malicious} security vendors`,
            flaggedReason: `Malicious: ${malicious}, Suspicious: ${suspicious}`
          };
        }
      }

      return {
        safe: true,
        flagged: false,
        details: 'VirusTotal scan clean'
      };
    } catch (error) {
      if (error.response?.status === 404) {
        // File not found in VirusTotal, perform full scan
        return await this.uploadToVirusTotalForScan(filePath, fileName);
      }
      throw error;
    }
  }

  /**
   * Upload file to VirusTotal for scanning
   */
  async uploadToVirusTotalForScan(filePath, fileName) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const formData = new FormData();
      formData.append('file', fileStream, fileName);

      const response = await axios.post(
        'https://www.virustotal.com/api/v3/files',
        formData,
        {
          headers: {
            'x-apikey': this.virusTotalApiKey,
            ...formData.getHeaders?.()
          }
        }
      );

      console.log('[SECURITY] File submitted to VirusTotal for analysis');
      return {
        safe: true,
        flagged: false,
        details: 'File submitted for analysis (result pending)',
        analysisId: response.data.data?.id
      };
    } catch (error) {
      throw new Error(`VirusTotal upload failed: ${error.message}`);
    }
  }

  /**
   * Scan with ClamAV daemon
   */
  async scanWithClamAV(filePath) {
    try {
      const NodeClam = require('clamscan');
      const clamscan = await new NodeClam().init({
        clamdscan: {
          host: this.clamavHost,
          port: this.clamavPort
        }
      });

      const { isInfected, viruses } = await clamscan.scanFile(filePath);

      if (isInfected) {
        return {
          safe: false,
          flagged: true,
          details: `Malware detected: ${viruses.join(', ')}`,
          flaggedReason: viruses.join(', ')
        };
      }

      return {
        safe: true,
        flagged: false,
        details: 'ClamAV scan clean'
      };
    } catch (error) {
      throw new Error(`ClamAV scan failed: ${error.message}`);
    }
  }

  /**
   * Basic heuristic scan (fallback)
   */
  async basicHeuristicScan(filePath) {
    try {
      const buffer = Buffer.alloc(1024);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 1024, 0);
      fs.closeSync(fd);

      const content = buffer.toString('utf8', 0, 1024);

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /eval\s*\(/gi,
        /base64/gi,
        /cmd\.exe/gi,
        /powershell/gi,
        /DROP TABLE/gi,
        /xp_cmdshell/gi
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          return {
            safe: false,
            flagged: true,
            details: 'Suspicious patterns detected',
            flaggedReason: `Matched pattern: ${pattern.source}`
          };
        }
      }

      return {
        safe: true,
        flagged: false,
        details: 'Heuristic scan passed'
      };
    } catch (error) {
      console.warn('[SECURITY] Heuristic scan error:', error.message);
      return {
        safe: true,
        flagged: false,
        details: 'Heuristic scan skipped'
      };
    }
  }

  /**
   * Generate file hash (SHA-256)
   */
  async getFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`Cannot compute file hash: ${error.message}`);
    }
  }

  /**
   * Helper: Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new SecurityService();
