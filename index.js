import axios from 'axios';
import fs from 'fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import figlet from 'figlet';

const BASE_URL = 'https://api.depined.org/api';

// Fungsi untuk menampilkan banner ASCII art
const displayBanner = () => {
  console.log(chalk.green(figlet.textSync('AirdropInsiders', { horizontalLayout: 'default' })));
};

// Format timestamps
const getTimestamp = () => {
  return new Date().toLocaleTimeString();
};

// Create stats table with simplified columns
const createStatsTable = (accounts) => {
  const table = new Table({
    head: ['Account', 'Username', 'Email', 'Status', 'Points Today', 'Total Points', 'Last Update'],
    style: {
      head: ['cyan'],
      border: ['gray']
    }
  });

  accounts.forEach(account => {
    table.push([
      account.token.substring(0, 8) + '...',
      account.username || '-',
      account.email || '-',
      account.status,
      account.pointsToday?.toFixed(2) || '0.00',
      account.totalPoints?.toFixed(2) || '0.00',
      account.lastUpdate || '-'
    ]);
  });

  return table;
};

// Update log success
const logSuccess = (accountId, message, pointsToday, totalPoints, username, email) => {
  console.log(
    chalk.green(`[${getTimestamp()}] Account ${accountId}: ${message}`) +
    chalk.blue(` | ${username}`) +
    chalk.yellow(` | ${email}`) +
    chalk.magenta(` | Points Today: ${pointsToday?.toFixed(2)}`) +
    chalk.cyan(` | Total Points: ${totalPoints?.toFixed(2)}`)
  );
};

// Get stats
const getStats = async (token) => {
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await axios.get(`${BASE_URL}/stats/earnings`, { headers, timeout: 10000 });
    const data = res.data.data;
    return {
      pointsToday: data.total_points_today || 0,
      totalPoints: data.total_points_balance || 0
    };
  } catch (error) {
    throw error;
  }
};

// Get user profile
const getUserProfile = async (token) => {
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await axios.get(`${BASE_URL}/user/overview/profile`, { headers, timeout: 10000 });
    return {
      username: res.data.data.profile.username || '-',
      email: res.data.data.user_details.email || '-'
    };
  } catch (error) {
    throw error;
  }
};

// Ping function
const ping = async (token) => {
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    const res = await axios.post(
      `${BASE_URL}/user/widget-connect`,
      { connected: true },
      { headers, timeout: 10000 }
    );

    return res.data;
  } catch (error) {
    throw error;
  }
};

// Read and validate input files
const readInputFiles = async () => {
  try {
    const tokenData = await fs.readFile('data.txt', 'utf8');
    const tokens = tokenData.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (tokens.length === 0) {
      throw new Error('No tokens found in data.txt');
    }

    return { tokens };
  } catch (error) {
    throw new Error(`Failed to read input files: ${error.message}`);
  }
};

// Main function
const main = async () => {
  displayBanner(); // Tampilkan banner saat aplikasi dimulai

  const spinner = ora('Reading input files...').start();
  const { tokens } = await readInputFiles();
  spinner.succeed(`Loaded ${tokens.length} tokens`);

  const accounts = tokens.map((token) => ({
    token,
    status: 'Initializing',
    username: null,
    email: null,
    pointsToday: 0,
    totalPoints: 0,
    lastUpdate: null
  }));

  while (true) {
    console.clear();
    displayBanner(); // Tampilkan banner sebelum setiap refresh tabel
    console.log(chalk.yellow('Join Us : https://t.me/AirdropInsiderID\n'));
    console.log(chalk.cyan('=== Depined Multi-Account Manager ===\n'));
    console.log(createStatsTable(accounts).toString());
    console.log(chalk.cyan('\n=== Activity Log ==='));

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];

      try {
        // Get user profile if not already fetched
        if (!account.username || !account.email) {
          const profile = await getUserProfile(account.token);
          account.username = profile.username;
          account.email = profile.email;
        }

        // Ping server
        await ping(account.token);
        account.status = chalk.green('Connected');

        // Get stats
        const stats = await getStats(account.token);

        // Update account data
        account.pointsToday = stats.pointsToday;
        account.totalPoints = stats.totalPoints;
        account.lastUpdate = getTimestamp();

        logSuccess(
          i + 1,
          'Ping successful',
          stats.pointsToday,
          stats.totalPoints,
          account.username,
          account.email
        );

      } catch (error) {
        account.status = chalk.red('Error');
        account.lastUpdate = getTimestamp();
        console.log(chalk.red(`[${getTimestamp()}] Account ${i + 1}: Error - ${error.message}`));
      }

      // Add small delay between accounts to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait before next update (30 seconds)
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
};

// Start the application
(async () => {
  try {
    await main();
  } catch (error) {
    console.error(chalk.red('Application error:', error.message));
    process.exit(1);
  }
})();
