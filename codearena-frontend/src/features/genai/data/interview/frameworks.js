// Interview questions: LangChain (1.x), LlamaIndex and choosing frameworks. Picked into day files (d04.js, …); shape: see ./index.js
import { lcBasicsQs, lcRagQs, lcAgentQs, lcOpsQs } from "./frameworks-a.js";
import { llamaQs, frameworkChoiceQs, lcScenarioQs, lcCodingQs } from "./frameworks-b.js";
import { lcPromptQs, langgraphPreviewQs, lcProdRagQs, lcEvalQs } from "./frameworks-c.js";

export default {
  groups: [lcBasicsQs, lcPromptQs, lcRagQs, lcAgentQs, langgraphPreviewQs, lcOpsQs, lcProdRagQs, llamaQs, frameworkChoiceQs, lcEvalQs, lcScenarioQs, lcCodingQs],
};
