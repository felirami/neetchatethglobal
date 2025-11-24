// Script to create all Farcaster Mini App required images
// Based on: https://miniapps.farcaster.xyz/docs/guides/publishing
const fs = require('fs');
const { createCanvas } = require('canvas');

// Brand colors
const PRIMARY_COLOR = '#0ea5e9';  // Sky blue
const DARK_COLOR = '#0c4a6e';     // Dark blue
const WHITE = '#ffffff';
const LIGHT_BG = '#f0f9ff';       // Light blue tint

// Helper to draw rounded rectangle
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Helper to draw chat bubble icon
function drawChatBubble(ctx, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  // Main bubble
  const r = size * 0.4;
  ctx.arc(cx, cy - size * 0.1, r, 0, Math.PI * 2);
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.15, cy + size * 0.2);
  ctx.lineTo(cx - size * 0.35, cy + size * 0.45);
  ctx.lineTo(cx + size * 0.1, cy + size * 0.25);
  ctx.closePath();
  ctx.fill();
}

// 1. Create Icon (1024x1024 PNG, no alpha)
function createIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Solid background (no alpha)
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Draw stylized chat bubbles
  ctx.fillStyle = WHITE;
  
  // Main bubble (larger)
  roundRect(ctx, 180, 200, 500, 350, 60);
  ctx.fill();
  
  // Bubble tail
  ctx.beginPath();
  ctx.moveTo(280, 550);
  ctx.lineTo(180, 680);
  ctx.lineTo(380, 550);
  ctx.closePath();
  ctx.fill();

  // Secondary bubble (smaller, overlapping)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  roundRect(ctx, 380, 380, 400, 280, 50);
  ctx.fill();
  
  // Small tail for secondary
  ctx.beginPath();
  ctx.moveTo(680, 660);
  ctx.lineTo(780, 750);
  ctx.lineTo(620, 660);
  ctx.closePath();
  ctx.fill();

  // "NC" text
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.font = 'bold 200px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NC', 430, 420);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/icon-1024.png', buffer);
  console.log('✅ Created icon-1024.png (1024x1024)');
}

// 2. Create Splash Image (200x200)
function createSplash() {
  const size = 200;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Solid background
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Simple chat bubble icon
  ctx.fillStyle = WHITE;
  roundRect(ctx, 40, 45, 90, 65, 12);
  ctx.fill();
  
  // Tail
  ctx.beginPath();
  ctx.moveTo(55, 110);
  ctx.lineTo(35, 140);
  ctx.lineTo(75, 110);
  ctx.closePath();
  ctx.fill();

  // Secondary bubble
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  roundRect(ctx, 75, 85, 80, 55, 10);
  ctx.fill();

  // NC text
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NC', 85, 82);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/splash-200.png', buffer);
  console.log('✅ Created splash-200.png (200x200)');
}

// 3. Create OG/Hero Image (1200x630)
function createOgImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, PRIMARY_COLOR);
  gradient.addColorStop(1, DARK_COLOR);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(100, 530, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1100, 100, 250, 0, Math.PI * 2);
  ctx.fill();

  // Chat bubble icon on left
  ctx.fillStyle = WHITE;
  roundRect(ctx, 80, 180, 180, 130, 25);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(110, 310);
  ctx.lineTo(70, 380);
  ctx.lineTo(160, 310);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  roundRect(ctx, 160, 260, 150, 100, 20);
  ctx.fill();

  // Main title
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 96px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('NeetChat', 380, 250);

  // Subtitle
  ctx.font = '36px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('Wallet-to-Wallet Messaging', 380, 340);

  // Features
  ctx.font = '24px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('🔐 End-to-end encrypted  •  🌐 XMTP Protocol  •  📛 ENS & Farcaster', 380, 420);

  // Bottom tagline
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.textAlign = 'center';
  ctx.fillText('Chat with any Ethereum wallet', width / 2, 560);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/og-image.png', buffer);
  console.log('✅ Created og-image.png (1200x630)');
}

