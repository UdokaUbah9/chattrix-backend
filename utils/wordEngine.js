const getNewChallenge = async () => {
  // Generates a random length between 3 and 6
  const wordLength = Math.floor(Math.random() * (7 - 3)) + 3;

  try {
    const response = await fetch(
      `https://api.datamuse.com/words?sp=${"?".repeat(wordLength)}&max=50`,
      { cache: "no-store" },
    );

    if (!response.ok) throw new Error("API_UNREACHABLE");

    const data = await response.json();

    const cleanWords = data.filter((item) => /^[a-zA-Z]+$/.test(item.word));

    // Safety check: ensure the API actually returned results
    if (!cleanWords || cleanWords.length === 0)
      throw new Error("NO_WORDS_FOUND");

    const randomIndex = Math.floor(Math.random() * cleanWords.length);
    const original = cleanWords[randomIndex].word.toLowerCase();

    const scrambled = original
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    // If scramble fails (same as original), simple reverse instead of full recursion
    if (scrambled === original && original.length > 1) {
      return {
        original,
        scrambled: original.split("").reverse().join(""),
      };
    }

    return { original, scrambled };
  } catch (error) {
    // Throwing so the socket handler catches it and kicks/logs out users
    throw error;
  }
};

module.exports = getNewChallenge;
