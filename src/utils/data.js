export const profiles = [
  { id: 1, name: "Tomi", age: 21, gender: "Female", department: "Mass Communication", level: "300 level", lookingFor: "Dating", bio: "Jollof critic. Football on weekends.", tags: ["Music", "Movies"], likedYou: true, verified: true, bg: "#F4C0D1", fg: "#72243E", prompt: { q: "Best spot on campus?", a: "The library steps at sunset." } },
  { id: 2, name: "Debby", age: 20, gender: "Female", department: "Law", level: "200 level", lookingFor: "Both", bio: "Reads too much. Always up for a good debate.", tags: ["Books", "Travel"], likedYou: false, verified: true, bg: "#CECBF6", fg: "#3C3489", prompt: { q: "My most unpopular opinion is...", a: "Pineapple belongs on pizza." } },
  { id: 3, name: "Kunle", age: 22, gender: "Male", department: "Computer Science", level: "400 level", lookingFor: "Dating", bio: "Gym, code, repeat. Ask me about my side project.", tags: ["Fitness", "Tech"], likedYou: true, verified: false, bg: "#F5C4B3", fg: "#712B13", prompt: { q: "You'll find me at...", a: "The lab, past midnight." } },
  { id: 4, name: "Sade", age: 19, gender: "Female", department: "Architecture", level: "100 level", lookingFor: "Friends", bio: "Photographer. I will take your picture without asking.", tags: ["Photography", "Art"], likedYou: false, verified: true, bg: "#9FE1CB", fg: "#085041", prompt: { q: "Best spot on campus?", a: "The chapel garden." } },
  { id: 5, name: "Emeka", age: 23, gender: "Male", department: "Engineering", level: "500 level", lookingFor: "Both", bio: "Gamer, chef in training, terrible at karaoke.", tags: ["Gaming", "Food"], likedYou: true, verified: true, bg: "#FAC775", fg: "#633806", prompt: { q: "Cafeteria food: rate it.", a: "6/10. The rice saves it." } },
  { id: 6, name: "Ife", age: 21, gender: "Female", department: "Psychology", level: "300 level", lookingFor: "Dating", bio: "I'll analyse your playlist and tell you who you are.", tags: ["Music", "Books"], likedYou: false, verified: false, bg: "#C0DD97", fg: "#27500A", prompt: { q: "You'll find me at...", a: "Wherever the good jollof is." } },
  { id: 7, name: "Chidi", age: 20, gender: "Male", department: "Economics", level: "200 level", lookingFor: "Friends", bio: "Football fan, spreadsheet lover, always early.", tags: ["Football", "Tech"], likedYou: true, verified: true, bg: "#B5D4F4", fg: "#0C447C", prompt: { q: "My most unpopular opinion is...", a: "Group projects are fun." } },
  { id: 8, name: "Zainab", age: 22, gender: "Female", department: "Nursing", level: "400 level", lookingFor: "Both", bio: "Night shifts, good coffee, better jokes.", tags: ["Food", "Dance"], likedYou: false, verified: true, bg: "#F4C0D1", fg: "#72243E", prompt: { q: "Cafeteria food: rate it.", a: "Depends who's cooking." } },
  { id: 9, name: "Bode", age: 21, gender: "Male", department: "Business Administration", level: "300 level", lookingFor: "Dating", bio: "Future CEO. Currently just good at pitching ideas.", tags: ["Fashion", "Travel"], likedYou: true, verified: false, bg: "#CECBF6", fg: "#3C3489", prompt: { q: "Best spot on campus?", a: "The sports complex." } },
  { id: 10, name: "Amaka", age: 19, gender: "Female", department: "Microbiology", level: "100 level", lookingFor: "Both", bio: "Lab coat by day, Afrobeats by night.", tags: ["Music", "Dance"], likedYou: false, verified: true, bg: "#F5C4B3", fg: "#712B13", prompt: { q: "You'll find me at...", a: "The 9pm hostel dance-off." } },
];

const at = (days, hour, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
};

export const events = [
  { id: 1, title: "Freshers' Night", type: "Party", start: at(2, 18), where: "Main Auditorium", desc: "Music, games and a chance to meet new people." },
  { id: 3, title: "Inter-Faculty Football", type: "Sports", start: at(3, 16), where: "Sports Complex", desc: "Come cheer your faculty on." },
  { id: 4, title: "Study Jam", type: "Academic", start: at(1, 19), where: "Library, 2nd floor", desc: "Group study with free tea and biscuits." },
  { id: 5, title: "Movie Night", type: "Party", start: at(5, 19, 30), where: "Student Centre Lawn", desc: "Outdoor screening. Bring a blanket." },
  { id: 6, title: "Career Talk", type: "Academic", start: at(4, 15), where: "Lecture Theatre 2", desc: "Alumni share how they got their first jobs." },
];

export const formatWhen = (t) =>
  new Date(t).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export const userPhotos = (u = {}) => (u.photos?.length ? u.photos : u.photo ? [u.photo] : []);

export const receivedCompliments = [
  { id: 1, text: "Someone from your department thinks you're cool.", when: "2 days ago" },
  { id: 2, text: "Someone thinks you have great energy.", when: "Last week" },
];

export function completeness(u = {}) {
  const items = [
    { label: "Add a photo", done: userPhotos(u).length > 0 },
    { label: "Write a short bio", done: !!u.bio?.trim() },
    { label: "Answer an icebreaker prompt", done: Object.values(u.prompts || {}).some(Boolean) },
    { label: "Pick at least 3 interests", done: (u.interests || []).length >= 3 },
  ];
  const done = items.filter((i) => i.done).length;
  return { pct: 40 + done * 12, items, next: items.find((i) => !i.done)?.label };
}

// Switch this on when email confirmation is turned on. The "Verify" item then shows only for
// people who signed up by email (the user object also needs a `provider` field when you do).
const SHOW_VERIFY_ITEM = false;

export function completeness(u = {}) {
  const realPhotos = (u.photos || []).filter((p) => typeof p === "string" && !p.startsWith("data:"));

  const items = [
    { id: "photo", label: "Add a photo", cta: "Add", done: realPhotos.length > 0 },
    { id: "bio", label: "Write a short bio", cta: "Write", done: !!u.bio?.trim() },
    {
      id: "prompt",
      label: "Answer an icebreaker prompt",
      cta: "Answer",
      done: Object.values(u.prompts || {}).some(Boolean),
    },
    { id: "interests", label: "Pick at least 3 interests", cta: "Pick", done: (u.interests || []).length >= 3 },
  ];

  if (SHOW_VERIFY_ITEM && u.provider === "email") {
    items.push({ id: "verify", label: "Verify your account", cta: "Verify", done: !!u.verified });
  }

  const done = items.filter((i) => i.done).length;
  return {
    pct: Math.round(40 + (done / items.length) * 60),
    items,
    next: items.find((i) => !i.done)?.label,
  };
}