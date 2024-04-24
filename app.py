import os
from flask import Flask, jsonify, render_template, request, redirect, url_for, flash, session, g
from flask import send_file, make_response
import sqlite3
import bcrypt
import secrets
import io
from matplotlib import pyplot as plt
from ExpenseForm import ExpenseForm
from LoginForm import LoginForm
from histogram import Histogram
from linechart import LineChart
from main import Main
from piechart import Piechart
from datetime import datetime
import matplotlib
from statistics import mean, stdev
import logging
from flask_wtf.csrf import CSRFProtect
from flask_wtf.csrf import generate_csrf
from werkzeug.security import check_password_hash, generate_password_hash
from scatterplot import ScatterPlot
from RegisterForm import RegisterForm
from IncomeForm import IncomeForm

logging.basicConfig(level=logging.INFO)

matplotlib.use('Agg')  

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', '8d90f64d7767be7b730e3105be9324d8')  # Fallback to a new random key if the environment variable is not set
app.config['WTF_CSRF_SECRET_KEY'] = '8d90f64d7767be7b730e3105be9324d8'
app.config['SESSION_COOKIE_SECURE'] = True  # Ensure session cookies are only sent over HTTPS
app.config['REMEMBER_COOKIE_SECURE'] = True  # Ensure remember cookies are only sent over HTTPS
csrf = CSRFProtect(app)


def get_db():
    """Get a database connection. If none exists in the global context, create a new one."""
    if 'db' not in g:
        # Create a new connection
        g.db = sqlite3.connect('budget_app.db')
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception=None):
    """Closes the database again at the end of the request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


@app.errorhandler(404)
def page_not_found(e):
    user_id = session.get('user_id')  # Fetch the user ID from the session
    if not user_id:
        flash('Rerouting home.')
        return redirect(url_for('index'))
    else:
        return render_template('404.html'), 404  # Make sure this line correctly points to your 404 template


@app.route('/')
def index():
    login_form = LoginForm()  # Create an instance of LoginForm to pass to the template
    form = RegisterForm() 
    user = session.get('user_id')# Assuming RegisterForm is the expected form
    return render_template('index.html', login_form=login_form, form=form, user=user)


def parse_date(date_str):
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None  # or raise an error if necessary


@app.route('/view_budget')
def view_budget():
    income_form = IncomeForm()
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in. Please login to continue.')
        return redirect(url_for('index'))

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('SELECT amount, date FROM income WHERE user_id = ? ORDER BY date DESC LIMIT 1', (user_id,))
        income_row = cursor.fetchone()
        income = income_row['amount'] if income_row else 0.0
        income_date = parse_date(income_row['date']) if income_row and income_row['date'] else None
        formatted_income_date = income_date.strftime('%Y-%m-%d %H:%M:%S') if income_date else None

        cursor.execute('SELECT SUM(amount) AS total_expenses FROM expenses WHERE user_id = ?', (user_id,))
        expenses_row = cursor.fetchone()
        expenses = expenses_row['total_expenses'] if expenses_row else 0.0

        balance = income - expenses
        if income > 0:
            expense_ratio = (expenses / income * 100)
            grade = calculate_grade(expense_ratio)  # Assuming calculate_grade is a function defined elsewhere
        else:
            expense_ratio = 0
            grade = 'N/A'  # Adjust grade calculation or representation as necessary

        budget_data = {
            'income': income,
            'expenses': expenses,
            'balance': balance,
            'grade': grade,
            'expense_ratio': expense_ratio
        }
        message = None
        if income == 0:
            message = "No income data available. Please update your income to see detailed analysis."

        return render_template('view_budget.html', budget=budget_data, message=message, date=formatted_income_date, user=user_id, income_form=income_form)
    except sqlite3.Error as e:
        flash(f"An error occurred while fetching budget data: {e}")
        return redirect(url_for('index'))  # Ensure there is always a redirect or render in case of error
    finally:
        cursor.close()
        

@app.route('/login', methods=['GET', 'POST'])
def login():
    login_form = LoginForm()
    user = None  # Initialize user variable

    if login_form.validate_on_submit():
        username = login_form.username.data
        password = login_form.password.data
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = username
            flash('Login successful', 'success')
            return redirect(url_for('view_budget'))  # Assuming 'view_budget' is the correct redirect target
        else:
            flash('Invalid username or password.', 'danger')

    # If not a POST request or if login fails, render the login form again
    return render_template('login.html', login_form=login_form, user=user)



@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)

        db = get_db()
        cursor = db.cursor()

        # Create users table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                username TEXT UNIQUE,
                password_hash TEXT
            )
        """)

        # Insert the new user
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, hashed_password))
        user_id = cursor.lastrowid  # Get the last inserted id

        # Initialize related tables for the user
        setup_user_tables(cursor, user_id)

        db.commit()
        db.close()
        flash('Account created successfully! Please login.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html', form=form)

