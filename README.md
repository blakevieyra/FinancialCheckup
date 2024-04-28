# Financial Checkup by Blake Vieyra

This Flask Full Stack application is designed to help users manage and analyze their personal finances, providing tools for tracking income, expenses, and generating visual financial analyses.
Project structure ensures that the application is robust, scalable, and secure, facilitating easy maintenance and scalability.

![Screen Shot 2024-04-28 at 1 15 54 AM](https://github.com/blakevieyra/FinancialCheckup/assets/88246090/c29a552c-ca2f-4967-8853-0d53bddff767)
![image](https://github.com/blakevieyra/FinancialCheckup/assets/88246090/c748de2f-2f49-40fd-8ee3-83a31f137d94)

## Deployment
The application is deployed on Heroku and can be accessed at https://financialcheckup-9beed77add2e.herokuapp.com/.


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

This project leverages a range of technologies for web development, secure data handling, and user interface design:

- **Python**: The primary programming language used, known for its readability and broad ecosystem of libraries.
- **Flask**: A lightweight WSGI web application framework used for building the core application.
- **Django**: Utilized for complex data-driven operations, used alongside Flask.
- **JavaScript**: Employs interactive elements on the web application's frontend.
- **jQuery**: A JavaScript library that simplifies HTML DOM tree traversal and manipulation, event handling, and animation.
- **SQLite**: An embedded SQL database engine used for storing all user data and transactions.
- **NumPy**: Critical for processing large, multi-dimensional arrays and matrices, enhancing numerical computations.
- **Matplotlib**: A plotting library used for creating a variety of static, interactive, and animated visualizations in Python.
- **bcrypt**: Helps hash passwords, enhancing the security for user authentication.
- **Heroku**: Cloud platform service for deploying and managing the application.

### Security and Communication

- **HTTPS (Hypertext Transfer Protocol Secure)**: Ensures secure communication over the network through encryption. This application enforces HTTPS to protect data integrity and privacy between the user's browser and the server, crucial for preventing eavesdropping and tampering with the transmitted data.
- **Flask-WTF**: Provides CSRF protection and integrates with WTForms for secure form handling and validation.

### Additional Libraries and Tools

- **Flask-Login**: Manages user sessions, making it easier to handle logins, logouts, and session management.
- **Jinja2**: A templating engine for Python, utilized within Flask to render views, providing a clean separation between the backend logic and the frontend presentation.

The combination of these technologies ensures that the application is robust, secure, and capable of supporting complex data processing and dynamic web functionality.

### Database Design

The database schema for this application is designed to efficiently handle user data financial transactions.


## Local Setup

To run this project locally, follow these steps:

1. Clone the repository:
    ```
   git clone https://github.com/yourgithubusername/budget-analysis-project.git
2. Navigate to the project directory:
   ```
   cd budget-analysis-project
3. Install dependencies:
  ```
  pip install -r requirements.txt
4. Set environment variables for FLASK_SECRET_KEY and WTF_CSRF_SECRET_KEY

5. Start the server:
  ```flask run
  


# Contributions
Contributions are welcome! Please fork the repository and submit a pull request with your proposed changes.
   
