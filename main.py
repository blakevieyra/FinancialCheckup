import expenses as exp
import budget as bud
import piechart as pch
import histogram as his
import csv
from datetime import datetime
import numpy as np
import sys

class Main:
    def __init__(self, name="Default User", income=0):
        self.name = name
        self.income = income
        self.bill_account = exp.Expenses(self.income)

    # Changed to handle setting income via web
    def set_income(self, income):
        try:
            self.income = float(income)
            if self.income < 0:
                raise ValueError("Income must be a positive number.")
            # Reinitialize the expenses with new income
            self.bill_account = exp.Expenses(self.income)
        except ValueError:
            raise  # You might want to handle this differently depending on your Flask setup

    # Adapted to be called from a web form
    def add_expense(self, category, amount):
        self.bill_account.add_bill(category, amount)

    def get_expenses(self):
        return self.bill_account.get_bills()

    def total_expenses(self):
        return self.bill_account.get_total_expenses()

    def get_budget_summary(self):
        return {
            'income': self.income,
            'total_expenses': self.total_expenses(),
            'remaining_balance': self.income - self.total_expenses()
        }

    # Generates the CSV file without printing
    def write_to_csv(self, filename='spendingtracker.csv'):
        with open(filename, mode='w', newline='') as file:
            writer = csv.writer(file)
            writer.writerow(['Expense Category', 'Amount'])
            for category, amount in self.bill_account.get_bills().items():
                writer.writerow([category, amount])
            total_expenses = self.total_expenses()
            remainder = self.income - total_expenses
            current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            writer.writerow(['Total Expenses', 'Income', 'Remaining Balance', 'Date'])
            writer.writerow([total_expenses, self.income, remainder, current_date])

    # Statistical analysis function for use with Flask
    def run_statistics(self):
        bills = self.get_expenses()
        if not bills:
            return ["No expense data available."]
        expense_values = list(bills.values())
        expense_categories = list(bills.keys())
        max_expense = max(expense_values) if expense_values else 0
        min_expense = min(expense_values) if expense_values else 0
        max_category = expense_categories[expense_values.index(max_expense)] if max_expense > 0 else "None"
        min_category = expense_categories[expense_values.index(min_expense)] if min_expense > 0 else "None"
        avg_expense = np.mean(expense_values) if expense_values else 0
        std_deviation = np.std(expense_values) if expense_values else 0
        cv = (std_deviation / avg_expense * 100) if avg_expense else 0
        analysis = self.budget_analysis(max_expense, avg_expense, std_deviation, cv)
        return [
            f"Max Expense: ${max_expense} - {max_category}",
            f"Min Expense: ${min_expense} - {min_category}",
            f"Avg Expense: ${avg_expense:.2f}",
            f"Standard Deviation: {std_deviation:.2f}",
            f"Coefficient of Variation: {cv:.2f}%",
            analysis
        ]
        
    def get_categories(self):
      # Assuming expenses are stored in a dict format {category: amount}
      return list(set(self.bill_account.get_bills().keys()))
  
    def budget_analysis(self, max_expense, avg_expense, std_deviation, cv):
        analysis_message = []
        if self.income <= 0:
            return "Income is zero or not set, unable to compare expenses to income."
        
        if cv > 50:
            analysis_message.append("High variability in expenses. Consider stabilizing spending.")
        else:
            analysis_message.append("Expenses are relatively stable. Keep tracking to maintain budget health.")

        if std_deviation > 0.5 * avg_expense:
            analysis_message.append("Your expenses show significant month-to-month variation.")
        else:
            analysis_message.append("Your month-to-month expenses are fairly consistent.")

        if max_expense > 2 * avg_expense:
            analysis_message.append("Your highest expense is significantly higher than your average expenses. Review if such high expenses are necessary or can be reduced.")
        else:
            analysis_message.append("Your highest expense is within a normal range compared to your average expenses.")

        if max_expense > 0.4 * self.income:
            analysis_message.append("Warning: Your highest single expense constitutes a large portion of your income. Ensure this is sustainable.")

        total_expenses = self.total_expenses()
        for category, amount in self.get_expenses().items():
            percentage_of_total = (amount / total_expenses) * 100
            percentage_of_income = (amount / self.income) * 100
            if percentage_of_total > 15:
                analysis_message.append(f"Consider reducing {category}, which accounts for {percentage_of_total:.2f}% of your total expenses.")
            if percentage_of_income > 10:
                analysis_message.append(f"Alert: {category} expenses take up more than 10% of your income. Consider budget adjustments.")

        return " ".join(analysis_message)

