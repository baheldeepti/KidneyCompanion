import type { LabEntry, HistoricalPoint, PatientContext } from "@shared/schema";

export const DEMO_LABS: LabEntry[] = [
  { name: "Creatinine", value: "1.6 mg/dL" },
  { name: "eGFR", value: "52 mL/min/1.73m\u00B2" },
  { name: "Potassium", value: "4.9 mmol/L" },
  { name: "BUN", value: "28 mg/dL" },
  { name: "Tacrolimus Level", value: "8.2 ng/mL" },
  { name: "Hemoglobin", value: "11.4 g/dL" },
  { name: "Phosphorus", value: "2.8 mg/dL" },
  { name: "Albumin", value: "3.9 g/dL" },
];

export const DEMO_HISTORY: HistoricalPoint[] = [
  {
    date: "2024-12 (Month 2)",
    labs: [
      { name: "Creatinine", value: "1.9 mg/dL" },
      { name: "eGFR", value: "42 mL/min/1.73m\u00B2" },
      { name: "Potassium", value: "5.2 mmol/L" },
      { name: "BUN", value: "32 mg/dL" },
    ],
  },
  {
    date: "2025-02 (Month 4)",
    labs: [
      { name: "Creatinine", value: "1.7 mg/dL" },
      { name: "eGFR", value: "48 mL/min/1.73m\u00B2" },
      { name: "Potassium", value: "5.0 mmol/L" },
      { name: "BUN", value: "30 mg/dL" },
    ],
  },
  {
    date: "2025-04 (Month 6)",
    labs: [
      { name: "Creatinine", value: "1.6 mg/dL" },
      { name: "eGFR", value: "50 mL/min/1.73m\u00B2" },
      { name: "Potassium", value: "4.8 mmol/L" },
      { name: "BUN", value: "27 mg/dL" },
    ],
  },
];

export const DEMO_CTX: PatientContext = {
  age: 54,
  sex: "Male",
  monthsPostTransplant: 8,
  donorType: "Deceased donor",
  medications: "Tacrolimus, Mycophenolate, Prednisone 5mg, Valganciclovir",
};
