import io
import matplotlib.pyplot as plt
from flask import session, flash, redirect, url_for, send_file
plt.rcParams['font.family'] = 'DejaVu Sans'  # This font is known to support a wide range of Unicode glyphs

class Piechart:
    def __init__(self, expenses):
        # Filter out any expenses that are zero or negative
        self.expenses = [exp for exp in expenses if exp['amount'] > 0]

    def display_pie_chart(self):
        if not self.expenses:
            print("No valid expenses available to display a pie chart.")
            return None

        labels = [f"{expense['category']} - ${expense['amount']}" for expense in self.expenses]
        sizes = [expense['amount'] for expense in self.expenses]
        total_expenses = sum(sizes)

        # Assign colors for each pie slice
        colors = ['gold', 'yellowgreen', 'lightcoral', 'lightskyblue', 'lavender']
        # Explode the first slice for emphasis
        explode = (0.1,) + (0,) * (len(labels) - 1)  # only "explode" the first slice

        plt.figure(figsize=(8, 6))
        plt.pie(sizes, explode=explode, labels=labels, colors=colors,
                autopct='%1.1f%%', startangle=140, shadow=True, pctdistance=0.85)
        centre_circle = plt.Circle((0, 0), 0.70, fc='white')  # Add a white circle in the middle
        fig = plt.gcf()
        fig.gca().add_artist(centre_circle)
        plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle.
        plt.title(f'My Monthly Budget - Total Expenses: ${total_expenses:.2f}')
        plt.tight_layout()

        return fig  # Return the figure object to be used elsewhere (e.g., saving to a file)

