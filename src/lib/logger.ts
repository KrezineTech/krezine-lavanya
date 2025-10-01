/**
 * Enhanced Logging System for Support Page
 * Provides structured logging with different levels and external service integration
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  filePath?: string;
}

export class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      ...config
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const configLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= configLevelIndex;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      ...(context?.userId && { userId: context.userId }),
      ...(context?.requestId && { requestId: context.requestId }),
      ...(context?.sessionId && { sessionId: context.sessionId }),
      ...(context?.userAgent && { userAgent: context.userAgent }),
      ...(context?.ipAddress && { ipAddress: context.ipAddress })
    };
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const promises: Promise<void>[] = [];

    // Console logging
    if (this.config.enableConsole) {
      promises.push(this.writeToConsole(entry));
    }

    // File logging
    if (this.config.enableFile && this.config.filePath) {
      promises.push(this.writeToFile(entry));
    }

    // Remote logging
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      promises.push(this.writeToRemote(entry));
    }

    await Promise.allSettled(promises);
  }

  private async writeToConsole(entry: LogEntry): Promise<void> {
    const colorCodes = {
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.INFO]: '\x1b[36m',  // Cyan
      [LogLevel.DEBUG]: '\x1b[37m'  // White
    };

    const resetCode = '\x1b[0m';
    const color = colorCodes[entry.level];
    
    const logMessage = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${resetCode}`;
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(logMessage, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, entry.context || '');
        break;
      default:
        console.log(logMessage, entry.context || '');
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const logDir = path.dirname(this.config.filePath!);
      await fs.mkdir(logDir, { recursive: true });
      
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.config.filePath!, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async writeToRemote(entry: LogEntry): Promise<void> {
    try {
      const response = await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  error(message: string, context?: Record<string, any>): void {
    this.writeLog(this.createLogEntry(LogLevel.ERROR, message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    this.writeLog(this.createLogEntry(LogLevel.WARN, message, context));
  }

  info(message: string, context?: Record<string, any>): void {
    this.writeLog(this.createLogEntry(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: Record<string, any>): void {
    this.writeLog(this.createLogEntry(LogLevel.DEBUG, message, context));
  }
}

// Support-specific logging helpers
export class SupportLogger {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance({
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      enableFile: process.env.ENABLE_FILE_LOGGING === 'true',
      enableRemote: process.env.ENABLE_REMOTE_LOGGING === 'true',
      filePath: process.env.LOG_FILE_PATH || './logs/support.log',
      remoteEndpoint: process.env.REMOTE_LOG_ENDPOINT
    });
  }

  // Contact form submission
  logContactSubmission(messageId: string, context: {
    category: string;
    email: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    this.logger.info('Contact form submitted', {
      action: 'contact_form_submitted',
      messageId,
      category: context.category,
      email: context.email,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  }

  // Message status updates
  logStatusUpdate(messageId: string, context: {
    oldStatus: string;
    newStatus: string;
    userId?: string;
    adminNotes?: string;
  }): void {
    this.logger.info('Message status updated', {
      action: 'message_status_updated',
      messageId,
      oldStatus: context.oldStatus,
      newStatus: context.newStatus,
      userId: context.userId,
      hasNotes: !!context.adminNotes
    });
  }

  // Message assignment
  logAssignment(messageId: string, context: {
    assignedTo: string;
    assignedBy?: string;
    userId?: string;
  }): void {
    this.logger.info('Message assigned', {
      action: 'message_assigned',
      messageId,
      assignedTo: context.assignedTo,
      assignedBy: context.assignedBy,
      userId: context.userId
    });
  }

  // Bulk operations
  logBulkOperation(context: {
    operation: string;
    messageIds: string[];
    userId?: string;
    newStatus?: string;
  }): void {
    this.logger.info('Bulk operation performed', {
      action: 'bulk_operation',
      operation: context.operation,
      messageCount: context.messageIds.length,
      messageIds: context.messageIds,
      userId: context.userId,
      newStatus: context.newStatus
    });
  }

  // Export operations
  logExport(context: {
    format: string;
    recordCount: number;
    userId?: string;
    filters?: Record<string, any>;
  }): void {
    this.logger.info('Data exported', {
      action: 'data_exported',
      format: context.format,
      recordCount: context.recordCount,
      userId: context.userId,
      filters: context.filters
    });
  }

  // Security events
  logSecurityEvent(event: string, context: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
    details?: Record<string, any>;
  }): void {
    const logLevel = context.severity === 'critical' || context.severity === 'high' 
      ? LogLevel.ERROR 
      : context.severity === 'medium' 
        ? LogLevel.WARN 
        : LogLevel.INFO;

    this.logger[logLevel](`Security event: ${event}`, {
      action: 'security_event',
      event,
      severity: context.severity,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      userId: context.userId,
      details: context.details
    });
  }

  // Rate limiting
  logRateLimit(context: {
    ipAddress: string;
    endpoint: string;
    attempts: number;
    windowMs: number;
  }): void {
    this.logger.warn('Rate limit triggered', {
      action: 'rate_limit_triggered',
      ipAddress: context.ipAddress,
      endpoint: context.endpoint,
      attempts: context.attempts,
      windowMs: context.windowMs
    });
  }

  // Error logging
  logError(error: Error | string, context?: {
    action?: string;
    messageId?: string;
    userId?: string;
    requestId?: string;
    additionalInfo?: Record<string, any>;
  }): void {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    this.logger.error(message, {
      action: context?.action || 'error_occurred',
      messageId: context?.messageId,
      userId: context?.userId,
      requestId: context?.requestId,
      stack,
      additionalInfo: context?.additionalInfo
    });
  }

  // General info logging
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, context);
  }
}

// Export singleton instance
export const supportLogger = new SupportLogger();

// Request ID middleware for tracking
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function withRequestLogging<T extends Record<string, any>>(
  req: T & { headers: Record<string, any> }
): T & { requestId: string; ipAddress: string; userAgent: string } {
  const requestId = generateRequestId();
  const ipAddress = req.headers['x-forwarded-for'] || req.headers['remote-addr'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  return {
    ...req,
    requestId,
    ipAddress,
    userAgent
  };
}

export default supportLogger;
