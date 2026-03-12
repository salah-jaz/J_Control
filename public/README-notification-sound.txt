Planner reminder sound (required for sound to play)
==================================================
Place the reminder sound file at:

  public/sounds/reminder.mp3

So the app can load it as: /sounds/reminder.mp3

Test in browser: http://localhost:5173/sounds/reminder.mp3
If that URL does not open or play, the path is wrong.

- Used by: (1) "10 minutes before" reminder toast (any page), (2) in-app event reminder popup (Planner page).
- Volume is set to 1; one global Audio instance is used and reset with currentTime = 0 when playing.
- Browsers block autoplay until the user has interacted with the page (e.g. one click); the app unlocks audio on first click.

Optional fallbacks (if you use a different path): public/reminder.mp3 or public/notification.mp3 — you would need to change the path in code (App.jsx and Planner.jsx) to match.

Use any short .mp3. Free sounds: freesound.org or similar.
