import { DataTypes, Model } from "sequelize";

// A person who signed in with Google. `googleSub` is Google's stable account id.
export class User extends Model {
  toPublicJSON(entitlements = []) {
    return {
      id: String(this.id),
      name: this.name,
      email: this.email,
      avatarUrl: this.avatarUrl,
      entitlements,
    };
  }

  static initModel(sequelize) {
    User.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        googleSub: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        email: { type: DataTypes.STRING(254), allowNull: false, unique: true, validate: { isEmail: true } },
        name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
        avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
        dailyGoal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5, validate: { min: 1, max: 20 } },
        lastLoginAt: { type: DataTypes.DATE, allowNull: true },
      },
      { sequelize, modelName: "User", tableName: "users", underscored: true },
    );
    return User;
  }
}
