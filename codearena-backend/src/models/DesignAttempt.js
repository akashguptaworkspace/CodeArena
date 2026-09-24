import { DataTypes, Model } from "sequelize";

export const MAX_NOTES_LENGTH = 20_000;

// The student's own attempt at a design question: notes, rubric points ticked, answer revealed.
export class DesignAttempt extends Model {
  static initModel(sequelize) {
    DesignAttempt.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        questionId: { type: DataTypes.STRING(120), allowNull: false },
        notes: { type: DataTypes.TEXT("medium"), allowNull: false, defaultValue: "" },
        covered: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        revealed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      },
      {
        sequelize,
        modelName: "DesignAttempt",
        tableName: "design_attempts",
        underscored: true,
        indexes: [{ unique: true, fields: ["user_id", "question_id"] }],
      },
    );
    return DesignAttempt;
  }
}
