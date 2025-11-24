// Simple script to create a PNG logo
// This creates a 1024x1024 PNG with a blue background and "NC" text
const fs = require('fs');
const { createCanvas } = require('canvas');

const width = 1024;
const height = 1024;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Blue background (#0ea5e9)
ctx.fillStyle = '#0ea5e9';
ctx.fillRect(0, 0, width, height);

// White text "NC"
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 400px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('NC', width / 2, height / 2);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/logo.png', buffer);
console.log('✅ Created logo.png (1024x1024)');


