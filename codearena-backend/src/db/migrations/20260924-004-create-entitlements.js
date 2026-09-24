import { DataTypes } from "sequelize";

export async function up({ context: qi }) {
  await qi.createTable("entitlements", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    module_id: { type: DataTypes.STRING(64), allowNull: false },
    source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: "manual" },
    granted_at: { type: DataTypes.DATE, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
  });
  await qi.addIndex("entitlements", ["user_id", "module_id"], { unique: true });
}

export async function down({ context: qi }) {
  await qi.dropTable("entitlements");
}
