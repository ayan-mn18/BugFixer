import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export type MemberRole = 'VIEWER' | 'MEMBER' | 'ADMIN';

interface ProjectMemberAttributes {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  invitedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectMemberCreationAttributes extends Optional<ProjectMemberAttributes, 'id' | 'role' | 'invitedBy' | 'createdAt' | 'updatedAt'> {}

class ProjectMember extends Model<ProjectMemberAttributes, ProjectMemberCreationAttributes> implements ProjectMemberAttributes {
  declare id: string;
  declare projectId: string;
  declare userId: string;
  declare role: MemberRole;
  declare invitedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProjectMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    role: {
      type: DataTypes.ENUM('VIEWER', 'MEMBER', 'ADMIN'),
      defaultValue: 'MEMBER',
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'invited_by',
    },
  },
  {
    sequelize,
    tableName: 'project_members',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['project_id', 'user_id'],
      },
    ],
  }
);

export default ProjectMember;
