const GENRE_LABELS_UA: Record<string, string> = {
  action: "екшен",
  adventure: "пригоди",
  animation: "анімація",
  comedy: "комедія",
  crime: "кримінал",
  documentary: "документальне",
  drama: "драма",
  family: "сімейне",
  fantasy: "фентезі",
  history: "історичне",
  horror: "жахи",
  music: "музичне",
  mystery: "містика",
  romance: "романтика",
  "science fiction": "наукова фантастика",
  thriller: "трилер",
  war: "військове",
  western: "вестерн",
};

export function localizeGenre(genre: string): string {
  return GENRE_LABELS_UA[genre.toLowerCase()] ?? genre;
}
