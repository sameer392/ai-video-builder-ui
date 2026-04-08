const fs = require("fs/promises");
const path = require("path");

const templatePath = path.join(__dirname, "../../workflow.json");

async function loadWorkflowTemplate() {
  const raw = await fs.readFile(templatePath, "utf-8");
  return JSON.parse(raw);
}

async function buildWorkflow({ loraName, promptText }) {
  const workflow = await loadWorkflowTemplate();

  if (!workflow?.lora_node?.inputs || !workflow?.prompt_node?.inputs) {
    throw new Error("workflow.json missing expected lora_node/prompt_node structure.");
  }

  workflow.lora_node.inputs.lora_name = loraName;
  workflow.prompt_node.inputs.text = promptText;
  return workflow;
}

module.exports = {
  buildWorkflow,
};
