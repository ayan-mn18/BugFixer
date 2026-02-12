import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

interface WidgetTokenAttributes {
  id: string;
  projectId: string;
  token: string;
  allowedOrigins: string[];
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WidgetTokenCreationAttributes extends Optional<WidgetTokenAttributes, 'id' | 'allowedOrigins' | 'enabled' | 'createdAt' | 'updatedAt'> {}

class WidgetToken extends Model<WidgetTokenAttributes, WidgetTokenCreationAttributes> implements WidgetTokenAttributes {
  declare id: string;
  declare projectId: string;
  declare token: string;
  declare allowedOrigins: string[];
  declare enabled: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WidgetToken.init(
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
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    allowedOrigins: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      field: 'allowed_origins',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'widget_tokens',
    underscored: true,
    timestamps: true,
  }
);

export default WidgetToken;