// 4. Create Screenshot (1284x2778 portrait)
function createScreenshot(num, variant) {
  const width = 1284;
  const height = 2778;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // App background
  ctx.fillStyle = LIGHT_BG;
  ctx.fillRect(0, 0, width, height);

  // Status bar area
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.fillRect(0, 0, width, 120);

  // Header
  ctx.fillStyle = PRIMARY_COLOR;
  ctx.fillRect(0, 120, width, 180);
  
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NeetChat', width / 2, 220);
  
  ctx.font = '32px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('Secure messaging for Web3', width / 2, 270);

  // Content area based on variant
  if (variant === 'conversations') {
    // Conversation list
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Conversations', 60, 400);

    const conversations = [
      { name: 'vitalik.eth', msg: 'Hey, check out this new protocol!', time: '2m' },
      { name: 'jesse.fc', msg: 'The XMTP integration is live 🚀', time: '15m' },
      { name: '0x1234...5678', msg: 'Thanks for the help!', time: '1h' },
      { name: 'alice.eth', msg: 'See you at ETHGlobal!', time: '3h' },
      { name: 'bob.fc', msg: 'Great work on the app', time: '1d' },
    ];

    conversations.forEach((conv, i) => {
      const y = 480 + i * 200;
      
      // Card background
      ctx.fillStyle = WHITE;
      roundRect(ctx, 40, y, width - 80, 170, 20);
      ctx.fill();
      ctx.shadowColor = 'rgba(0,0,0,0.1)';
      ctx.shadowBlur = 10;
      
      // Avatar circle
      ctx.fillStyle = PRIMARY_COLOR;
      ctx.beginPath();
      ctx.arc(120, y + 85, 50, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = WHITE;
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(conv.name.charAt(0).toUpperCase(), 120, y + 98);
      
      // Name and message
      ctx.textAlign = 'left';
      ctx.fillStyle = DARK_COLOR;
      ctx.font = 'bold 36px Arial, sans-serif';
      ctx.fillText(conv.name, 200, y + 65);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '30px Arial, sans-serif';
      ctx.fillText(conv.msg.substring(0, 35) + (conv.msg.length > 35 ? '...' : ''), 200, y + 115);
      
      // Time
      ctx.fillStyle = '#94a3b8';
      ctx.font = '26px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(conv.time, width - 80, y + 65);
    });
  } else if (variant === 'chat') {
    // Chat view
    ctx.fillStyle = DARK_COLOR;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('vitalik.eth', width / 2, 400);

    const messages = [
      { text: 'Hey! How are you?', sent: false, time: '10:30 AM' },
      { text: 'Great! Working on NeetChat', sent: true, time: '10:31 AM' },
      { text: 'That sounds awesome! 🔥', sent: false, time: '10:32 AM' },
      { text: 'Yeah, XMTP is incredible for decentralized messaging', sent: true, time: '10:33 AM' },
      { text: 'End-to-end encrypted too!', sent: true, time: '10:33 AM' },
      { text: 'Perfect for Web3 comms', sent: false, time: '10:35 AM' },
    ];

    messages.forEach((msg, i) => {
      const y = 500 + i * 180;
      const bubbleWidth = Math.min(msg.text.length * 28 + 60, width - 200);
      const x = msg.sent ? width - bubbleWidth - 60 : 60;
      
      ctx.fillStyle = msg.sent ? PRIMARY_COLOR : WHITE;
      roundRect(ctx, x, y, bubbleWidth, 120, 30);
      ctx.fill();
      
      ctx.fillStyle = msg.sent ? WHITE : DARK_COLOR;
      ctx.font = '32px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(msg.text, x + 30, y + 55);
      
      ctx.fillStyle = msg.sent ? 'rgba(255,255,255,0.6)' : '#94a3b8';
      ctx.font = '22px Arial, sans-serif';
      ctx.fillText(msg.time, x + 30, y + 95);
    });

    // Message input
    ctx.fillStyle = WHITE;
    roundRect(ctx, 40, height - 200, width - 80, 100, 50);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '32px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Type a message...', 100, height - 140);
  } else {
    // Features view
    ctx.fillStyle = DARK_COLOR;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Why NeetChat?', width / 2, 450);

    const features = [
      { icon: '🔐', title: 'End-to-End Encrypted', desc: 'Your messages are fully encrypted using XMTP protocol' },
      { icon: '📛', title: 'ENS & Farcaster', desc: 'Chat using human-readable names instead of addresses' },
      { icon: '🌐', title: 'Decentralized', desc: 'No central server - true Web3 messaging' },
      { icon: '⚡', title: 'Real-time', desc: 'Instant message delivery and notifications' },
      { icon: '🔗', title: 'Cross-platform', desc: 'Works with any XMTP-compatible app' },
    ];

    features.forEach((feat, i) => {
      const y = 550 + i * 320;
      
      ctx.fillStyle = WHITE;
      roundRect(ctx, 60, y, width - 120, 280, 30);
      ctx.fill();
      
      ctx.font = '80px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(feat.icon, 180, y + 100);
      
      ctx.fillStyle = DARK_COLOR;
      ctx.font = 'bold 40px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(feat.title, 280, y + 90);
      
      ctx.fillStyle = '#64748b';
      ctx.font = '32px Arial, sans-serif';
      ctx.fillText(feat.desc.substring(0, 40), 280, y + 150);
      if (feat.desc.length > 40) {
        ctx.fillText(feat.desc.substring(40), 280, y + 195);
      }
    });
  }

  // Bottom safe area
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, height - 80, width, 80);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`public/screenshot-${num}.png`, buffer);
  console.log(`✅ Created screenshot-${num}.png (1284x2778)`);
}

// Run all
console.log('🎨 Creating Farcaster Mini App assets...\n');
createIcon();
createSplash();
createOgImage();
createScreenshot(1, 'conversations');
createScreenshot(2, 'chat');
createScreenshot(3, 'features');
console.log('\n✨ All assets created successfully!');
console.log('\nUpdate your farcaster.json with these URLs:');
console.log('  iconUrl: https://neetchat3.vercel.app/icon-1024.png');
console.log('  splashImageUrl: https://neetchat3.vercel.app/splash-200.png');
console.log('  heroImageUrl: https://neetchat3.vercel.app/og-image.png');
console.log('  ogImageUrl: https://neetchat3.vercel.app/og-image.png');
console.log('  screenshotUrls: [...screenshot-1.png, screenshot-2.png, screenshot-3.png]');

