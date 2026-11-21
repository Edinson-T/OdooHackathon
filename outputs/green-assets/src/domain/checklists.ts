import type { AssetType, Checklist, HazardType } from "./types";
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
// Extra checks when a hazard sent the inspector. Each is worded so that
// "Pass" means no problem. They ask only for general measures: drain, empty,
// clear, cover, repair or report.
const hazardPrompts: Record<HazardType, Partial<Record<AssetType, string[]>>> = {
  // Asked on the first day after heavy rain.
  rainfall: {
    solar_system: [
      "Are the panels free of pooled water, mud and debris?",
      "Is the equipment free of visible water damage? Report damage, do not touch it.",
    ],
  },
  heat: {
    farm: [
      "Is the soil moist enough for the crop?",
      "Is the irrigation running and reaching every bed?",
    ],
  },
  dengue: {},
};
export function hazardQuestions(type: AssetType, hazard: HazardType) {
  return (hazardPrompts[hazard][type] ?? []).map((label, i) => ({
    id: hazard + "-" + type + "-" + i,
    label,
  }));
}
export function checklist(type: AssetType, hazards: HazardType[] = []): Checklist {
  return {
    version: 1,
    questions: [
      ...prompts[type].map((label, i) => ({ id: type + "-" + i, label })),
      ...hazards.flatMap((hazard) => hazardQuestions(type, hazard)),
    ],
  };
}
