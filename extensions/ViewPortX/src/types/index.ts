/**
 * ViewPortX - Core Type Definitions
 * Strict TypeScript types for scanner results, issue detections,
 * CSS transformations, verification metrics, and health scores.
 */

export type IssueCategory =
  | 'overflow'
  | 'container'
  | 'navigation'
  | 'image'
  | 'typography'
  | 'flex-grid'
  | 'form'
  | 'table'
  | 'overlap'
  | 'touch-target';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'partially_verified'
  | 'unsuccessful'
  | 'regressed';

export interface BoundingBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface ComputedProperties {
  width: string;
  height: string;
  minWidth: string;
  maxWidth: string;
  display: string;
  position: string;
  overflowX: string;
  overflowY: string;
  boxSizing: string;
  flexShrink: string;
  flexWrap: string;
  gridTemplateColumns: string;
  fontSize: string;
  lineHeight: string;
  padding: string;
  margin: string;
  textAlign: string;
  wordBreak: string;
  overflowWrap: string;
  tableLayout?: string;
}

export interface ElementInspection {
  id: string;
  tagName: string;
  elementId: string;
  classNames: string[];
  selector: string;
  rect: BoundingBox;
  computed: ComputedProperties;
  parentDimensions: {
    clientWidth: number;
    scrollWidth: number;
    width: number;
    tagName: string;
    selector: string;
  };
  isVisible: boolean;
  isInteractive: boolean;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
}

export interface DOMScanReport {
  timestamp: number;
  url: string;
  hostname: string;
  viewportWidth: number;
  viewportHeight: number;
  documentScrollWidth: number;
  documentScrollHeight: number;
  hasHorizontalOverflow: boolean;
  totalHorizontalOverflow: number;
  totalElementsScanned: number;
  elements: ElementInspection[];
}

export interface ResponsiveIssue {
  id: string;
  selector: string;
  tagName: string;
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  currentDimensions: string;
  expectedCondition: string;
  affectedViewport: string;
  recommendedFix: string;
  confidence: number; // 0.0 to 1.0
  rect: BoundingBox;
}

export interface CssTransformation {
  id: string;
  issueId: string;
  targetSelector: string;
  category: IssueCategory;
  originalComputedStyle: Partial<ComputedProperties>;
  generatedCss: string;
  rules: Record<string, string>;
  reason: string;
  confidence: number;
  applied: boolean;
  verified: boolean;
  verificationStatus: VerificationStatus;
  beforeMeasurement: string;
  afterMeasurement: string;
  isReversible: boolean;
}

export interface CategoryScore {
  score: number; // 0 to 100
  tested: number;
  passed: number;
  failed: number;
  weight: number;
  status: 'passed' | 'failed' | 'warning' | 'not-applicable';
}

export interface ResponsiveHealthScore {
  overall: number; // 0 to 100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  categories: Record<IssueCategory, CategoryScore>;
  testedCount: number;
  passedCount: number;
  failedCount: number;
}

export interface VerificationMeasurement {
  transformationId: string;
  selector: string;
  status: VerificationStatus;
  beforeOverflow: number;
  afterOverflow: number;
  beforeWidth: number;
  afterWidth: number;
  note: string;
}

export interface VerificationReport {
  timestamp: number;
  url: string;
  appliedCount: number;
  verifiedCount: number;
  unsuccessfulCount: number;
  regressedCount: number;
  initialDocumentOverflow: number;
  finalDocumentOverflow: number;
  overallSuccessRate: number; // 0 to 100%
  measurements: VerificationMeasurement[];
}

export interface DeviceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'mobile' | 'tablet' | 'laptop' | 'desktop';
  dpr: number;
  userAgent?: string;
}

export interface ViewPortXSettings {
  autoScan: boolean;
  autoApplySafeFixes: boolean;
  requireApproval: boolean;
  sessionOnly: boolean;
  rememberPerSite: boolean;
  highlightIssues: boolean;
  maxElementsScanned: number;
  emulationDpr: number;
  theme: 'dark' | 'midnight' | 'contrast';
}
