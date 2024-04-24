import sqlite3

conn = sqlite3.connect('budget_app.db')
cursor = conn.cursor()

try:
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            other_details TEXT
        )
    ''')
    cursor.execute('''
        CREATE INDEX idx_username ON users(username);
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            expense_id INTEGER PRIMARY KEY,
            user_id INTEGER,
            date TEXT,  -- ISO8601 strings ("YYYY-MM-DD HH:MM:SS.SSS")
            category TEXT,
            amount REAL,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    cursor.execute('''
        CREATE INDEX idx_user_id_expenses ON expenses(user_id);
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS income (
            income_id INTEGER PRIMARY KEY,
            user_id INTEGER,
            date TEXT,  -- ISO8601 strings ("YYYY-MM-DD HH:MM:SS.SSS")
            amount REAL,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    cursor.execute('''
        CREATE INDEX idx_user_id_income ON income(user_id);
    ''')

    conn.commit()
except sqlite3.Error as e:
    print("An error occurred:", e.args[0])
finally:
    conn.close()
