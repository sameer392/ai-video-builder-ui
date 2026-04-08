const axios = require("axios");

function getComfyBaseUrl() {
  const baseUrl = process.env.SERVER_COMFY_URL;
  if (!baseUrl) {
    throw new Error("SERVER_COMFY_URL is not configured.");
  }
  return baseUrl.replace(/\/+$/, "");
}

async function submitPrompt(workflow) {
  const comfyBaseUrl = getComfyBaseUrl();
  const payload = { prompt: workflow };
  const response = await axios.post(`${comfyBaseUrl}/prompt`, payload, {
    timeout: 30000,
  });

  const promptId = response.data?.prompt_id;
  if (!promptId) {
    throw new Error("ComfyUI did not return prompt_id.");
  }

  return promptId;
}

async function fetchHistoryByPromptId(promptId) {
  const comfyBaseUrl = getComfyBaseUrl();

  try {
    const response = await axios.get(`${comfyBaseUrl}/history/${promptId}`, {
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    // Fallback for setups that only support /history
    const fallback = await axios.get(`${comfyBaseUrl}/history`, { timeout: 30000 });
    return fallback.data;
  }
}

function resolveMediaFromOutputs(outputs) {
  if (!outputs || typeof outputs !== "object") {
    return null;
  }

  for (const nodeOutput of Object.values(outputs)) {
    const image = nodeOutput?.images?.[0];
    if (image?.filename) {
      return {
        type: "image",
        path: `/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(
          image.subfolder || ""
        )}&type=${encodeURIComponent(image.type || "output")}`,
      };
    }

    const video = nodeOutput?.gifs?.[0] || nodeOutput?.videos?.[0];
    if (video?.filename) {
      return {
        type: "video",
        path: `/view?filename=${encodeURIComponent(video.filename)}&subfolder=${encodeURIComponent(
          video.subfolder || ""
        )}&type=${encodeURIComponent(video.type || "output")}`,
      };
    }
  }

  return null;
}

function extractMediaUrl(historyData, promptId) {
  const record = historyData?.[promptId] || historyData;
  const outputs = record?.outputs || historyData?.[promptId]?.outputs;
  const media = resolveMediaFromOutputs(outputs);
  if (!media) {
    return null;
  }

  const comfyBaseUrl = getComfyBaseUrl();
  return {
    type: media.type,
    url: `${comfyBaseUrl}${media.path}`,
  };
}

async function pollForMedia(promptId, { maxAttempts = 25, intervalMs = 2000 } = {}) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const history = await fetchHistoryByPromptId(promptId);
    const media = extractMediaUrl(history, promptId);
    if (media) {
      return media;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out while waiting for ComfyUI output.");
}

module.exports = {
  submitPrompt,
  pollForMedia,
};
