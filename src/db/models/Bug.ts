import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

export type BugPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BugStatus = 'TRIAGE' | 'IN_PROGRESS' | 'CODE_REVIEW' | 'QA_TESTING' | 'DEPLOYED';
export type BugSource = 'CUSTOMER_REPORT' | 'INTERNAL_QA' | 'AUTOMATED_TEST' | 'PRODUCTION_ALERT';

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
  createdAt?: Date;
  updatedAt?: Date;
}

interface BugCreationAttributes extends Optional<BugAttributes, 'id' | 'description' | 'priority' | 'status' | 'source' | 'reporterEmail' | 'screenshots' | 'reporterId' | 'createdAt' | 'updatedAt'> {}

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
  },
  {
    sequelize,
    tableName: 'bugs',
    underscored: true,
    timestamps: true,
  }
);

export default Bug;
