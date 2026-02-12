import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export enum AIProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GEMINI = 'GEMINI',
}

interface AgentConfigAttributes {
  id: string;
  projectId: string;
  enabled: boolean;
  aiProvider: AIProvider;
  aiModel: string;
  systemPrompt: string | null;
  autoAssign: boolean;
  targetBranch: string;
  prBranchPrefix: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AgentConfigCreationAttributes
  extends Optional<
    AgentConfigAttributes,
    'id' | 'enabled' | 'aiProvider' | 'aiModel' | 'systemPrompt' | 'autoAssign' | 'targetBranch' | 'prBranchPrefix' | 'createdAt' | 'updatedAt'
  > {}

class AgentConfig
  extends Model<AgentConfigAttributes, AgentConfigCreationAttributes>
  implements AgentConfigAttributes
{
  declare id: string;
  declare projectId: string;
  declare enabled: boolean;
  declare aiProvider: AIProvider;
  declare aiModel: string;
  declare systemPrompt: string | null;
  declare autoAssign: boolean;
  declare targetBranch: string;
  declare prBranchPrefix: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AgentConfig.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'project_id',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aiProvider: {
      type: DataTypes.ENUM(...Object.values(AIProvider)),
      allowNull: false,
      defaultValue: AIProvider.OPENAI,
      field: 'ai_provider',
    },
    aiModel: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'gpt-4o-mini',
      field: 'ai_model',
    },
    systemPrompt: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'system_prompt',
    },
    autoAssign: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'auto_assign',
    },
    targetBranch: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: 'main',
      field: 'target_branch',
    },
    prBranchPrefix: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'bugfix/',
      field: 'pr_branch_prefix',
    },
  },
  {
    sequelize,
    tableName: 'agent_configs',
    underscored: true,
    timestamps: true,
  }
);

export default AgentConfig;
