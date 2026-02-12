import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

interface GitHubRepoAttributes {
  id: string;
  integrationId: string;
  repoOwner: string;
  repoName: string;
  repoFullName: string;       // "owner/repo"
  isDefault: boolean;
  autoCreateIssues: boolean;
  labelSync: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GitHubRepoCreationAttributes
  extends Optional<GitHubRepoAttributes, 'id' | 'isDefault' | 'autoCreateIssues' | 'labelSync' | 'createdAt' | 'updatedAt'> {}

class GitHubRepo
  extends Model<GitHubRepoAttributes, GitHubRepoCreationAttributes>
  implements GitHubRepoAttributes
{
  declare id: string;
  declare integrationId: string;
  declare repoOwner: string;
  declare repoName: string;
  declare repoFullName: string;
  declare isDefault: boolean;
  declare autoCreateIssues: boolean;
  declare labelSync: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

GitHubRepo.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    integrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'integration_id',
    },
    repoOwner: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'repo_owner',
    },
    repoName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'repo_name',
    },
    repoFullName: {
      type: DataTypes.STRING(512),
      allowNull: false,
      field: 'repo_full_name',
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    autoCreateIssues: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'auto_create_issues',
    },
    labelSync: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'label_sync',
    },
  },
  {
    sequelize,
    tableName: 'github_repos',
    underscored: true,
    timestamps: true,
  }
);

export default GitHubRepo;
