import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export type BugPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugStatus = 'OPEN' | 'TRIAGE' | 'IN_PROGRESS' | 'CODE_REVIEW' | 'QA_TESTING' | 'DEPLOYED';

interface BugAttributes {
  id: string;
  title: string;
  description?: string | null;
  priority: BugPriority;
  status: BugStatus;
  projectId: string;
  reporterId: string;
  assigneeId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BugCreationAttributes extends Optional<BugAttributes, 'id' | 'description' | 'priority' | 'status' | 'assigneeId' | 'createdAt' | 'updatedAt'> {}

class Bug extends Model<BugAttributes, BugCreationAttributes> implements BugAttributes {
  declare id: string;
  declare title: string;
  declare description: string | null;
  declare priority: BugPriority;
  declare status: BugStatus;
  declare projectId: string;
  declare reporterId: string;
  declare assigneeId: string | null;
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
      type: DataTypes.STRING(500),
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
      type: DataTypes.ENUM('OPEN', 'TRIAGE', 'IN_PROGRESS', 'CODE_REVIEW', 'QA_TESTING', 'DEPLOYED'),
      defaultValue: 'OPEN',
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'project_id',
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'reporter_id',
    },
    assigneeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'assignee_id',
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