def setup_user_tables(cursor, user_id):
    # Initialize income and expenses tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS income (
            income_id INTEGER PRIMARY KEY,
            user_id INTEGER,
            date TEXT,
            amount REAL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("INSERT INTO income (user_id, date, amount) VALUES (?, ?, ?)", (user_id, datetime.now().strftime("%Y-%m-%d"), 0.0))

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            expense_id INTEGER PRIMARY KEY,
            user_id INTEGER,
            date TEXT,
            category TEXT,
            amount REAL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)
    default_categories = [
        "🏠 Housing", "💡 Electricity", "💧 Water", "🌐 Internet",
        "📱 Phone", "⛽ Gas", "📺 Cable", "🚗 Car", "🛡️ Insurance",
        "💳 Credit Cards", "🛒 Groceries", "🍽️ Dining Out",
        "🎬 Entertainment", "💰 Savings", "📉 Loan Payments", "📦 Etc",
    ]
    default_expenses = [(user_id, datetime.now().strftime("%Y-%m-%d"), category, 0.0) for category in default_categories]
    cursor.executemany("INSERT INTO expenses (user_id, date, category, amount) VALUES (?, ?, ?, ?)", default_expenses)


@app.route('/logout', methods=['POST'])
def logout():
    session.clear()  # Clears all data in session, effectively logging out the user
    flash('You have been logged out successfully.')
    return redirect(url_for('index'))
                    

@app.route('/set_income', methods=['POST'])
def set_income():
    user_id = session.get('user_id')
    if not user_id:
        flash('Please log in to continue.', 'error')
        return redirect(url_for('index'))

    try:
        income = float(request.form['income'])
        if income <= 0:
            raise ValueError("Income must be a positive number.")

        db = get_db()
        cursor = db.cursor()
        current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')  # Properly formatted to include time
        cursor.execute('''
            INSERT INTO income (user_id, date, amount) VALUES (?, ?, ?)
        ''', (user_id, current_date, income))
        db.commit()
        flash('Income updated successfully!', 'success')
    except ValueError as e:
        db.rollback()
        flash(str(e), 'error')
    except Exception as e:
        db.rollback()
        flash('Failed to update income due to a system error: ' + str(e), 'error')
    finally:
        db.close()

    return redirect(url_for('view_budget'))


@app.route('/get_income')
def get_income():
    try:
        db = get_db()
        cursor = db.cursor()
        # Execute a query to fetch the latest income from the database
        cursor.execute("SELECT amount FROM income ORDER BY date DESC LIMIT 1")
        latest_income = cursor.fetchone()
        if latest_income is not None:
            latest_income_amount = latest_income[0]  # Assuming the first column of the result is the amount
        else:
            # If there's no income data in the database, return a default value
            latest_income_amount = 0.0
    except Exception as e:
        # Handle any exceptions, such as database connection errors
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        db.close()

    # Return the latest income as JSON response
    return jsonify({'income': latest_income_amount})



