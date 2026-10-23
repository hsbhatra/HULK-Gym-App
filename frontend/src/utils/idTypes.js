// =============================================================================
// src/utils/idTypes.js
// =============================================================================
// Government ID types accepted at the gym (Aadhaar is deliberately not one).
// Format checks here only give quick feedback — the server checks again.
// =============================================================================

export const ID_TYPE_OPTIONS = [
  { value: "pan", label: "PAN card", example: "ABCDE1234F", rx: /^[A-Z]{5}\d{4}[A-Z]$/, hint: "A PAN has 10 characters, like ABCDE1234F." },
  { value: "driving_licence", label: "Driving licence", example: "RJ1420110012345", rx: /^[A-Z]{2}\d{2}[A-Z0-9]{8,12}$/, hint: "A driving licence number starts with the state code and 2 digits, like RJ1420110012345." },
  { value: "voter_id", label: "Voter ID (EPIC)", example: "ABC1234567", rx: /^[A-Z]{3}\d{7}$/, hint: "A Voter ID has 3 letters and 7 digits, like ABC1234567." },
  { value: "passport", label: "Passport", example: "K1234567", rx: /^[A-Z]\d{7}$/, hint: "A passport number has 1 letter and 7 digits, like K1234567." },
  { value: "other", label: "Other government ID", example: "", rx: /^[A-Z0-9]{4,20}$/, hint: "Use 4 to 20 letters or digits." },
];

export const idTypeLabel = (value) =>
  ID_TYPE_OPTIONS.find((o) => o.value === value)?.label || "ID";

export const normaliseIdNumber = (raw) =>
  String(raw ?? "").toUpperCase().replace(/[\s-]/g, "");

// Returns a message, or "" when the number looks right
export const checkIdNumber = (docType, number) => {
  const opt = ID_TYPE_OPTIONS.find((o) => o.value === docType);
  if (!opt) return "Please choose the ID type.";
  if (!number) return "Please enter the ID number.";
  if (/^\d{12}$/.test(number)) return "Aadhaar numbers are not accepted. Please use another government ID.";
  if (!opt.rx.test(number)) return `That doesn't look right. ${opt.hint}`;
  return "";
};
