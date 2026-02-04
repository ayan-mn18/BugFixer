import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../sequelize';

interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'avatarUrl' | 'createdAt' | 'updatedAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public name!: string;
  public avatarUrl!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'avatar_url',
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
  }
);

export default User;
