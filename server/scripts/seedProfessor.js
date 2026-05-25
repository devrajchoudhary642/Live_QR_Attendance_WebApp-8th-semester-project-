require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'professor@college.edu';
  const password = 'Prof@1234';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Professor account already exists:', email);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    email,
    name: 'Default Professor',
    role: 'professor',
    passwordHash,
  });

  console.log('Professor account created successfully');
  console.log('  Email:', email);
  console.log('  Password:', password);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
