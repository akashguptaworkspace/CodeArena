import { DataTypes, Model } from "sequelize";

// A paid module a user can open (e.g. "system-design"). Filled by payments later, or granted manually.
export class Entitlement extends Model {
  static initModel(sequelize) {
    Entitlement.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        moduleId: { type: DataTypes.STRING(64), allowNull: false },
        source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "manual" },
        grantedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      },
      {
        sequelize,
        modelName: "Entitlement",
        tableName: "entitlements",
        underscored: true,
        indexes: [{ unique: true, fields: ["user_id", "module_id"] }],
      },
    );
    return Entitlement;
  }
}
