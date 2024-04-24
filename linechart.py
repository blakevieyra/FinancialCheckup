import matplotlib.pyplot as plt
from datetime import datetime
import matplotlib.dates as mdates
import io
from flask import send_file
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS']
import warnings

# Ignore UserWarnings
warnings.filterwarnings("ignore", category=UserWarning)
class LineChart:
    def __init__(self):
        self.data = {}  # Dictionary to store expenses for each category
        self.dates = []

    def add_expense(self, date_str, category, amount):
        try:
            # Try parsing the full datetime string
            date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            # Fallback to just date (midnight by default)
            date = datetime.strptime(date_str, '%Y-%m-%d')

        if amount > 0:
            if category not in self.data:
                self.data[category] = {'dates': [], 'expenses': []}
            self.data[category]['dates'].append(date)
            self.data[category]['expenses'].append(amount)

            # Update self.dates with unique dates across all categories
            self.dates = list(set(self.dates + self.data[category]['dates']))

    def plot(self):
        """Generates and returns the line chart of expenses over time."""
        plt.rcParams['font.family'] = 'Arial'  # Changing the font to Arial
        fig, ax = plt.subplots(figsize=(10, 5))

        # Plot each expense category
        for category, values in self.data.items():
            dates = values['dates']
            expenses = values['expenses']
            ax.plot(dates, expenses, marker='o', linestyle='-', label=f'{category} Expenses')

        # Update self.dates with unique dates across all categories and sort
        self.dates = sorted(set(date for category_data in self.data.values() for date in category_data['dates']))

        # Compute total expenses based on sorted dates
        total_expenses = [sum(category_data['expenses'][category_data['dates'].index(date)] 
                            if date in category_data['dates'] else 0 
                            for category_data in self.data.values()) 
                        for date in self.dates]

        # Plot total expenses over time
        ax.plot(self.dates, total_expenses, color='black', linestyle='--', label='Total Expenses')

        # Dynamically adjust y-axis limits based on expenses greater than zero
        all_expenses = [expense for category_expenses in self.data.values() for expense in category_expenses['expenses']]
        positive_expenses = [expense for expense in all_expenses if expense > 0]
        if positive_expenses:
            min_expense = min(positive_expenses)
            max_expense = max(positive_expenses)
            y_margin = 0.1 * (max_expense - min_expense)  # 10% margin
            ax.set_ylim(min_expense - y_margin, max_expense + y_margin)

        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        ax.set_title('Expense Tracking Over Time')
        ax.set_xlabel('Date')
        ax.set_ylabel('Expense Amount ($)')
        ax.grid(True)
        ax.legend()
        plt.xticks(rotation=45)
        plt.tight_layout()
        return fig