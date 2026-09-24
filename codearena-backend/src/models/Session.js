import { DataTypes, Model } from "sequelize";

// One signed-in device. Stores only a SHA-256 hash of the refresh token, never the token itself.
export class Session extends Model {
  get isActive() {
    return !this.revokedAt && this.expiresAt > new Date();
  }

  static initModel(sequelize) {
    Session.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
        userAgent: { type: DataTypes.STRING(255), allowNull: true },
        ipAddress: { type: DataTypes.STRING(64), allowNull: true },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        lastUsedAt: { type: DataTypes.DATE, allowNull: true },
        revokedAt: { type: DataTypes.DATE, allowNull: true },
      },
      { sequelize, modelName: "Session", tableName: "sessions", underscored: true },
    );
    return Session;
  }
}
