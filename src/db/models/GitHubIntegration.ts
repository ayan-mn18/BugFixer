import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

interface GitHubIntegrationAttributes {
  id: string;
  projectId: string;
  githubAccessToken: string;  // encrypted at rest
  githubUserId: string;
  githubUsername: string;
  connectedBy: string;        // userId who connected
  tokenExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GitHubIntegrationCreationAttributes
  extends Optional<GitHubIntegrationAttributes, 'id' | 'tokenExpiresAt' | 'createdAt' | 'updatedAt'> {}

class GitHubIntegration
  extends Model<GitHubIntegrationAttributes, GitHubIntegrationCreationAttributes>
  implements GitHubIntegrationAttributes
{
  declare id: string;
  declare projectId: string;
  declare githubAccessToken: string;
  declare githubUserId: string;
  declare githubUsername: string;
  declare connectedBy: string;
  declare tokenExpiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

GitHubIntegration.init(
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
    githubAccessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'github_access_token',
    },
    githubUserId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'github_user_id',
    },
    githubUsername: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'github_username',
    },
    connectedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'connected_by',
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'token_expires_at',
    },
  },
  {
    sequelize,
    tableName: 'github_integrations',
    underscored: true,
    timestamps: true,
  }
);

export default GitHubIntegration;
