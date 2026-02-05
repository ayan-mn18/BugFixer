import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED';
export type InvitationRole = 'VIEWER' | 'MEMBER' | 'ADMIN';

interface InvitationAttributes {
  id: string;
  email: string;
  projectId: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InvitationCreationAttributes extends Optional<InvitationAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

class Invitation extends Model<InvitationAttributes, InvitationCreationAttributes> implements InvitationAttributes {
  declare id: string;
  declare email: string;
  declare projectId: string;
  declare role: InvitationRole;
  declare status: InvitationStatus;
  declare invitedBy: string;
  declare token: string;
  declare expiresAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Invitation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
    },
    role: {
      type: DataTypes.ENUM('VIEWER', 'MEMBER', 'ADMIN'),
      defaultValue: 'MEMBER',
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACCEPTED', 'EXPIRED'),
      defaultValue: 'PENDING',
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'invited_by',
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
  },
  {
    sequelize,
    tableName: 'invitations',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['email'] },
      { fields: ['project_id'] },
      { fields: ['token'], unique: true },
      { fields: ['email', 'project_id'] },
    ],
  }
);

export default Invitation;
