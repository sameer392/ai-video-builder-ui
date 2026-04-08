const fs = require("fs/promises");
const path = require("path");

const templatePath = path.join(__dirname, "../../training-workflow.json");

async function loadTrainingTemplate() {
  const raw = await fs.readFile(templatePath, "utf-8");
  return JSON.parse(raw);
}

async function buildTrainingWorkflow({ person, outputLoraName, trainingSubfolder, trainingFiles }) {
  const workflow = await loadTrainingTemplate();

  if (!workflow?.dataset_node?.inputs || !workflow?.training_node?.inputs) {
    throw new Error(
      "training-workflow.json missing expected dataset_node/training_node structure."
    );
  }

  workflow.dataset_node.inputs.person_name = person;
  workflow.dataset_node.inputs.image_subfolder = trainingSubfolder;
  workflow.dataset_node.inputs.image_files = trainingFiles;

  workflow.training_node.inputs.output_lora_name = outputLoraName;
  workflow.training_node.inputs.steps = Number(process.env.TRAINING_STEPS || 1200);
  workflow.training_node.inputs.learning_rate = Number(process.env.TRAINING_LR || 0.0001);

  return workflow;
}

module.exports = {
  buildTrainingWorkflow,
};
