// Nigerian universities by type. The text in brackets, e.g. (UI), is the short name people search by.
// What gets saved on a profile is the full name without the brackets.

const FEDERAL = [
  "University of Ibadan (UI)",
  "University of Nigeria, Nsukka (UNN)",
  "Ahmadu Bello University (ABU)",
  "Obafemi Awolowo University (OAU)",
  "University of Lagos (UNILAG)",
  "University of Benin (UNIBEN)",
  "University of Ilorin (UNILORIN)",
  "University of Jos (UNIJOS)",
  "University of Calabar (UNICAL)",
  "Bayero University Kano (BUK)",
  "University of Maiduguri (UNIMAID)",
  "University of Port Harcourt (UNIPORT)",
  "University of Abuja (UNIABUJA)",
  "Federal University of Technology, Akure (FUTA)",
  "Federal University of Technology, Minna (FUTMINNA)",
  "Federal University of Technology, Owerri (FUTO)",
  "Abubakar Tafawa Balewa University (ATBU)",
  "Michael Okpara University of Agriculture (MOUAU)",
  "Modibbo Adama University (MAU)",
  "Federal University of Agriculture, Abeokuta (FUNAAB)",
  "Federal University, Oye-Ekiti (FUOYE)",
  "Federal University, Lokoja (FUL)",
  "Federal University, Lafia (FULAFIA)",
  "Federal University, Dutse (FUD)",
  "Federal University, Kashere (FUK)",
  "Federal University, Dutsin-Ma (FUDMA)",
  "Federal University, Otuoke (FUOTUOKE)",
  "Federal University, Wukari (FUWUKARI)",
  "Federal University, Birnin Kebbi (FUBK)",
  "Federal University, Gusau (FUGUS)",
  "Federal University of Petroleum Resources, Effurun (FUPRE)",
  "National Open University of Nigeria (NOUN)",
  "Nigerian Defence Academy (NDA)",
  "Nigeria Police Academy (POLAC)",
  "Nigerian Army University, Biu",
  "Nigerian Maritime University",
  "Air Force Institute of Technology (AFIT)",
  "Alex Ekwueme Federal University, Ndufu-Alike",
  "Federal University of Health Sciences, Otukpo",
  "Federal University of Health Sciences, Azare",
];

const STATE = [
  "Abia State University (ABSU)",
  "Adamawa State University (ADSU)",
  "Akwa Ibom State University (AKSU)",
  "Ambrose Alli University (AAU)",
  "Chukwuemeka Odumegwu Ojukwu University (COOU)",
  "Delta State University (DELSU)",
  "Ebonyi State University (EBSU)",
  "Edo State University (EDSU)",
  "Ekiti State University (EKSU)",
  "Enugu State University of Science and Technology (ESUT)",
  "Gombe State University (GSU)",
  "Imo State University (IMSU)",
  "Kaduna State University (KASU)",
  "Kebbi State University of Science and Technology (KSUSTA)",
  "Lagos State University (LASU)",
  "Ladoke Akintola University of Technology (LAUTECH)",
  "Nasarawa State University (NSUK)",
  "Niger Delta University (NDU)",
  "Olabisi Onabanjo University (OOU)",
  "Osun State University (UNIOSUN)",
  "Plateau State University (PLASU)",
  "Rivers State University (RSU)",
  "Sokoto State University (SSU)",
  "Sule Lamido University (SLU)",
  "Tai Solarin University of Education (TASUED)",
  "Umaru Musa Yar'Adua University (UMYU)",
  "Yobe State University (YSU)",
  "Zamfara State University (ZAMSU)",
  "Prince Abubakar Audu University (PAAU)",
  "Borno State University (BOSU)",
  "University of Africa, Toru-Orua",
  "Bayelsa Medical University (BMU)",
  "First Technical University, Ibadan",
  "Lagos State University of Education (LASUED)",
  "Lagos State University of Science and Technology (LASUSTECH)",
  "University of Medical Sciences, Ondo (UNIMED)",
  "Confluence University of Science and Technology (CUSTECH)",
  "University of Delta (UNIDEL)",
  "Dennis Osadebay University",
  "University of Science and Technology, Ozoro",
];

