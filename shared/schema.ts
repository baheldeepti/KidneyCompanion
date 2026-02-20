import { z } from "zod";

export interface LabEntry {
  name: string;
  value: string;
}

export interface HistoricalPoint {
  date: string;
  labs: LabEntry[];
}

export interface PatientContext {
  age?: number;
  sex?: string;
  monthsPostTransplant?: number;
  donorType?: string;
  medications?: string;
}

export const analyzeRequestSchema = z.object({
  prompt: z.string().min(1),
  imageBase64: z.string().optional(),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

export interface AnalyzeResponse {
  result: string;
}

export const TRANSPLANT_RANGES: Record<string, {
  unit: string;
  healthy: string;
  transplant: string;
  context: string;
  concernHigh?: number;
  concernLow?: number;
}> = {
  "Creatinine": {
    unit: "mg/dL",
    healthy: "0.6-1.2",
    transplant: "1.0-1.8 (stable graft)",
    concernHigh: 2.0,
    context: "Post-transplant creatinine depends on donor kidney quality, time since transplant, and immunosuppressant levels. A stable creatinine — even if above 'normal' — is often more important than the absolute number.",
  },
  "eGFR": {
    unit: "mL/min/1.73m\u00B2",
    healthy: ">90",
    transplant: "30-70 (common functioning graft)",
    concernLow: 30,
    context: "Most transplanted kidneys don't achieve eGFR >90. 50-60 can be perfectly stable for years. Trend over months matters far more than any single reading.",
  },
  "Potassium": {
    unit: "mmol/L",
    healthy: "3.5-5.0",
    transplant: "3.5-5.2",
    concernHigh: 5.5,
    context: "Tacrolimus and calcineurin inhibitors commonly raise potassium. Mildly elevated levels (5.0-5.3) are frequent in transplant patients.",
  },
  "BUN": {
    unit: "mg/dL",
    healthy: "7-20",
    transplant: "10-30",
    concernHigh: 35,
    context: "BUN rises with dehydration, high-protein diet, or reduced graft function. Less specific than creatinine but useful as a supporting indicator.",
  },
  "Tacrolimus Level": {
    unit: "ng/mL",
    healthy: "N/A",
    transplant: "5-12 (varies by time post-transplant)",
    concernHigh: 15,
    context: "Most common anti-rejection drug. Too high risks kidney toxicity; too low risks rejection. Target ranges decrease over time.",
  },
  "Phosphorus": {
    unit: "mg/dL",
    healthy: "2.5-4.5",
    transplant: "2.0-4.5",
    concernLow: 1.5,
    context: "A new transplant often 'wastes' phosphorus due to residual parathyroid hormone elevation.",
  },
  "Hemoglobin": {
    unit: "g/dL",
    healthy: "12-17",
    transplant: "10-15",
    concernLow: 9,
    context: "Anemia is common early post-transplant from medications or residual CKD effects. Usually improves over 6-12 months.",
  },
  "Albumin": {
    unit: "g/dL",
    healthy: "3.5-5.5",
    transplant: "3.5-5.5",
    concernLow: 3.0,
    context: "Low albumin can indicate poor nutrition, inflammation, or protein loss.",
  },
  "Calcium": {
    unit: "mg/dL",
    healthy: "8.5-10.5",
    transplant: "8.5-10.5",
    concernHigh: 11.0,
    concernLow: 7.5,
    context: "Calcium levels can be affected by parathyroid hormone changes common after transplant. Persistent elevation may need evaluation.",
  },
  "Magnesium": {
    unit: "mg/dL",
    healthy: "1.7-2.2",
    transplant: "1.5-2.2",
    concernLow: 1.3,
    context: "Tacrolimus and other calcineurin inhibitors commonly cause magnesium wasting. Supplementation is often needed.",
  },
  "Sodium": {
    unit: "mmol/L",
    healthy: "136-145",
    transplant: "136-145",
    concernHigh: 148,
    concernLow: 130,
    context: "Sodium levels reflect fluid balance. Mild abnormalities are common and often relate to hydration status.",
  },
  "Chloride": {
    unit: "mmol/L",
    healthy: "98-106",
    transplant: "98-106",
    concernHigh: 110,
    concernLow: 95,
    context: "Usually changes alongside sodium. Helps assess acid-base balance.",
  },
  "CO2 (Bicarbonate)": {
    unit: "mmol/L",
    healthy: "23-29",
    transplant: "22-29",
    concernLow: 18,
    context: "Low bicarbonate (metabolic acidosis) can occur with reduced kidney function. Mild decreases are common in transplant patients.",
  },
  "Glucose (Fasting)": {
    unit: "mg/dL",
    healthy: "70-100",
    transplant: "70-130",
    concernHigh: 200,
    context: "Post-transplant diabetes (PTDM) is common due to steroid and tacrolimus use. Blood sugar monitoring is important.",
  },
  "WBC": {
    unit: "x10³/µL",
    healthy: "4.5-11.0",
    transplant: "3.5-11.0",
    concernLow: 3.0,
    concernHigh: 15.0,
    context: "Immunosuppressants like mycophenolate can lower white blood cell counts. Low WBC increases infection risk.",
  },
  "Uric Acid": {
    unit: "mg/dL",
    healthy: "3.0-7.0",
    transplant: "3.0-8.5",
    concernHigh: 9.0,
    context: "Elevated uric acid is common after transplant due to calcineurin inhibitors and reduced kidney clearance. May increase gout risk.",
  },
  "ALT": {
    unit: "U/L",
    healthy: "7-56",
    transplant: "7-56",
    concernHigh: 100,
    context: "Liver enzyme. Monitored because some immunosuppressants can affect liver function.",
  },
  "AST": {
    unit: "U/L",
    healthy: "10-40",
    transplant: "10-40",
    concernHigh: 100,
    context: "Liver enzyme often checked alongside ALT. Elevation may warrant medication review.",
  },
  "Platelets": {
    unit: "x10³/µL",
    healthy: "150-400",
    transplant: "150-400",
    concernLow: 100,
    context: "Low platelets can occur with certain medications. Usually stable in transplant patients.",
  },
};

export const COMMON_LABS = [
  "Creatinine",
  "eGFR",
  "Potassium",
  "BUN",
  "Tacrolimus Level",
  "Hemoglobin",
  "Phosphorus",
  "Albumin",
  "Calcium",
  "Magnesium",
  "Sodium",
  "Glucose (Fasting)",
  "CO2 (Bicarbonate)",
  "WBC",
  "Uric Acid",
  "ALT",
  "AST",
  "Platelets",
  "Chloride",
];
