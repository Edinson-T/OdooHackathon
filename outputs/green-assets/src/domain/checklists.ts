import type { AssetType, Checklist } from "./types";
const prompts = {
  farm: [
    "Are the irrigation lines intact?",
    "Is the soil free from visible erosion?",
    "Are drainage channels clear?",
  ],
  pond: [
    "Is the outlet clear?",
    "Are the banks stable?",
    "Is the water free of visible contamination?",
  ],
  solar_system: [
    "Are the panels intact?",
    "Are the mounts secure?",
    "Is the inverter showing normal operation?",
  ],
};
export function checklist(type: AssetType): Checklist {
  return {
    version: 1,
    questions: prompts[type].map((label, i) => ({ id: type + "-" + i, label })),
  };
}
