/**
 * script.js
 * -------------------------------------------------------
 * All interactive behavior for portfolio.html lives here.
 * The page's inline markup contains no logic of its own —
 * everything is wired up on load, below.
 *
 * Sections:
 *   1. Options menu (hamburger toggle)
 *   2. Cowboys checkbox -> floating video
 *   3. GIF proximity audio (scroll-based volume)
 * -------------------------------------------------------
 */

(function () {
  "use strict";


  /* =======================================================
   PROFILE GIF HOVER
   ======================================================= */

 var profileGif = document.getElementById("profileGif");

 if (profileGif) {
  var normalGifSrc = profileGif.src;
  var hoverGifSrc = profileGif.dataset.hoverSrc;

  profileGif.addEventListener("mouseenter", function () {
    profileGif.src = hoverGifSrc;
  });

  profileGif.addEventListener("mouseleave", function () {
    profileGif.src = normalGifSrc;
  });
 }

  /* =======================================================
     1. OPTIONS MENU
     ======================================================= */

  var menuToggle = document.getElementById("menuToggle");
  var optionsMenu = document.getElementById("optionsMenu");

  function setMenuOpen(isOpen) {
    optionsMenu.hidden = !isOpen;
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function handleMenuToggleClick(event) {
    event.stopPropagation();
    setMenuOpen(optionsMenu.hidden);
  }

  // Close the menu when clicking anywhere outside of it.
  function handleOutsideClick(event) {
    if (optionsMenu.hidden) return;
    if (optionsMenu.contains(event.target) || menuToggle.contains(event.target)) {
      return;
    }
    setMenuOpen(false);
  }

  if (menuToggle && optionsMenu) {
    menuToggle.addEventListener("click", handleMenuToggleClick);
    document.addEventListener("click", handleOutsideClick);
  }

  /* =======================================================
     2. COWBOYS CHECKBOX -> FLOATING VIDEO
     ======================================================= */

  // Single source of truth for the video file — change only
  // this constant to swap the clip out later.
  var COWBOYS_VIDEO_SRC = "assets/videos/cowboys.mp4";

  var cowboysCheckbox = document.getElementById("cowboysCheckbox");
  var floatingVideo = document.getElementById("floatingVideo");
  var cowboysVideoEl = document.getElementById("cowboysVideoEl");

if (cowboysVideoEl) {
  cowboysVideoEl.volume = 0.4;
}


  if (cowboysVideoEl && !cowboysVideoEl.src) {
    cowboysVideoEl.src = COWBOYS_VIDEO_SRC;
  }

  function showCowboysVideo() {
    floatingVideo.hidden = false;
    cowboysVideoEl.currentTime = 0;

    var playPromise = cowboysVideoEl.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        // Playback blocked (e.g. autoplay policy) — leave the
        // window visible but paused rather than throwing.
      });
    }
  }

  function hideCowboysVideo() {
    floatingVideo.hidden = true;
    cowboysVideoEl.pause();
    cowboysVideoEl.currentTime = 0;
  }

  function handleCowboysChange() {
    if (cowboysCheckbox.checked) {
      showCowboysVideo();
    } else {
      hideCowboysVideo();
    }
  }

  function handleCowboysVideoEnded() {
    hideCowboysVideo();
    cowboysCheckbox.checked = false;
  }

  if (cowboysCheckbox && floatingVideo && cowboysVideoEl) {
    cowboysCheckbox.addEventListener("change", handleCowboysChange);
    cowboysVideoEl.addEventListener("ended", handleCowboysVideoEnded);
  }

  /* =======================================================
     3. GIF PROXIMITY AUDIO
     ======================================================= */

  var PROXIMITY_SOUND_SRC = "assets/sounds/Omago.mp3";
  var PROXIMITY_MAX_VOLUME = 0.5;
  var PROXIMITY_RANGE_MULTIPLIER = 2; // ~1.5 viewport heights either side

  var proximityGif = document.getElementById("proximityGif");
  var proximitySound = null;
  var audioUnlocked = false;
  var proximityTicking = false;

  var audioPrompt = document.getElementById("audioPrompt");
  var audioPromptButton = document.getElementById("audioPromptButton");
  var backgroundAudio = document.getElementById("backgroundAudio");

  if (proximityGif) {
    proximitySound = new Audio(PROXIMITY_SOUND_SRC);
    proximitySound.loop = true;
    proximitySound.volume = 0;
  }

  // Browsers block audio until a real user gesture occurs. We try
  // to start (silent, volume 0) playback on the first interaction
  // and simply let the scroll handler take over the volume from
  // then on. Failures are swallowed silently and simply retried
  // on the next gesture.
  function unlockProximityAudio() {
    if (!proximitySound || audioUnlocked) return;

    var playPromise = proximitySound.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise
        .then(function () {
          audioUnlocked = true;
        })
        .catch(function () {
          // Still locked — a later gesture will try again.
        });
    } else {
      audioUnlocked = true;
    }
  }

  function unlockAllAudio() {
   var audioPromises = [];

   if (proximitySound && !audioUnlocked) {
    var proximityPlayPromise = proximitySound.play();

    if (proximityPlayPromise && typeof proximityPlayPromise.then === "function") {
      audioPromises.push(
        proximityPlayPromise.then(function () {
          audioUnlocked = true;
        })
      );
    } else {
      audioUnlocked = true;
    }
   }

   if (backgroundAudio) {
    var backgroundPlayPromise = backgroundAudio.play();

    if (
      backgroundPlayPromise &&
      typeof backgroundPlayPromise.catch === "function"
    ) {
      backgroundPlayPromise.catch(function () {
        // Browser still blocked playback.
      });
    }
   }

   if (audioPrompt) {
    audioPrompt.hidden = true;
  }
 }
 
 if (audioPromptButton) {
  audioPromptButton.addEventListener("click", unlockAllAudio);
 }

 if (audioPrompt) {
  audioPrompt.addEventListener("click", function (event) {
    if (event.target === audioPrompt) {
      unlockAllAudio();
    }
  });
 }

  function updateProximityVolume() {
    proximityTicking = false;
    if (!proximitySound || !proximityGif) return;

    var rect = proximityGif.getBoundingClientRect();
    var gifCenter = rect.top + rect.height / 2;
    var viewportCenter = window.innerHeight / 2;
    var distance = Math.abs(gifCenter - viewportCenter);
    var range = window.innerHeight * PROXIMITY_RANGE_MULTIPLIER;

    var attenuation = 0;
    if (distance < range) {
      // Smooth cosine falloff: 1 at distance 0, eases down to
      // 0 at the edge of the range, instead of a linear/abrupt cut.
      attenuation = 0.5 * (1 + Math.cos((Math.PI * distance) / range));
    }

    proximitySound.volume = Math.max(0, Math.min(1, attenuation)) * PROXIMITY_MAX_VOLUME;
  }

  function requestProximityUpdate() {
    if (proximityTicking) return;
    proximityTicking = true;
    window.requestAnimationFrame(updateProximityVolume);
  }

  if (proximityGif && proximitySound) {
    ["pointerdown", "keydown", "touchstart"].forEach(function (eventName) {
      document.addEventListener(eventName, unlockProximityAudio, { once: true });
    });

    window.addEventListener("scroll", requestProximityUpdate, { passive: true });
    window.addEventListener("resize", requestProximityUpdate);

    // Set an initial volume in case the gif is already near the
    // center of the viewport when the page loads.
    updateProximityVolume();
  }

  /* =======================================================
     4. GALLERY / SHOWCASE IMAGE LIGHTBOX
     ======================================================= */

  var lightbox = document.getElementById("lightbox");
  var lightboxImage = document.getElementById("lightboxImage");
  var lightboxClose = document.getElementById("lightboxClose");

  // Only images inside these two sections are eligible. Delegated
  // on document so images added to either section later still work
  // without needing their own listener.
  function isLightboxEligible(target) {
    return (
      !!target &&
      target.tagName === "IMG" &&
      (target.closest("#section-gallery") || target.closest("#section-showcase"))
    );
  }

  function openLightbox(imageEl) {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = imageEl.currentSrc || imageEl.src;
    lightboxImage.alt = imageEl.alt || "";
    lightbox.hidden = false;
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImage) return;
    lightbox.hidden = true;
    lightboxImage.src = "";
  }

  if (lightbox && lightboxImage) {
    document.addEventListener("click", function (event) {
      if (isLightboxEligible(event.target)) {
        openLightbox(event.target);
      }
    });

    // Browsers make <img> elements natively draggable. Clicking and
    // dragging one (even slightly) starts a native drag operation;
    // if that drag is still active when this click handler swaps in
    // the full-screen overlay, some browsers lose track of the drag
    // and the whole page stops responding to clicks until reload.
    // Preventing dragstart here stops that native drag from ever
    // starting, for both the source thumbnails and the enlarged
    // lightbox image itself.
    document.addEventListener("dragstart", function (event) {
      if (isLightboxEligible(event.target) || event.target === lightboxImage) {
        event.preventDefault();
      }
    });

    if (lightboxClose) {
      lightboxClose.addEventListener("click", closeLightbox);
    }

    // Click on the darkened backdrop (i.e. not the framed image
    // itself) closes the viewer.
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !lightbox.hidden) {
        closeLightbox();
      }
    });
  }
})();