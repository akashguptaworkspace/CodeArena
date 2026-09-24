import { sequelize } from "../config/database.js";
import { DesignAttempt } from "./DesignAttempt.js";
import { DesignProgress } from "./DesignProgress.js";
import { Entitlement } from "./Entitlement.js";
import { ProblemProgress } from "./ProblemProgress.js";
import { Session } from "./Session.js";
import { User } from "./User.js";

// Initialise every model on the shared connection, then wire up relationships.
for (const model of [User, Session, ProblemProgress, DesignProgress, DesignAttempt, Entitlement]) {
  model.initModel(sequelize);
}

const ownedByUser = { foreignKey: "userId", onDelete: "CASCADE" };
User.hasMany(Session, ownedByUser);
User.hasMany(ProblemProgress, ownedByUser);
User.hasMany(DesignProgress, ownedByUser);
User.hasMany(DesignAttempt, ownedByUser);
User.hasMany(Entitlement, ownedByUser);
Session.belongsTo(User, { foreignKey: "userId" });
ProblemProgress.belongsTo(User, { foreignKey: "userId" });
DesignProgress.belongsTo(User, { foreignKey: "userId" });
DesignAttempt.belongsTo(User, { foreignKey: "userId" });
Entitlement.belongsTo(User, { foreignKey: "userId" });

export { sequelize, User, Session, ProblemProgress, DesignProgress, DesignAttempt, Entitlement };