@app.route('/generate_spreadsheet')
def generate_spreadsheet():
    try:
        user_id = session.get('user_id')
        if not user_id:
            flash('User not logged in.')
            return redirect(url_for('/'))

        db = get_db()
        cursor = db.cursor()

        # Retrieve expenses data from the database using the user ID
        cursor.execute('SELECT category, amount FROM expenses WHERE user_id = ?', (user_id,))
        expenses_data = cursor.fetchall()

        # Get the latest income for the user
        cursor.execute('SELECT amount FROM income WHERE user_id = ? ORDER BY date DESC LIMIT 1', (user_id,))
        income_data = cursor.fetchone()
        income = income_data['amount'] if income_data else 0

        # Calculate total expenses
        total_expenses = sum(expense['amount'] for expense in expenses_data)

        # Generate the CSV content
        csv_content = "Report Date,{}\n".format(datetime.now().strftime('%Y-%m-%d'))
        csv_content += "Income,{}\n".format(income)
        csv_content += "Total Expenses,{}\n".format(total_expenses)
        csv_content += "Category,Amount\n"
        for expense in expenses_data:
            csv_content += f"{expense['category']},{expense['amount']}\n"

        # Close the database connection
        cursor.close()
        db.close()

        # Send the generated CSV file as a response
        response = make_response(csv_content)
        response.headers['Content-Disposition'] = 'attachment; filename=spendingtracker.csv'
        response.mimetype = 'text/csv'
        return response
    except Exception as e:
        flash(f"Error generating spreadsheet: {str(e)}")
        return redirect(url_for('index'))
    
@app.route('/generate_report')
def generate_report():
    try:
        user_id = session.get('user_id')
        if not user_id:
            flash('User not logged in.')
            return redirect(url_for('/'))

        db = get_db()
        cursor = db.cursor()

        # Retrieve expenses data from the database using the user ID
        cursor.execute('SELECT category, amount FROM expenses WHERE user_id = ?', (user_id,))
        expenses_data = cursor.fetchall()

        # Get the latest income for the user
        cursor.execute('SELECT amount FROM income WHERE user_id = ? ORDER BY date DESC LIMIT 1', (user_id,))
        income_data = cursor.fetchone()
        income = income_data['amount'] if income_data else 0

        # Calculate total expenses
        total_expenses = sum(expense['amount'] for expense in expenses_data)

        # Generate the CSV content
        csv_content = "Report Date,{}\n".format(datetime.now().strftime('%Y-%m-%d'))
        csv_content += "Income,{}\n".format(income)
        csv_content += "Total Expenses,{}\n".format(total_expenses)
        csv_content += "Category,Amount\n"
        for expense in expenses_data:
            csv_content += f"{expense['category']},{expense['amount']}\n"

        # Close the database connection
        cursor.close()
        db.close()

        # Send the generated CSV file as a response
        response = make_response(csv_content)
        response.headers['Content-Disposition'] = 'attachment; filename=spendingtracker.csv'
        response.mimetype = 'text/csv'
        return response
    except Exception as e:
        flash(f"Error generating spreadsheet: {str(e)}")
        return redirect(url_for('index'))



@app.route('/budget_analysis')
def budget_analysis():
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in.')
        return redirect(url_for('index'))

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('SELECT amount FROM income WHERE user_id = ? ORDER BY date DESC LIMIT 1', (user_id,))
        income_result = cursor.fetchone()
        income = income_result['amount'] if income_result else 0

        cursor.execute('SELECT SUM(amount) AS total_expenses FROM expenses WHERE user_id = ?', (user_id,))
        expenses_row = cursor.fetchone()
        total_expenses = expenses_row['total_expenses'] if expenses_row else 0

        if not expenses_row:
            logging.error("No expenses data found for user: %s", user_id)
            flash("No expense data found.")
            return redirect(url_for('budget_analysis'))

        balance = income - total_expenses
        last_updated_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute('SELECT category, amount FROM expenses WHERE user_id = ? AND amount > 0 ORDER BY amount DESC', (user_id,))
        expenses = [{'category': row['category'], 'amount': row['amount']} for row in cursor.fetchall()]

        if expenses:
            highest_cat = expenses[0]  # The first item is the highest because of ORDER BY amount DESC
            lowest_cat = expenses[-1]  # The last item is the lowest
            amounts = [expense['amount'] for expense in expenses]
            highest = max(amounts) if amounts else 0
            lowest = min(amounts) if amounts else 0
            average = mean(amounts)
            std_dev = stdev(amounts) if len(amounts) > 1 else 0
            cv = (std_dev / average * 100) if average else 0
        else:
            highest_cat = lowest_cat = {'category': 'None', 'amount': 0}
            highest = lowest = 0
            average = std_dev = cv = 0

        if income > 0:
            expense_ratio = (total_expenses / income * 100) if income else 0
            grade = calculate_grade(expense_ratio)  # Assuming calculate_grade is a function defined elsewhere
        else:
            expense_ratio = 0
            grade = 'N/A'  # Adjust grade calculation or representation as necessary
        analysis = get_analysis(income, expenses, highest, total_expenses, average, std_dev, cv, expense_ratio)
        # print(analysis)

        max_expense = max(expense['amount'] for expense in expenses) if expenses else 1  # Avoid division by zero
        budget_data = {
            'income': income,
            'expenses': expenses,
            'balance': balance,
            'grade': grade,
            'highest_cat': highest_cat,
            'lowest_cat': lowest_cat,
            'highest': highest,
            'lowest': lowest,
            'average': average,
            'standard_deviation': std_dev,
            'expense_ratio': expense_ratio,
            'total_expenses': total_expenses
        }

    except Exception as e:
        logging.exception("Failed to fetch financial data: %s", e)
        flash(f"Error during analysis: {e}")
        return redirect(url_for('budget_analysis'))

    finally:
        cursor.close()
        db.close()

    return render_template('budget_analysis.html', last_updated_date=last_updated_date, budget=budget_data, expenses=expenses, analysis=analysis, max_expense=max_expense, user=user_id)


