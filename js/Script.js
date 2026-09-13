/**
 * script.js
 * -------------------------------------------------------
 * Handles state switching between "professional" and
 * "personal" modes. No page reload, no navigation, no
 * elaborate transitions — abrupt, like a light switch.
 * -------------------------------------------------------
 */

(function () {
  "use strict";

  var body = document.body;
  var toggleButton = document.getElementById("modeToggle");
  var audioElement = document.getElementById("switchSound");

  var revealImage = document.getElementById("revealImage");
  var revealGif = document.getElementById("revealGif");
  var revealSound = document.getElementById("revealSound");

  var portfolioNotification = document.getElementById("portfolioNotification");
  var portfolioNotificationContent = document.getElementById("portfolioNotificationContent");
  var portfolioNotificationYes = document.getElementById("portfolioNotificationYes");
  var portfolioNotificationNo = document.getElementById("portfolioNotificationNo");

  var notificationTimer = null;
  var notificationCloseTimer = null;
  var NOTIFICATION_DELAY_MS = 12000;
  var NOTIFICATION_THANK_YOU_DURATION_MS = 2000;
  var NOTIFICATION_GAP_PX = 16;
  var NOTIFICATION_SIDE_GAP_PX = 18;

  var MODE_PROFESSIONAL = "mode-professional";
  var MODE_PERSONAL = "mode-personal";
  var REVEAL_ACTIVE = "reveal-active";

  // How long the static image sits in silence before the gif/sound
  // takes over, and how long the gif/sound phase lasts before the
  // redirect. Kept as named constants so timings are easy to tune.
  var IMAGE_HOLD_MS = 0;
  var GIF_SOUND_DURATION_MS = 3100;
  var REDIRECT_URL = "portfolio.html";

  /**
   * Plays the light-switch click sound.
   *
   * Primary path: play assets/sounds/light-switch.mp3 via the
   * <audio> element already declared in index.html. Nothing in
   * this function needs to change once a real audio file is
   * dropped into assets/sounds/light-switch.mp3 — it will just
   * start working.
   *
   * Fallback path: if the file is missing/unplayable (e.g. this
   * prototype was generated without a real audio asset), a very
   * short synthetic "click" is generated with the Web Audio API
   * so the interaction still has audible feedback.
   */
  function playSwitchSound() {
    if (audioElement && audioElement.src) {
      audioElement.currentTime = 0;
      var playPromise = audioElement.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          playFallbackClick();
        });
      }
      return;
    }

    playFallbackClick();
  }

  /**
   * Generates a short, subtle mechanical "click" using the
   * Web Audio API. Used only as a fallback when no audio file
   * is available. This is intentionally tiny (a few ms).
   */
  function playFallbackClick() {
    try {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      var ctx = new AudioContextClass();
      var now = ctx.currentTime;

      var oscillator = ctx.createOscillator();
      var gain = ctx.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.05);

      oscillator.onended = function () {
        ctx.close();
      };
    } catch (err) {
      // Silently ignore — sound is a nice-to-have, not critical.
    }
  }

  /**
   * Positions the notification below the switch, keeping it in the
   * left side of the viewport and inside the visible screen.
   */
  function positionPortfolioNotification() {
    if (!portfolioNotification || !toggleButton) return;

    var switchRect = toggleButton.parentElement
      ? toggleButton.parentElement.getBoundingClientRect()
      : toggleButton.getBoundingClientRect();

    var notificationWidth = Math.min(
      320,
      window.innerWidth - (NOTIFICATION_SIDE_GAP_PX * 2)
    );

    var left = NOTIFICATION_SIDE_GAP_PX;
    var top = switchRect.bottom + NOTIFICATION_GAP_PX;

    if (
      left + notificationWidth >
      window.innerWidth - NOTIFICATION_SIDE_GAP_PX
    ) {
      left = Math.max(
        NOTIFICATION_SIDE_GAP_PX,
        window.innerWidth - notificationWidth - NOTIFICATION_SIDE_GAP_PX
      );
    }

    var notificationHeight = portfolioNotification.offsetHeight || 160;
    var maxTop =
      window.innerHeight -
      notificationHeight -
      NOTIFICATION_SIDE_GAP_PX;

    if (maxTop >= NOTIFICATION_SIDE_GAP_PX) {
      top = Math.min(top, maxTop);
    } else {
      top = NOTIFICATION_SIDE_GAP_PX;
    }

    portfolioNotification.style.left = left + "px";
    portfolioNotification.style.top = top + "px";
    portfolioNotification.style.width = notificationWidth + "px";
  }

  /**
   * Hides the notification and clears any pending feedback timers.
   */
  function hidePortfolioNotification() {
    if (!portfolioNotification) return;

    if (notificationCloseTimer !== null) {
      window.clearTimeout(notificationCloseTimer);
      notificationCloseTimer = null;
    }

    portfolioNotification.classList.remove("is-visible");

    window.setTimeout(function () {
      if (!portfolioNotification.classList.contains("is-visible")) {
        portfolioNotification.hidden = true;
      }
    }, 250);
  }

  /**
   * Shows the feedback prompt only while professional mode is active.
   */
  function showPortfolioNotification() {
    if (!portfolioNotification) return;
    if (!body.classList.contains(MODE_PROFESSIONAL)) return;

    resetPortfolioNotificationContent();

    portfolioNotification.hidden = false;

    positionPortfolioNotification();

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (portfolioNotification) {
          portfolioNotification.classList.add("is-visible");
        }
      });
    });
  }

  /**
   * Resets the prompt content to its initial state.
   */
  function resetPortfolioNotificationContent() {
    if (!portfolioNotificationContent) return;

    portfolioNotificationContent.innerHTML = `
      <p class="portfolio-notification__message">
        Você está gostando do portfólio?


      </p>

      <div class="portfolio-notification__actions">
        <button
          type="button"
          class="portfolio-notification__button portfolio-notification__button--no"
          id="portfolioNotificationNo"
        >
          Não, poderia ser mais criativo.
        </button>

        <button
          type="button"
          class="portfolio-notification__button portfolio-notification__button--yes"
          id="portfolioNotificationYes"
        >
          Sim, é minimalista e profissional.
        </button>
      </div>
    `;

    portfolioNotificationYes = document.getElementById(
      "portfolioNotificationYes"
    );

    portfolioNotificationNo = document.getElementById(
      "portfolioNotificationNo"
    );

    bindPortfolioNotificationActions();
  }

  /**
   * Handles the affirmative response.
   */
  function handlePortfolioNotificationYes() {
    if (!portfolioNotificationContent) return;

    if (notificationCloseTimer !== null) {
      window.clearTimeout(notificationCloseTimer);
    }

    portfolioNotificationContent.innerHTML = `
      <p class="portfolio-notification__message portfolio-notification__message--thanks">
        Obrigado!
      </p>
    `;

    positionPortfolioNotification();

    notificationCloseTimer = window.setTimeout(function () {
      hidePortfolioNotification();
    }, NOTIFICATION_THANK_YOU_DURATION_MS);
  }

  /**
   * Handles the "Não" response using the same mode-switch behavior
   * as the visible switch.
   */
  function handlePortfolioNotificationNo() {
    if (notificationTimer !== null) {
      window.clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    hidePortfolioNotification();
    playSwitchSound();
    toggleMode();
  }

  /**
   * Binds the two notification actions.
   */
  function bindPortfolioNotificationActions() {
    if (portfolioNotificationYes) {
      portfolioNotificationYes.addEventListener(
        "click",
        handlePortfolioNotificationYes
      );
    }

    if (portfolioNotificationNo) {
      portfolioNotificationNo.addEventListener(
        "click",
        handlePortfolioNotificationNo
      );
    }
  }

  /**
   * Switches application state between professional and personal.
   * Purely a class swap on <body> — CSS handles what is shown.
   */
  function toggleMode() {
    var isPersonal = body.classList.contains(MODE_PERSONAL);

    if (isPersonal) {
      // Switching back to professional (not part of the reveal
      // sequence — kept for completeness / future use).
      body.classList.remove(MODE_PERSONAL);
      body.classList.add(MODE_PROFESSIONAL);
      body.classList.remove(REVEAL_ACTIVE);
      toggleButton.setAttribute("aria-checked", "false");
      resetRevealMedia();
    } else {
      // Switching from professional to personal: everything
      // (including the switch itself) disappears, and the
      // black reveal sequence begins.
      body.classList.remove(MODE_PROFESSIONAL);
      body.classList.add(MODE_PERSONAL);
      body.classList.add(REVEAL_ACTIVE);
      toggleButton.setAttribute("aria-checked", "true");

      syncHiddenAttributes();
      startRevealSequence();

      return;
    }

    syncHiddenAttributes();
  }

  /**
   * Resets the reveal media back to its starting state: static
   * image visible, gif hidden. Used if the sequence is ever
   * re-entered (e.g. during development/testing).
   */
  function resetRevealMedia() {
    if (!revealImage || !revealGif) return;

    revealImage.hidden = false;
    revealGif.hidden = true;

    if (revealSound) {
      revealSound.pause();
      revealSound.currentTime = 0;
    }
  }

  /**
   * Runs the personal-mode reveal sequence:
   *   1. Static image, centered, silent — held for IMAGE_HOLD_MS.
   *   2. Image is swapped for the placeholder gif at the same
   *      size/position, and the placeholder reveal sound starts.
   *   3. After GIF_SOUND_DURATION_MS, redirect to REDIRECT_URL.
   */
  function startRevealSequence() {
    resetRevealMedia();

    window.setTimeout(function () {
      revealImage.hidden = true;
      revealGif.hidden = false;

      playRevealSound();

      window.setTimeout(function () {
        window.location.href = REDIRECT_URL;
      }, GIF_SOUND_DURATION_MS);
    }, IMAGE_HOLD_MS);
  }

  /**
   * Plays the placeholder reveal sound. Structured the same way
   * as the switch click sound: swap the <source> file later and
   * this keeps working without any JS changes.
   */
  function playRevealSound() {
    if (!revealSound) return;

    revealSound.currentTime = 0;

    var playPromise = revealSound.play();

    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        // Playback blocked/unavailable — sequence continues silently.
      });
    }
  }

  /**
   * Keeps the [hidden] attribute in sync with the active mode.
   * The CSS classes already control visual display, but toggling
   * [hidden] as well keeps the inactive screen out of the
   * accessibility tree and tab order.
   */
  function syncHiddenAttributes() {
    var professionalScreen = document.getElementById(
      "professionalScreen"
    );

    var personalScreen = document.getElementById(
      "personalScreen"
    );

    var isPersonal = body.classList.contains(MODE_PERSONAL);

    professionalScreen.hidden = isPersonal;
    personalScreen.hidden = !isPersonal;
  }

  function handleToggleClick() {
    // If the user uses the real switch first, the feedback prompt
    // should not remain on screen.
    if (notificationTimer !== null) {
      window.clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    hidePortfolioNotification();

    // Sound is triggered directly by the user's click, satisfying
    // browser autoplay restrictions.
    playSwitchSound();
    toggleMode();
  }

  toggleButton.addEventListener("click", handleToggleClick);

  bindPortfolioNotificationActions();

  // Ensure initial state (professional) is consistent on load.
  syncHiddenAttributes();

  // Show the feedback prompt 7 seconds after the site opens.
  notificationTimer = window.setTimeout(function () {
    notificationTimer = null;
    showPortfolioNotification();
  }, NOTIFICATION_DELAY_MS);

  // Keep the notification under the switch after viewport changes.
  window.addEventListener("resize", function () {
    if (
      portfolioNotification &&
      !portfolioNotification.hidden
    ) {
      positionPortfolioNotification();
    }
  });
})();