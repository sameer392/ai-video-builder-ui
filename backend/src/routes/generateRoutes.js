const express = require("express");
const personConfig = require("../config/personConfig");
const { addHistory, getHistory } = require("../config/historyStore");
const { getLatestReadyLora } = require("../config/modelStore");
const { buildWorkflow } = require("../services/workflowService");
const { submitPrompt, pollForMedia } = require("../services/comfyClient");

const router = express.Router();

router.get("/persons", (_req, res) => {
  const people = Object.entries(personConfig).map(([id, config]) => ({
    id,
    lora: config.lora,
    style: config.style,
  }));
  res.json({ people });
});

router.get("/history", async (_req, res) => {
  try {
    const items = await getHistory();
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to fetch history." });
  }
});

router.post("/generate", async (req, res) => {
  try {
    const { person, script } = req.body;

    if (!person || !script) {
      return res.status(400).json({ error: "person and script are required." });
    }

    const selectedPerson = personConfig[person.toLowerCase()];
    if (!selectedPerson) {
      return res.status(400).json({ error: `Unknown person: ${person}` });
    }

    const trainedLora = await getLatestReadyLora(person.toLowerCase());
    const finalLora = trainedLora || selectedPerson.lora;
    const finalPrompt = `${script}\n\nStyle: ${selectedPerson.style}`;
    const workflow = await buildWorkflow({
      loraName: finalLora,
      promptText: finalPrompt,
    });

    const promptId = await submitPrompt(workflow);
    const media = await pollForMedia(promptId);

    const historyItem = {
      id: promptId,
      person: person.toLowerCase(),
      script,
      style: selectedPerson.style,
      type: media.type,
      url: media.url,
      createdAt: new Date().toISOString(),
    };
    await addHistory(historyItem);

    return res.json({
      promptId,
      mediaUrl: media.url,
      mediaType: media.type,
      historyItem,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Generation failed.",
    });
  }
});

module.exports = router;
