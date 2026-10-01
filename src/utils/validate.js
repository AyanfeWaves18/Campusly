export const SYMBOLS = ".,/@#&!";

export const passwordRules = (pw = "") => [
  { label: "8 to 15 characters", ok: pw.length >= 8 && pw.length <= 15 },
  { label: "An uppercase letter", ok: /[A-Z]/.test(pw) },
  { label: "A lowercase letter", ok: /[a-z]/.test(pw) },
  { label: "A number", ok: /[0-9]/.test(pw) },
  { label: "A symbol: . , / @ # & !", ok: /[.,\/@#&!]/.test(pw) },
  { label: "Only letters, numbers and . , / @ # & !", ok: /^[A-Za-z0-9.,\/@#&!]*$/.test(pw) },
];

export function checkPassword(pw) {
  if (!pw) return "Enter a password.";
  if (!/^[A-Za-z0-9.,\/@#&!]+$/.test(pw)) return "Use only letters, numbers and these symbols: . , / @ # & !";
  if (pw.length < 8 || pw.length > 15) return "Your password must be 8 to 15 characters long.";
  if (!/[A-Z]/.test(pw)) return "Add at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Add at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Add at least one number.";
  if (!/[.,\/@#&!]/.test(pw)) return "Add at least one symbol: . , / @ # & !";
  return "";
}