import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export type BugPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugStatus = 'TRIAGE' | 'IN_PROGRESS' | 'CODE_REVIEW' | 'QA_TESTING' | 'DEPLOYED';
export type BugSource = 'CUSTOMER_REPORT' | 'INTERNAL_QA' | 'AUTOMATED_TEST' | 'PRODUCTION_ALERT';
export type AgentPRStatus = 'PENDING' | 'IN_PROGRESS' | 'PR_CREATED' | 'MERGED' | 'FAILED';

interface BugAttributes {
  id: string;
  title: string;
  description?: string | null;
  priority: BugPriority;
  status: BugStatus;
  source: BugSource;
  reporterEmail?: string | null;
  screenshots?: string[] | null;
  projectId: string;
  reporterId?: string | null;
  // GitHub integration fields
  githubIssueNumber?: number | null;
  githubIssueUrl?: string | null;
  githubRepoFullName?: string | null;
  // AI agent fields
  agentPrBranch?: string | null;
  agentPrUrl?: string | null;
  agentPrNumber?: number | null;
  agentPrStatus?: AgentPRStatus | null;
  agentTargetBranch?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BugCreationAttributes extends Optional<BugAttributes, 'id' | 'description' | 'priority' | 'status' | 'source' | 'reporterEmail' | 'screenshots' | 'reporterId' | 'githubIssueNumber' | 'githubIssueUrl' | 'githubRepoFullName' | 'agentPrBranch' | 'agentPrUrl' | 'agentPrNumber' | 'agentPrStatus' | 'agentTargetBranch' | 'createdAt' | 'updatedAt'> {}

class Bug extends Model<BugAttributes, BugCreationAttributes> implements BugAttributes {
  declare id: string;
  declare title: string;
  declare description: string | null;
  declare priority: BugPriority;
  declare status: BugStatus;
  declare source: BugSource;
  declare reporterEmail: string | null;
  declare screenshots: string[] | null;
  declare projectId: string;
  declare reporterId: string | null;
  // GitHub integration fields
  declare githubIssueNumber: number | null;
  declare githubIssueUrl: string | null;
  declare githubRepoFullName: string | null;
  // AI agent fields
  declare agentPrBranch: string | null;
  declare agentPrUrl: string | null;
  declare agentPrNumber: number | null;
  declare agentPrStatus: AgentPRStatus | null;
  declare agentTargetBranch: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Bug.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM',
    },
    status: {
      type: DataTypes.ENUM('TRIAGE', 'IN_PROGRESS', 'CODE_REVIEW', 'QA_TESTING', 'DEPLOYED'),
      defaultValue: 'TRIAGE',
    },
    source: {
      type: DataTypes.ENUM('CUSTOMER_REPORT', 'INTERNAL_QA', 'AUTOMATED_TEST', 'PRODUCTION_ALERT'),
      defaultValue: 'INTERNAL_QA',
    },
    reporterEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'reporter_email',
    },
    screenshots: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'reporter_id',
    },
    // GitHub integration fields
    githubIssueNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'github_issue_number',
    },
    githubIssueUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'github_issue_url',
    },
    githubRepoFullName: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'github_repo_full_name',
    },
    // AI agent fields
    agentPrBranch: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'agent_pr_branch',
    },
    agentPrUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      field: 'agent_pr_url',
    },
    agentPrNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'agent_pr_number',
    },
    agentPrStatus: {
      type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'PR_CREATED', 'MERGED', 'FAILED'),
      allowNull: true,
      field: 'agent_pr_status',
    },
    agentTargetBranch: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'agent_target_branch',
    },
  },
  {
    sequelize,
    tableName: 'bugs',
    underscored: true,
    timestamps: true,
  }
);

export default Bug;
