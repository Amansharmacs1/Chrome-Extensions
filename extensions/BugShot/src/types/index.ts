/**
 * BugShot - Core Type Definitions
 * Strict TypeScript types for Bug Reports, Screenshots, Annotations,
 * Console Diagnostics, Technical Metadata, and Storage Schemas.
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

export type BugCategory =
  | 'ui-ux'
  | 'functional'
  | 'performance'
  | 'responsive'
  | 'accessibility'
  | 'javascript'
  | 'network'
  | 'other';

export type CaptureType = 'viewport' | 'region' | 'full-page';

export interface BoundingRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio?: number;
}

export interface TechnicalMetadata {
  url: string;
  title: string;
  timestamp: number;
  browserName: string;
  browserVersion: string;
  userAgent: string;
  os: string;
  platform: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  language: string;
  online: boolean;
  pageZoom?: number;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  col?: number;
  included: boolean;
}

export interface NetworkDiagnosticEntry {
  id: string;
  timestamp: number;
  url: string;
  method?: string;
  status?: number;
  statusText?: string;
  resourceType?: string;
  duration?: number;
  failureReason?: string;
  included: boolean;
}

export type AnnotationTool =
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'brush'
  | 'text'
  | 'highlight'
  | 'blur';

export interface BaseAnnotation {
  id: string;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  tool: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface RectAnnotation extends BaseAnnotation {
  tool: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  filled?: boolean;
}

export interface CircleAnnotation extends BaseAnnotation {
  tool: 'circle';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface BrushAnnotation extends BaseAnnotation {
  tool: 'brush';
  points: Array<{ x: number; y: number }>;
}

export interface TextAnnotation extends BaseAnnotation {
  tool: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
  backgroundColor?: string;
}

export interface HighlightAnnotation extends BaseAnnotation {
  tool: 'highlight';
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface BlurAnnotation extends BaseAnnotation {
  tool: 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export type AnnotationShape =
  | ArrowAnnotation
  | RectAnnotation
  | CircleAnnotation
  | BrushAnnotation
  | TextAnnotation
  | HighlightAnnotation
  | BlurAnnotation;

export interface BugReport {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: SeverityLevel;
  priority: PriorityLevel;
  category: BugCategory;
  tags: string[];
  metadata: TechnicalMetadata;
  screenshotOriginal?: string; // Data URL or storage reference key
  screenshotAnnotated?: string; // Data URL with annotations
  annotations?: AnnotationShape[];
  consoleLogs?: ConsoleLogEntry[];
  networkInsights?: NetworkDiagnosticEntry[];
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
}

export interface UserPreferences {
  theme: 'dark' | 'midnight' | 'contrast';
  defaultSeverity: SeverityLevel;
  defaultPriority: PriorityLevel;
  autoCaptureConsole: boolean;
  autoCaptureNetwork: boolean;
  sanitizeUrlParams: boolean;
  includeTimestampInExportFilename: boolean;
  maxStoredReports: number;
}

export interface CaptureSession {
  sessionId: string;
  targetTabId: number;
  targetUrl: string;
  captureType: CaptureType;
  timestamp: number;
  rawScreenshot: string; // Base64 data URL
  metadata: TechnicalMetadata;
  consoleLogs: ConsoleLogEntry[];
  networkInsights: NetworkDiagnosticEntry[];
}
