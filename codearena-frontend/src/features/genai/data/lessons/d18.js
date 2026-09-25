// Day 18 lessons: Deploy on AWS + build the capstone. Content lives in topic files; this file only picks it (see ../pick.js).
import aws from "./aws.js";
import capstone from "./capstone.js";

export default {
  ...aws,
  ...capstone,
};
