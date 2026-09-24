import { DataTypes, Model } from "sequelize";

export const DESIGN_STATUSES = ["studied", "practised", "ready"];

// A user's stage for one system design question.
export class DesignProgress extends Model {
  static initModel(sequelize) {
    DesignProgress.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        questionId: { type: DataTypes.STRING(120), allowNull: false },
        status: { type: DataTypes.ENUM(...DESIGN_STATUSES), allowNull: false },
      },
      {
        sequelize,
        modelName: "DesignProgress",
        tableName: "design_progress",
        underscored: true,
        indexes: [{ unique: true, fields: ["user_id", "question_id"] }],
      },
    );
    return DesignProgress;
  }
}