@app.route('/histogram')
def histogram():
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in.')
        return redirect(url_for('index'))

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('SELECT category, amount FROM expenses WHERE user_id = ?', (user_id,))
        expenses = cursor.fetchall()
        if not expenses:
            flash('No expenses found for the user.')
            return redirect(url_for('budget_analysis'))

        hist = Histogram(expenses)
        fig = hist.display_histogram()
        buf = io.BytesIO()
        fig.savefig(buf, format='png')
        plt.close(fig)
        buf.seek(0)
        return send_file(buf, mimetype='image/png', as_attachment=False)
    except Exception as e:
        flash(f"Error generating histogram: {str(e)}")
        return redirect(url_for('budget_analysis'))
    finally:
        cursor.close()
        db.close()

@app.route('/piechart')
def piechart():
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in.')
        return redirect(url_for('/'))

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('SELECT category, amount FROM expenses WHERE user_id = ?', (user_id,))
        expenses = cursor.fetchall()

        if not expenses:
            flash('No expenses found for the user.')
            return redirect(url_for('budget_analysis'))

        piechart = Piechart(expenses)
        fig = piechart.display_pie_chart()
        buf_pie = io.BytesIO()
        fig.savefig(buf_pie, format='png')
        plt.close(fig)
        buf_pie.seek(0)
        return send_file(buf_pie, mimetype='image/png')
    except Exception as e:
        flash(f"Error generating pie chart: {str(e)}")
        return redirect(url_for('budget_analysis'))
    finally:
        cursor.close()
        db.close()

        
def calculate_grade(ratio):
    if ratio < 90:
        return 'A'
    elif ratio < 100:
        return 'B'
    elif ratio == 100:
        return 'C'
    elif ratio <= 110:
        return 'D'
    else:
        return 'F'

@app.route('/manage_expenses', methods=['GET', 'POST'])
def manage_expenses():
    expense_form = ExpenseForm();
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in.')
        return redirect(url_for('index'))

    db = get_db()
    cursor = db.cursor()

    try:
        if request.method == 'POST':
            categories_post = request.form.getlist('categories[]')
            amounts_post = request.form.getlist('amounts[]')
            if not categories_post or not amounts_post:
                flash("No data to update.")
                return redirect(url_for('manage_expenses'))

            updated_data = []
            for category, amount in zip(categories_post, amounts_post):
                try:
                    amount = float(amount)
                    updated_data.append((amount, user_id, category))
                except ValueError:
                    flash(f"Invalid amount for category {category}. Please enter a valid number.", 'error')
                    continue

            if updated_data:
                cursor.executemany('''
                    UPDATE expenses SET amount = ?
                    WHERE user_id = ? AND category = ?
                ''', updated_data)
                db.commit()
                flash('Expenses updated successfully!')

        # Fetch existing expenses to display in the form
        cursor.execute('SELECT category, amount FROM expenses WHERE user_id = ?', (user_id,))
        categories_with_amounts = cursor.fetchall()
        total_expenses = sum(amount for _, amount in categories_with_amounts)  # Calculate total expenses
        last_updated_date = datetime.now().strftime('%B %d, %Y %I:%M %p')
        if not categories_with_amounts:
            flash("No expenses found. Add some expenses to manage them.", 'info')

    except Exception as e:
        db.rollback()
        flash(f"An error occurred while updating expenses: {e}", 'error')
    finally:
        cursor.close()
        db.close()

    return render_template('manage_expenses.html', categories=categories_with_amounts, total_expenses=total_expenses, last_updated_date=last_updated_date, user=user_id, expense_form=expense_form)