// Pan-Atlantic University and Baze University were on your list twice; they appear once here.
const PRIVATE = [
  "Crawford University",
  "Covenant University",
  "Babcock University",
  "Bowen University",
  "Redeemer's University",
  "Bingham University",
  "Bells University of Technology",
  "Igbinedion University",
  "Madonna University",
  "Benson Idahosa University",
  "American University of Nigeria",
  "Pan-Atlantic University",
  "Afe Babalola University",
  "Aletheia University",
  "Ajayi Crowther University",
  "Al-Hikmah University",
  "Al-Qalam University",
  "Achievers University",
  "Adeleke University",
  "Caleb University",
  "Caritas University",
  "Crescent University",
  "Joseph Ayo Babalola University",
  "Lead City University",
  "Landmark University",
  "Veritas University",
  "Nile University of Nigeria",
  "Baze University",
  "Skyline University Nigeria",
  "Elizade University",
  "Godfrey Okoye University",
  "Novena University",
  "Tansian University",
  "Paul University",
  "Gregory University",
  "Kwararafa University",
  "Salem University",
  "Fountain University",
  "Oduduwa University",
  "Kings University",
  "Augustine University",
  "Anchor University",
  "Eko University of Medical Sciences",
  "Maranatha University",
  "James Hope University",
  "Arthur Jarvis University",
  "Havilla University",
  "Wigwe University",
  "Topfaith University",
  "Ritman University",
  "Obong University",
  "Hezekiah University",
  "Claretian University of Nigeria",
  "Al-Ansar University",
  "Miva Open University",
  "Cosmopolitan University",
  "Canadian University of Nigeria",
  "Philomath University",
  "European University of Nigeria",
  "Thomas Adewumi University",
  "Kola Daisi University",
  "Dominican University",
  "Atiba University",
  "Dominion University",
  "Precious Cornerstone University",
  "Westland University",
  "Greenfield University",
  "Azman University",
  "Capital City University",
  "Maryam Abacha American University of Nigeria",
  "Peter University",
  "University on the Niger",
  "Shanahan University",
  "Tazkiyah University",
  "Hensard University",
  "African University of Science and Technology",
  "Summit University",
  "Al-Istiqama University",
];

// "University of Ibadan (UI)" becomes { name: "University of Ibadan", short: "UI" }
function parse(text) {
  const m = text.match(/^(.*?)\s*\(([^)]+)\)$/);
  return m ? { name: m[1], short: m[2] } : { name: text, short: "" };
}

export const UNI_TYPES = [
  { id: "private", label: "Private", hint: "Crawford, Covenant, Babcock…" },
  { id: "federal", label: "Federal", hint: "UI, UNILAG, OAU…" },
  { id: "state", label: "State", hint: "LASU, OOU, EKSU…" },
];

export const UNIVERSITIES = {
  private: PRIVATE.map(parse),
  federal: FEDERAL.map(parse),
  state: STATE.map(parse),
};

// Tidy a school name that someone typed in by hand.
// Returns { name } when it is usable, or { error } when it is not.
export function cleanCustomName(raw) {
  const name = (raw || "").replace(/\s+/g, " ").trim();
  if (name.length < 3) return { error: "Type the full name of your school." };
  if (name.length > 80) return { error: "That name is too long. Keep it under 80 characters." };
  if (!/^[A-Za-z0-9 .,'&()\-]+$/.test(name)) {
    return { error: "Use letters, numbers and . , ' & ( ) - only." };
  }
  return { name };
}

// If what was typed is already on a list (by name or short name), give back the listed version,
// so one school never ends up spelled two ways.
export function findListed(name) {
  const n = name.toLowerCase();
  for (const type of Object.keys(UNIVERSITIES)) {
    const hit = UNIVERSITIES[type].find(
      (u) => u.name.toLowerCase() === n || (u.short && u.short.toLowerCase() === n)
    );
    if (hit) return hit.name;
  }
  return "";
}