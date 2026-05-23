const getNewChallenge = require("./wordEngine");

function startNeonTimer(roomId, io, gameSessions) {
  const session = gameSessions[roomId];
  if (!session) return;

  // 1. Clear any existing interval to prevent "double ticking"
  if (session.timerId) clearInterval(session.timerId);

  session.timerId = setInterval(async () => {
    // 2. STOP counting if we are in a "Loading" state (between words)
    if (session.isLoading) return;

    session.timeLeft--;

    // Sync the clock with the frontend
    io.to(roomId).emit("timer-update", session.timeLeft);

    // 3. Logic for when time hits zero
    if (session.timeLeft <= 0) {
      // Flag the session so the interval "idles" while we wait
      session.isLoading = true;
      session.timeOutMessage = "Time's up! Loading next word...";

      // Notify users about the timeout
      io.to(roomId).emit("new-round", {
        message: session.timeOutMessage,
        scrambledWord: "---",
        timeLeft: 0,
      });

      // 4. Wait 5 seconds before switching words
      setTimeout(async () => {
        try {
          const { original, scrambled } = await getNewChallenge();

          // Update server memory
          session.currentWord = original;
          session.scrambledWord = scrambled;
          session.timeLeft = 45;
          session.isLoading = false; // Resume the timer countdown

          // Tell the frontend the new word is ready
          io.to(roomId).emit("new-round", {
            message: "GO!",
            scrambledWord: scrambled,
            timeLeft: 45,
          });
        } catch (err) {
          // console.error("Game Error:", err.message);

          // Tell the users exactly what happened
          io.to(roomId).emit("new-round", {
            message: "Connection Error: Failed to fetch new word.",
            scrambledWord: "ERR",
            timeLeft: 0,
          });

          // Try again automatically in 10 seconds
          setTimeout(() => {
            session.isLoading = false;
            session.timeLeft = 1; // Trigger the check again
          }, 10000);
        }
      }, 5000);
    }
  }, 1000);
}
module.exports = startNeonTimer;
