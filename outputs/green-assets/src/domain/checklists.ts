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
const hazardPrompts: Record<HazardType, Record<AssetType, string[]>> = {
  rainfall: {
    farm: ["Are trays, pots and containers emptied or covered?"],
    pond: ["Is the overflow path clear?"],
    solar_system: ["Is water draining freely from the mounts and trays?"],
  },
  flooding: {
    farm: ["Has the floodwater drained from the plot?"],
    pond: ["Has the pond stayed within its banks?"],
    solar_system: [
      "Is the equipment free of visible water damage? Report damage, do not touch it.",
    ],
  },
  mosquito: {
    farm: ["Is the plot free of standing water in containers, trays and channels?"],
    pond: ["Is the water moving, with no stagnant edges?"],
    solar_system: ["Are the mounts and trays free of pooled water?"],
  },
};
export function hazardQuestions(type: AssetType, hazard: HazardType) {
  return hazardPrompts[hazard][type].map((label, i) => ({
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
