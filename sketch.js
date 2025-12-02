const TOTAL_FRAMES = 35;
let frames = [];
let currentFrame = 0;
const FRAME_INTERVAL = 100; // ms per frame
let lastFrameTime = 0;
let displayW = 200;
let displayH = 200;
let y848sound = null;
let soundPlaying = false;
// Player / physics
let playerX = 0;
let playerY = 0;
let vy = 0;
let gravity = 0.8;
let jumpForce = -15;
let moveSpeed = 6;
let onGround = false;
let groundY = 0;
// Micky sprite
let mickyFrames = [];
const MICKY_TOTAL = 16;
let mickyFrame = 0;
let mickyLastFrameTime = 0;
const MICKY_INTERVAL = 120; // ms per frame
// Micky physics (independent from main player)
let mickyX = 0;
let mickyY = 0;
let mVy = 0;
let mGravity = 0.8;
let mJumpForce = -12;
let mSpeed = 4;
let mOnGround = false;
// Dialog / input state
let inputActive = false;       // whether the middle player's input box is open
let inputText = '';
let inputSubmitted = false;    // whether player has submitted input
let mickyDialogText = '';      // text shown above micky
let mDisplayWCurrent = undefined;
let mDisplayHCurrent = undefined;

function preload() {
  // Load individual frame files all0001.png ... all0035.png
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const idx = String(i).padStart(4, '0');
    frames.push(loadImage(`1/all${idx}.png`));
  }
  // Load micky frames 0.png .. 15.png from `micky/`
  for (let i = 0; i < MICKY_TOTAL; i++) {
    mickyFrames.push(loadImage(`micky/${i}.png`));
  }
  // Load sound file y848 (ensure path matches project)
  y848sound = loadSound('y848.wav');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noSmooth();
  if (frames.length > 0) {
    // assume all frames same size
    displayW = frames[0].width * 4;
    displayH = frames[0].height * 4;
  }
  // initialize player position on the ground
  playerX = width / 2;
  groundY = height - displayH / 2 - 20;
  playerY = groundY;
  // initialize micky position to the left of the main player
  mickyX = playerX - displayW - 40;
  mickyY = groundY;
}

