// Function to scramble remaining characters
function scrambleRemainingCharacters(
  element,
  revealedLength,
  totalLength,
  chars
) {
  let scrambledText = element.textContent.substring(0, revealedLength); // Revealed part
  for (let i = revealedLength; i < totalLength; i++) {
    scrambledText += chars[Math.floor(Math.random() * chars.length)]; // Scrambled part
  }
  element.textContent = scrambledText;
}

// Function to sequentially reveal text
function sequentialReveal(element, finalText, duration = 2) {
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  const totalLength = finalText.length;
  let revealedLength = 0;

  // GSAP timeline for the sequential reveal
  const tl = gsap.timeline();

  // Add a tween for each character
  for (let i = 0; i < totalLength; i++) {
    tl.to(
      {},
      {
        duration: duration / totalLength,
        onStart: () => {
          revealedLength = i + 1; // Increment revealed length
        },
        onUpdate: () => {
          // Scramble the remaining characters
          scrambleRemainingCharacters(
            element,
            revealedLength,
            totalLength,
            chars
          );
        },
        onComplete: () => {
          // Set the final character
          element.textContent =
            finalText.substring(0, revealedLength) +
            element.textContent.substring(revealedLength);
        },
      }
    );
  }

  return tl;
}

// Usage
const textElement = document.getElementById('scramble-text');
sequentialReveal(textElement, 'Jerry', 4);
