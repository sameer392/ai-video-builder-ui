const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const personConfig = require("../config/personConfig");
const { buildTrainingWorkflow } = require("../services/trainingWorkflowService");
const { submitPrompt, uploadTrainingImage, pollForSafetensor } = require("../services/comfyClient");
const { insertTrainingJob, updateTrainingJob, getTrainingJobs } = require("../config/modelStore");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/train/jobs", async (_req, res) => {
  try {
    const jobs = await getTrainingJobs();
    res.json({ jobs });
  } catch (error) {
    res.status(500).json({ error: error.message || "Unable to fetch training jobs." });
  }
});

router.post("/train/start", upload.array("photos", 30), async (req, res) => {
  try {
    const person = String(req.body.person || "").toLowerCase();
    const files = req.files || [];

    if (!person || !personConfig[person]) {
      return res.status(400).json({ error: "Valid person is required." });
    }
    if (files.length < 25 || files.length > 30) {
      return res.status(400).json({ error: "Upload 25 to 30 photos for training." });
    }

    const jobId = uuidv4();
    const trainingSubfolder = `training/${person}/${jobId}`;
    const uploadedNames = [];

    for (const file of files) {
      const safeName = `${Date.now()}-${file.originalname}`.replace(/\s+/g, "-");
      // Upload each image to ComfyUI input storage for workflow consumption.
      await uploadTrainingImage({
        fileBuffer: file.buffer,
        fileName: safeName,
        subfolder: trainingSubfolder,
      });
      uploadedNames.push(safeName);
    }

    const outputLoraName = `${person}-${jobId}.safetensors`;
    const workflow = await buildTrainingWorkflow({
      person,
      outputLoraName,
      trainingSubfolder,
      trainingFiles: uploadedNames,
    });
    const promptId = await submitPrompt(workflow);
    const now = new Date().toISOString();

    await insertTrainingJob({
      person,
      promptId,
      loraName: outputLoraName,
      status: "queued",
      trainingImages: files.length,
      createdAt: now,
      updatedAt: now,
    });

    res.json({
      message: "Training started.",
      promptId,
      expectedLoraName: outputLoraName,
      imageCount: files.length,
    });

    // Continue tracking training in background.
    pollForSafetensor(promptId)
      .then(async (trainedLoraName) => {
        await updateTrainingJob(promptId, {
          loraName: trainedLoraName || outputLoraName,
          status: "completed",
          errorMessage: null,
          updatedAt: new Date().toISOString(),
        });
      })
      .catch(async (error) => {
        await updateTrainingJob(promptId, {
          status: "failed",
          errorMessage: error.message || "Training failed.",
          updatedAt: new Date().toISOString(),
        });
      });

    return undefined;
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to start training." });
  }
});

module.exports = router;
