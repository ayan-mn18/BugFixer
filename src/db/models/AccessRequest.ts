import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AccessRequestAttributes {
  id: string;
  projectId: string;
  userId: string;
  message?: string | null;
  status: RequestStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AccessRequestCreationAttributes extends Optional<AccessRequestAttributes, 'id' | 'message' | 'status' | 'createdAt' | 'updatedAt'> {}

class AccessRequest extends Model<AccessRequestAttributes, AccessRequestCreationAttributes> implements AccessRequestAttributes {
  declare id: string;
  declare projectId: string;
  declare userId: string;
  declare message: string | null;
  declare status: RequestStatus;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

AccessRequest.init(
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
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING',
    },
  },
  {
    sequelize,
    tableName: 'access_requests',
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

export default AccessRequest;
