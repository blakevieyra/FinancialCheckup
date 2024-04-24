# Financial Checkup Project - Created By Blake Vieyra

This Flask application is designed to help users manage and analyze their personal finances, providing tools for tracking income, expenses, and generating visual financial analyses.
Project structure ensures that the application is robust, scalable, and secure, facilitating easy maintenance and scalability.

## Features

- **User Authentication**: Secure login and registration system for managing user-specific data.
- **Income and Expense Tracking**: Users can record and view their income and expenses over time.
- **Data Visualization**: Graphical representation of financial data through histograms, pie charts, and line charts.
- **Budget Reporting**: Generate detailed reports and spreadsheets of financial activities.
- **Dynamic Budget Analysis**: Provides an analysis of financial health, expense ratios, and savings opportunities.

## API Endpoints

Below are the key API endpoints included in this application:

- `POST /register`: Register a new user.
- `POST /login`: Authenticate a user.
- `POST /logout`: Log out a user.
- `GET /view_budget`: Displays the budget overview for the logged-in user.
- `POST /set_income`: Update or set the user's income.
- `GET /get_income`: Retrieve the latest recorded income.
- `GET /generate_spreadsheet`: Download a CSV file with detailed expense reports.
- `GET /generate_report`: Generate a financial report in CSV format.
- `GET /budget_analysis`: Perform and display a budget analysis.
- `GET /histogram`: Generate and display a histogram of expenses.
- `GET /piechart`: Show a pie chart of expenses.
- `GET /expenses_line_chart`: Display a line chart of expenses over time.
- `POST /save_expenses`: Record new expenses.

## Technologies Used

- **Python**: The primary programming language used for building the application. Python's extensive ecosystem of libraries makes it ideal for both web development and data processing.
- **Flask**: A lightweight WSGI web application framework. It is designed to make getting started quick and easy, with the ability to scale up to complex applications.
- **SQLite**: Embedded SQL database engine that requires zero configuration and stores all data in a single disk file. Used for storing user data, income, and expenses.
- **Matplotlib**: A plotting library for the Python programming language and its numerical mathematics extension NumPy. Used for generating a variety of static, interactive, and animated visualizations.
- **bcrypt**: Library to help hash passwords. Used for securing user passwords before storing them in the database.
- **Heroku**: Cloud platform service that enables developers to build, run, and operate applications entirely in the cloud.
  
### Libraries and Tools
- **Flask-WTF**: Provides simple integration with WTForms for handling form data and validation.
- **Flask-Login**: Used for managing user sessions.
- **Jinja2**: Templating engine for rendering views.
  
### Database Design

The database schema for this application is designed to efficiently handle user data financial transactions.

## Deployment

The application is deployed on Heroku and can be accessed at [Budget Analysis Live]([https://your-heroku-app-link.com](https://financialcheckup-9beed77add2e.herokuapp.com/)).

## Local Setup

To run this project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourgithubusername/budget-analysis-project.git
2. Navigate to the project directory:
   ```cd budget-analysis-project
3. Install dependencies:
  ```pip install -r requirements.txt
4. Set environment variables for FLASK_SECRET_KEY and WTF_CSRF_SECRET_KEY:
5. Start the server:
  ```flask run


# Contributions
Contributions are welcome! Please fork the repository and submit a pull request with your proposed changes.
   