function draw() {
  background('#ffcad4');
  if (frames.length === 0) {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('找不到動畫幀：請確認 `1/` 資料夾內有 all0001..all0035.png', width / 2, height / 2);
    return;
  }

  if (millis() - lastFrameTime > FRAME_INTERVAL) {
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
    lastFrameTime = millis();
  }

  const img = frames[currentFrame];
  // Micky controls: A/D for left/right movement (hold), W to jump (press)
  if (keyIsDown(65)) { // 'A'
    mickyX -= mSpeed;
  }
  if (keyIsDown(68)) { // 'D'
    mickyX += mSpeed;
  }

  // Apply gravity to micky
  mVy += mGravity;
  mickyY += mVy;

  // Ground collision for micky
  if (mickyY > groundY) {
    mickyY = groundY;
    mVy = 0;
    mOnGround = true;
  } else {
    mOnGround = false;
  }

  // update and draw micky (uses its own position)
  if (mickyFrames.length > 0) {
    if (millis() - mickyLastFrameTime > MICKY_INTERVAL) {
      mickyFrame = (mickyFrame + 1) % MICKY_TOTAL;
      mickyLastFrameTime = millis();
    }

    const mimg = mickyFrames[mickyFrame];
    // scale micky so its height is proportional to main displayH
    const mScale = 0.8; // relative size compared to main character
    const mDisplayH = displayH * mScale;
    const mDisplayW = (mimg.width / mimg.height) * mDisplayH;

    // store last display size for proximity checks later
    mDisplayWCurrent = mDisplayW;
    mDisplayHCurrent = mDisplayH;

    // Constrain micky within canvas
    mickyX = constrain(mickyX, mDisplayW / 2, width - mDisplayW / 2);

    // image uses center, so pass mickyX and mickyY
    image(mimg, mickyX, mickyY, mDisplayW, mDisplayH);
  }
  // Movement: left/right
  if (keyIsDown(LEFT_ARROW)) {
    playerX -= moveSpeed;
  }
  if (keyIsDown(RIGHT_ARROW)) {
    playerX += moveSpeed;
  }

  // Apply gravity
  vy += gravity;
  playerY += vy;

  // Ground collision
  if (playerY > groundY) {
    playerY = groundY;
    vy = 0;
    onGround = true;
  } else {
    onGround = false;
  }

  // Constrain player within canvas
  playerX = constrain(playerX, displayW / 2, width - displayW / 2);

  // Draw character at player position
  image(img, playerX, playerY, displayW, displayH);

  // Show dialog box above micky when close to main player
  // compute current micky display sizes (fallback if not set)
  if (typeof mDisplayWCurrent === 'undefined') {
    mDisplayHCurrent = displayH * 0.8;
    mDisplayWCurrent = (21 / 30) * mDisplayHCurrent;
  }
  const distance = dist(playerX, playerY, mickyX, mickyY);
  const proximityThreshold = displayW / 2 + mDisplayWCurrent / 2 + 40;

  // Open input when approaching (only if not yet submitted)
  if (!inputSubmitted && distance < proximityThreshold) {
    if (!inputActive) {
      inputActive = true;
      inputText = '';
    }
    if (!mickyDialogText) mickyDialogText = '請問你叫甚麼名字';
  }

  // Determine whether to show micky's dialog: show when input open (typing) or when close (or after submit)
  const showMickyDialog = (inputActive || (!inputSubmitted && distance < proximityThreshold) || (inputSubmitted && mickyDialogText));
  if (showMickyDialog && mickyDialogText) {
    push();
    textSize(18);
    textAlign(CENTER, CENTER);
    const padding = 10;
    const tw = textWidth(mickyDialogText);
    const boxW = tw + padding * 2;
    const boxH = 26 + padding;
    const boxX = mickyX;
    const boxY = mickyY - mDisplayHCurrent / 2 - boxH / 2 - 8;
    rectMode(CENTER);
    fill(255, 245);
    stroke(0);
    strokeWeight(2);
    rect(boxX, boxY, boxW, boxH, 6);
    noStroke();
    fill(0);
    text(mickyDialogText, boxX, boxY);
    pop();
  }

  // If input is active, show an input box above the middle (player) character.
  if (inputActive) {
    push();
    // keep input box vertically stable (don't jump when player jumps): anchor relative to ground
    const iboxX = playerX;
    const iboxY = groundY - displayH / 2 - 60;
    const padding = 8;
    textSize(18);
    textAlign(LEFT, CENTER);
    const tw = textWidth(inputText || ' ');
    const boxW = max(160, tw + padding * 2 + 12);
    const boxH = 32;
    rectMode(CENTER);
    fill(255);
    stroke(0);
    strokeWeight(2);
    rect(iboxX, iboxY, boxW, boxH, 6);
    noStroke();
    fill(0);
    // draw the typed text left-aligned inside the box
    const textX = iboxX - boxW / 2 + padding + 4;
    text(inputText, textX, iboxY);
    // draw a caret at end (non-blinking)
    const caretX = textX + textWidth(inputText);
    stroke(0);
    strokeWeight(2);
    line(caretX + 2, iboxY - 10, caretX + 2, iboxY + 10);
    pop();
  }

  // Draw simple ground indicator
  push();
  stroke(0, 60);
  strokeWeight(2);
  line(0, groundY + displayH / 2 + 10, width, groundY + displayH / 2 + 10);
  pop();

  // If sound not yet started, show a small hint to click/tap to enable audio
  if (y848sound && !soundPlaying) {
    push();
    fill(0, 150);
    textAlign(CENTER, BOTTOM);
    textSize(14);
    text('點擊或按任意鍵以播放音效', width / 2, height - 20);
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // update ground and keep player on ground if they were standing
  groundY = height - displayH / 2 - 20;
  if (onGround) {
    playerY = groundY;
  }
  if (mOnGround) {
    mickyY = groundY;
  }
}

function mousePressed() {
  // Start audio in response to user gesture to satisfy browser autoplay policies
  if (y848sound && !soundPlaying) {
    userStartAudio();
    // play once or loop; change to .loop() if you want continuous playback
    y848sound.play();
    soundPlaying = true;
  }
}

function keyPressed() {
  // also allow keyboard to start sound
  if (y848sound && !soundPlaying) {
    userStartAudio();
    y848sound.play();
    soundPlaying = true;
  }
  // Jump on Space (only if on ground)
  if ((key === ' ' || keyCode === 32) && onGround) {
    vy = jumpForce;
    onGround = false;
  }
  // Micky jump on 'W' or 'w'
  if ((key === 'w' || key === 'W' || keyCode === 87) && mOnGround) {
    mVy = mJumpForce;
    mOnGround = false;
  }

  // Input handling: when input box active, handle Enter and Backspace here
  if (inputActive) {
    // Enter: submit
    if (keyCode === ENTER || keyCode === 13) {
      // if empty, treat as empty string
      inputSubmitted = true;
      inputActive = false;
      // set micky dialog to submitted + ' 歡迎你'
      mickyDialogText = (inputText.trim() || '') + ' 歡迎你';
    } else if (keyCode === BACKSPACE || keyCode === 8) {
      // remove last character
      inputText = inputText.slice(0, -1);
    }
    // prevent other handlers from acting on this keypress (but still allow movement keys via keyIsDown)
  }
}

function keyTyped() {
  // capture printable characters for input when inputActive
  if (inputActive) {
    // key contains the typed character
    if (key && key.length === 1) {
      inputText += key;
    }
    // prevent default
    return false;
  }
}