@app.route('/save_expenses', methods=['POST'])
def save_expenses():
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in. Please login to continue.', 'error')
        return redirect(url_for('/'))

    try:
        db = get_db()
        cursor = db.cursor()

        # Assuming you're sending categories and amounts as lists from the form
        categories = request.form.getlist('categories[]')
        amounts = request.form.getlist('amounts[]')

        if not categories or not amounts:
            flash('No expenses data provided.', 'error')
            return redirect(url_for('manage_expenses'))

        for category, amount in zip(categories, map(float, amounts)):
            cursor.execute('''
                INSERT INTO expenses (user_id, category, amount, date)
                VALUES (?, ?, ?, DATE('now'))
                ''', (user_id, category, amount))
        db.commit()
        update_budget(user_id)
        flash('Expenses saved successfully!', 'success')

    except sqlite3.IntegrityError:
        db.rollback()
        flash('Database error occurred. Try again.', 'error')
    except ValueError:
        db.rollback()
        flash('Invalid amount entered. Please enter a valid number.', 'error')
    finally:
        cursor.close()
    return redirect(url_for('budget_analysis'))

def update_budget(user_id):
    db = get_db()
    cursor = db.cursor()

    try:
        # Calculate total expenses
        cursor.execute('SELECT SUM(amount) AS total_expenses FROM expenses WHERE user_id = ?', (user_id,))
        total_expenses = cursor.fetchone()['total_expenses'] or 0

        # Fetch current income
        cursor.execute('SELECT amount FROM income WHERE user_id = ?', (user_id,))
        current_income = cursor.fetchone()['amount'] or 0

        # Calculate new budget or available income
        new_available_income = current_income - total_expenses

        # Update the income table or a budget table if exists
        cursor.execute('UPDATE income SET amount = ? WHERE user_id = ?', (new_available_income, user_id))
        db.commit()
        flash('Budget updated successfully!', 'success')
    except Exception as e:
        db.rollback()
        flash(f"An error occurred while recalculating the budget: {e}", 'error')
    finally:
        cursor.close()
        db.close()
        
