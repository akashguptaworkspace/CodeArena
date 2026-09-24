import { DataTypes, Model } from "sequelize";

// A user's state for one DSA problem. The row is deleted when it's neither solved nor flagged.
export class ProblemProgress extends Model {
  static initModel(sequelize) {
    ProblemProgress.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        problemId: { type: DataTypes.STRING(120), allowNull: false },
        solvedOn: { type: DataTypes.DATEONLY, allowNull: true }, // user's local calendar day
        flagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      },
      {
        sequelize,
        modelName: "ProblemProgress",
        tableName: "problem_progress",
        underscored: true,
        indexes: [{ unique: true, fields: ["user_id", "problem_id"] }],
      },
    );
    return ProblemProgress;
  }
}
