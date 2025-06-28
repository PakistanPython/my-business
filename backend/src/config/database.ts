import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'my_business',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create the connection pool
export const pool = mysql.createPool(dbConfig);

// Test the connection
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    // Create database if it doesn't exist
    const tempPool = mysql.createPool({
      ...dbConfig,
      database: undefined
    });
    
    await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    tempPool.end();

    // Create tables
    await createTables();
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

const createTables = async () => {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      business_name VARCHAR(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Income table
    `CREATE TABLE IF NOT EXISTS income (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      category VARCHAR(50) DEFAULT 'General',
      source VARCHAR(100),
      date DATE NOT NULL,
      charity_required DECIMAL(15,2) GENERATED ALWAYS AS (amount * 0.06) STORED,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Expenses table
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      date DATE NOT NULL,
      receipt_path VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Purchases table
    `CREATE TABLE IF NOT EXISTS purchases (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      date DATE NOT NULL,
      receipt_path VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Sales table
    `CREATE TABLE IF NOT EXISTS sales (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      purchase_id INT,
      amount DECIMAL(15,2) NOT NULL,
      selling_price DECIMAL(15,2) NOT NULL,
      profit DECIMAL(15,2) GENERATED ALWAYS AS (selling_price - amount) STORED,
      profit_percentage DECIMAL(5,2) GENERATED ALWAYS AS ((selling_price - amount) / amount * 100) STORED,
      description TEXT,
      customer_name VARCHAR(100),
      customer_contact VARCHAR(50),
      payment_method VARCHAR(50) DEFAULT 'Cash',
      date DATE NOT NULL,
      status ENUM('pending', 'completed', 'cancelled') DEFAULT 'completed',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL
    )`,

    // Charity table
    `CREATE TABLE IF NOT EXISTS charity (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      income_id INT,
      amount_required DECIMAL(15,2) NOT NULL,
      amount_paid DECIMAL(15,2) DEFAULT 0.00,
      amount_remaining DECIMAL(15,2) GENERATED ALWAYS AS (amount_required - amount_paid) STORED,
      status ENUM('pending', 'partial', 'paid') DEFAULT 'pending',
      payment_date DATE,
      description TEXT,
      recipient VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (income_id) REFERENCES income(id) ON DELETE SET NULL
    )`,

    // Cash and Bank accounts table
    `CREATE TABLE IF NOT EXISTS accounts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      account_type ENUM('cash', 'bank', 'savings', 'investment') NOT NULL,
      account_name VARCHAR(100) NOT NULL,
      balance DECIMAL(15,2) DEFAULT 0.00,
      bank_name VARCHAR(100),
      account_number VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Loans table
    `CREATE TABLE IF NOT EXISTS loans (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      loan_type ENUM('personal', 'business', 'mortgage', 'auto', 'other') NOT NULL,
      lender_name VARCHAR(100) NOT NULL,
      principal_amount DECIMAL(15,2) NOT NULL,
      current_balance DECIMAL(15,2) NOT NULL,
      interest_rate DECIMAL(5,2),
      monthly_payment DECIMAL(15,2),
      start_date DATE NOT NULL,
      due_date DATE,
      status ENUM('active', 'paid', 'defaulted') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // Transactions table (audit trail)
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      transaction_type ENUM('income', 'expense', 'purchase', 'sale', 'transfer', 'loan_payment', 'charity') NOT NULL,
      reference_id INT,
      reference_table VARCHAR(50),
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      account_id INT,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
    )`,

    // Categories table for better organization
    `CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      type ENUM('income', 'expense', 'purchase', 'sale') NOT NULL,
      color VARCHAR(7) DEFAULT '#3B82F6',
      icon VARCHAR(50) DEFAULT 'circle',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_category (user_id, name, type)
    )`
  ];

  for (const table of tables) {
    await pool.execute(table);
  }

  // Create indexes for better performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_income_user_date ON income(user_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_purchases_user_date ON purchases(user_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_charity_user_status ON charity(user_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date)',
    'CREATE INDEX IF NOT EXISTS idx_accounts_user_type ON accounts(user_id, account_type)'
  ];

  for (const index of indexes) {
    await pool.execute(index);
  }
};
