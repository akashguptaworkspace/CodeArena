import { DataTypes } from "sequelize";

const userId = {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: { model: "users", key: "id" },
  onDelete: "CASCADE",
};
const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
};

export async function up({ context: qi }) {
  await qi.createTable("problem_progress", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: userId,
    problem_id: { type: DataTypes.STRING(120), allowNull: false },
    solved_on: { type: DataTypes.DATEONLY, allowNull: true },
    flagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...timestamps,
  });
  await qi.addIndex("problem_progress", ["user_id", "problem_id"], { unique: true });

  await qi.createTable("design_progress", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: userId,
    question_id: { type: DataTypes.STRING(120), allowNull: false },
    status: { type: DataTypes.ENUM("studied", "practised", "ready"), allowNull: false },
    ...timestamps,
  });
  await qi.addIndex("design_progress", ["user_id", "question_id"], { unique: true });

  await qi.createTable("design_attempts", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: userId,
    question_id: { type: DataTypes.STRING(120), allowNull: false },
    notes: { type: DataTypes.TEXT("medium"), allowNull: false },
    covered: { type: DataTypes.JSON, allowNull: false },
    revealed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ...timestamps,
  });
  await qi.addIndex("design_attempts", ["user_id", "question_id"], { unique: true });
}

export async function down({ context: qi }) {
  await qi.dropTable("design_attempts");
  await qi.dropTable("design_progress");
  await qi.dropTable("problem_progress");
}