def get_analysis(income, expenses, max_expense, total_expenses, avg_expense, std_deviation, cv, expense_ratio):
    logging.info("Starting analysis with provided data")

    analysis_message = []

    if not expenses:
        analysis_message.append("No recorded expenses to analyze.")
    elif income <= 0:
        analysis_message.append("No recorded income, making expense comparison impossible.")
    else:
        # Analyzing Expense Ratio and Providing Recommendations
        if expense_ratio > 110:
            analysis_message.extend([
                "Your expense ratio is above 110%, leading to a grade of F. Immediate action is required to prevent financial disaster:",
                "- **Crisis Budgeting:** Immediately cut all non-essential spending.",
                "- **Debt Crisis Management:** Seek professional help for managing and consolidating debts.",
                "- **Income Boost:** Explore every possibility to increase your income urgently."
            ])
        elif expense_ratio > 100:
            analysis_message.extend([
                "Your expense ratio is above 100%, resulting in a grade of D. Considerable improvements are needed:",
                "- **Budget Reevaluation:** Thoroughly review and cut back on non-essential expenses.",
                "- **High-Interest Debts:** Focus on paying down high-interest debts as a priority.",
                "- **Moderate Savings Plan:** Begin setting aside a small portion of income towards savings if possible."
            ])
        elif expense_ratio == 100:
            analysis_message.extend([
                "Your expense ratio is exactly 100%, earning a grade of C. It's manageable but not ideal:",
                "- **Expense Reduction:** Aim to reduce monthly expenses by seeking cheaper alternatives.",
                "- **Debt Management:** Pay more than the minimum on debts when possible.",
                "- **Improved Savings:** Increase savings gradually to strengthen financial security."
            ])
        elif expense_ratio >= 90:
            analysis_message.extend([
                "Your expense ratio is below 100% but above 90%, resulting in a grade of B. You can improve your financial situation:",
                "- **Negotiate Bills:** Look for ways to lower regular bills such as negotiating or switching providers.",
                "- **Side Gigs:** Consider part-time opportunities to supplement income.",
                "- **Budget Tracking:** Regularly track and review expenses for further optimization."
            ])
        else:  # Ratio < 90
            analysis_message.extend([
                "Your expense ratio is below 90%, earning a grade of A. Excellent financial health:",
                "- **Regular Reviews:** Periodically review your expenses to identify savings opportunities.",
                "- **Emergency Savings:** Aim to build an emergency fund covering at least 3 months of expenses.",
                "- **Invest Wisely:** Consider low-risk investments to grow your savings."
            ])

        # Handling Maximum Expenses
        if max_expense > 0.4 * income:
            analysis_message.append(
                f"Your largest expense accounts for over 40% of your income, which might risk financial stability. Consider whether this high expense is essential or if there are ways to reduce it."
            )

        # Insights on Variability and Financial Stability
        if cv > 50:
            analysis_message.append(
                "There's high variability in your expenses indicating unpredictable financial behavior, which can be risky. Aim to stabilize your expenses by planning and adhering to a strict budget."
            )
        if std_deviation > 0.5 * avg_expense:
            analysis_message.append(
                "Your expenses vary significantly from month to month. Identifying and managing large, irregular expenses can help stabilize your financial situation."
            )

        # Detailed Category Insights
        for expense in expenses:
            category, amount = expense['category'], expense['amount']
            percentage_of_total = (amount / total_expenses * 100) if total_expenses > 0 else 0
            percentage_of_income = (amount / income * 100) if income > 0 else 0

            if percentage_of_total > 15:
                analysis_message.append(
                    f"Consider reviewing {category} expenses, as they constitute a large portion of your budget ({percentage_of_total:.2f}%). There may be opportunities to reduce these costs."
                )
            if percentage_of_income > 10:
                analysis_message.append(
                    f"Alert: {category} expenses take up more than 10% of your income. Evaluating and possibly reducing these expenses can improve your financial health."
                )

    return analysis_message

@app.route('/income_scatter')
def income_scatter():
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in.')
        return redirect(url_for('index'))

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('SELECT date, amount FROM income WHERE user_id = ?', (user_id,))
        incomes = cursor.fetchall()

        if not incomes:
            flash('No income data found for the user.')
            return redirect(url_for('view_budget'))

        scatter_plot = ScatterPlot()
        for date, amount in incomes:
            scatter_plot.add_data_point(date, amount)

        buf_scat = io.BytesIO()
        fig = scatter_plot.plot()
        if fig is None:
            flash("Unable to generate plot due to data or plotting errors.")
            return redirect(url_for('view_budget'))

        fig.savefig(buf_scat, format='png', bbox_inches='tight')
        plt.close(fig)
        buf_scat.seek(0)
        return send_file(buf_scat, mimetype='image/png')
    except Exception as e:
        flash(f"Error generating income scatter plot: {str(e)}")
        return redirect(url_for('view_budget'))
    finally:
        cursor.close()
        db.close()


@app.route('/expenses_line_chart')
def expenses_line_chart():
    user_id = session.get('user_id')
    if not user_id:
        flash('User not logged in.')
        return redirect(url_for('index'))

    db = get_db()
    cursor = db.cursor()
    try:
        cursor.execute('SELECT date, category, amount FROM expenses WHERE user_id = ?', (user_id,))
        expenses = cursor.fetchall()

        if not expenses:
            flash('No expenses found for the user.')
            return redirect(url_for('budget_analysis'))

        line_chart = LineChart()
        for date, category, amount in expenses:
            line_chart.add_expense(date, category, amount)

        fig = line_chart.plot()

        buf_line = io.BytesIO()
        fig.savefig(buf_line, format='png', bbox_inches='tight')
        buf_line.seek(0)
        return send_file(buf_line, mimetype='image/png')
    except Exception as e:
        flash(f"Error generating expense line chart: {str(e)}")
        return redirect(url_for('budget_analysis'))
    finally:
        cursor.close()
        db.close()

 
if __name__ == '__main__':
     app.run(host='0.0.0.0', port=5000)