// Interview questions: search, embeddings, vector databases, ANN indexes, retrieval evaluation. Picked into day files (d04.js, …); shape: see ./index.js
import { searchQs, embeddingModelQs, similarityQs, vectorDbQs } from "./vectors-a.js";
import { annQs, filterQs, evalQs, vecOpsQs, sizingQs, vecCodingQs } from "./vectors-b.js";
import { whatToEmbedQs, hybridPreviewQs, vecDesignQs } from "./vectors-c.js";

export default {
  groups: [searchQs, embeddingModelQs, similarityQs, whatToEmbedQs, vectorDbQs, annQs, filterQs, hybridPreviewQs, evalQs, vecOpsQs, sizingQs, vecDesignQs, vecCodingQs],
};
