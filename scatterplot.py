import matplotlib.pyplot as plt
from datetime import datetime
import matplotlib.dates as mdates
from scipy.stats import linregress
import numpy as np

class ScatterPlot:
    def __init__(self):
        self.data = []

    def add_data_point(self, date_str, value):
        """Adds a data point to the dataset."""
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
            value = float(value)
            self.data.append((date, value))
        except ValueError as e:
            print(f"Error adding data point: {e}")

    def plot(self):
        if not self.data:
            print("No data to plot.")
            return None

        self.data.sort(key=lambda x: x[0])
        fig, ax = plt.subplots(figsize=(10, 5))
        dates = [date for date, _ in self.data]
        values = [value for _, value in self.data]

        ax.scatter(dates, values, color='blue', marker='o', label='Data Points')
        ax.xaxis.set_major_locator(mdates.MonthLocator())
        ax.xaxis.set_minor_locator(mdates.DayLocator())
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
        fig.autofmt_xdate(rotation=45)

        for date, value in self.data:
            ax.annotate(f"${value:.2f}", (date, value), textcoords="offset points", xytext=(0,10), ha='center')

        regression_summary = self.analyze_regression(dates, values, ax)

        # Set the title with a space for the description underneath
        ax.set_xlabel('Date Entered')
        ax.set_ylabel('Monthly Income ($)')

        # Adding a description of regression analysis right under the title
        title_text = 'Monthly Income Over Time with Regression'
        description_text = regression_summary
        fig.text(0.5, 0.95, title_text, ha='center', fontsize=14, fontweight='bold')
        fig.text(0.5, 0.92, description_text, ha='center', fontsize=10, color='red')

        ax.legend()
        ax.grid(True)

        return fig

    def analyze_regression(self, dates, values, ax):
        """Performs linear regression and provides a concise analysis based on regression cutoffs."""
        if len(dates) > 1:
            x_values = mdates.date2num(dates)
            slope, intercept, r_value, p_value, std_err = linregress(x_values, values)
            y_values = slope * x_values + intercept
            ax.plot(dates, y_values, 'r--', label=f'Linear Regression (r={r_value:.2f})')
            if abs(slope) > 50:  # Assuming 50 is a significant slope cutoff
                trend = 'increasing' if slope > 0 else 'decreasing'
                return f"Significant {trend} trend in income (slope: {slope:.2f}) over time."
            else:
                return "No significant trend in income detected."
        return "Insufficient data for regression analysis."
